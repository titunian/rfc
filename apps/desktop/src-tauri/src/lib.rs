use serde::Serialize;
use std::io::{Read, Write};
use std::net::TcpListener;
use std::sync::mpsc;
use std::time::Duration;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct LoginResult {
    api_key: String,
    email: String,
}

/// In-app OAuth login flow.
///
/// 1. Bind a localhost TCP listener on a random port.
/// 2. Open the browser to the auth page (which will POST back to us).
/// 3. In a background std::thread, accept one connection, handle the
///    CORS preflight and the POST /callback, parse the JSON body, validate
///    the state nonce, and send the result through an mpsc channel.
/// 4. Wait on the channel with a 120 s timeout (via spawn_blocking so we
///    don't block the Tauri async runtime).
#[tauri::command]
async fn login_flow(app: tauri::AppHandle, api_url: String) -> Result<LoginResult, String> {
    // Bind on a random port
    let listener =
        TcpListener::bind("127.0.0.1:0").map_err(|e| format!("Failed to bind listener: {e}"))?;
    let port = listener
        .local_addr()
        .map_err(|e| format!("Failed to get local addr: {e}"))?
        .port();

    // Generate a random state nonce (32 hex chars)
    let state = {
        let mut buf = [0u8; 16];
        getrandom::getrandom(&mut buf).map_err(|e| format!("Failed to generate nonce: {e}"))?;
        hex::encode(buf)
    };

    let auth_url = format!("{api_url}/auth/cli?port={port}&state={state}");

    // Open browser
    use tauri_plugin_shell::ShellExt;
    app.shell()
        .open(&auth_url, None)
        .map_err(|e| format!("Failed to open browser: {e}"))?;

    // Channel to send the result from the TCP thread
    let (tx, rx) = mpsc::channel::<Result<LoginResult, String>>();
    let expected_state = state.clone();

    // Spawn a std::thread (NOT tokio) to handle the TCP connection
    std::thread::spawn(move || {
        // Set a timeout on the listener so we don't block forever
        let _ = listener.set_nonblocking(false);

        // We need to handle potentially two requests: an OPTIONS preflight
        // then the actual POST. Loop up to 5 times to be safe.
        let mut result: Option<Result<LoginResult, String>> = None;

        for _ in 0..10 {
            let (mut stream, _addr) = match listener.accept() {
                Ok(conn) => conn,
                Err(_) => break,
            };

            // Read the request
            let _ = stream.set_read_timeout(Some(Duration::from_secs(30)));
            let mut buf = [0u8; 8192];
            let n = match stream.read(&mut buf) {
                Ok(n) => n,
                Err(_) => continue,
            };
            let request = String::from_utf8_lossy(&buf[..n]);

            // Parse the request line
            let first_line = request.lines().next().unwrap_or("");

            if first_line.starts_with("OPTIONS") {
                // CORS preflight response
                let response = "HTTP/1.1 200 OK\r\n\
                    Access-Control-Allow-Origin: *\r\n\
                    Access-Control-Allow-Methods: POST, OPTIONS\r\n\
                    Access-Control-Allow-Headers: Content-Type\r\n\
                    Access-Control-Max-Age: 86400\r\n\
                    Content-Length: 0\r\n\
                    \r\n";
                let _ = stream.write_all(response.as_bytes());
                let _ = stream.flush();
                continue;
            }

            if first_line.starts_with("POST") && first_line.contains("/callback") {
                // Find Content-Length header
                let content_length: usize = request
                    .lines()
                    .find_map(|line| {
                        let lower = line.to_lowercase();
                        if lower.starts_with("content-length:") {
                            lower.trim_start_matches("content-length:").trim().parse().ok()
                        } else {
                            None
                        }
                    })
                    .unwrap_or(0);

                // Find the body (after \r\n\r\n)
                let body = if let Some(idx) = request.find("\r\n\r\n") {
                    let body_start = idx + 4;
                    let already_read = request.len() - body_start;

                    if already_read >= content_length {
                        // We already have the full body
                        request[body_start..body_start + content_length].to_string()
                    } else {
                        // Need to read more bytes
                        let mut body_buf =
                            request[body_start..].as_bytes().to_vec();
                        let remaining = content_length - already_read;
                        let mut extra = vec![0u8; remaining];
                        match stream.read_exact(&mut extra) {
                            Ok(_) => {
                                body_buf.extend_from_slice(&extra);
                                String::from_utf8_lossy(&body_buf).to_string()
                            }
                            Err(e) => {
                                let _ = send_json_response(
                                    &mut stream,
                                    400,
                                    r#"{"error":"Failed to read body"}"#,
                                );
                                result = Some(Err(format!("Failed to read request body: {e}")));
                                break;
                            }
                        }
                    }
                } else {
                    String::new()
                };

                // Parse JSON body
                let parsed: serde_json::Value = match serde_json::from_str(&body) {
                    Ok(v) => v,
                    Err(_) => {
                        let _ = send_json_response(
                            &mut stream,
                            400,
                            r#"{"error":"Invalid JSON"}"#,
                        );
                        continue;
                    }
                };

                // Validate state
                let recv_state = parsed.get("state").and_then(|v| v.as_str()).unwrap_or("");
                if recv_state != expected_state {
                    let _ = send_json_response(
                        &mut stream,
                        403,
                        r#"{"error":"Invalid state"}"#,
                    );
                    continue;
                }

                let key = parsed
                    .get("key")
                    .and_then(|v| v.as_str())
                    .unwrap_or("")
                    .to_string();
                let email = parsed
                    .get("email")
                    .and_then(|v| v.as_str())
                    .unwrap_or("")
                    .to_string();

                if key.is_empty() || email.is_empty() {
                    let _ = send_json_response(
                        &mut stream,
                        400,
                        r#"{"error":"Missing key or email"}"#,
                    );
                    continue;
                }

                let _ = send_json_response(&mut stream, 200, r#"{"ok":true}"#);
                result = Some(Ok(LoginResult {
                    api_key: key,
                    email,
                }));
                break;
            }

            // Unknown request — 404
            let response = "HTTP/1.1 404 Not Found\r\nContent-Length: 0\r\n\r\n";
            let _ = stream.write_all(response.as_bytes());
            let _ = stream.flush();
        }

        let _ = tx.send(result.unwrap_or(Err("Login flow ended without result".into())));
    });

    // Wait for the result with a 120 s timeout, using spawn_blocking so we
    // don't stall the Tauri async event loop.
    tauri::async_runtime::spawn_blocking(move || {
        rx.recv_timeout(Duration::from_secs(120))
            .map_err(|_| "Login timed out after 120 seconds. Please try again.".to_string())?
    })
    .await
    .map_err(|e| format!("Task join error: {e}"))?
}

fn send_json_response(
    stream: &mut std::net::TcpStream,
    status: u16,
    body: &str,
) -> std::io::Result<()> {
    let status_text = match status {
        200 => "OK",
        400 => "Bad Request",
        403 => "Forbidden",
        _ => "Error",
    };
    let response = format!(
        "HTTP/1.1 {status} {status_text}\r\n\
         Access-Control-Allow-Origin: *\r\n\
         Content-Type: application/json\r\n\
         Content-Length: {len}\r\n\
         \r\n\
         {body}",
        len = body.len()
    );
    stream.write_all(response.as_bytes())?;
    stream.flush()
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![login_flow])
        .setup(|app| {
            use tauri::Manager;
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.show();
                let _ = window.set_focus();
            }
            Ok(())
        })
        // Forward OS file-open events (Finder double-click, "Open With orfc",
        // dropping a file on the dock icon, etc.) to the JS layer.
        .on_window_event(|_window, _event| {})
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(|app_handle, event| {
            #[cfg(target_os = "macos")]
            if let tauri::RunEvent::Opened { urls } = &event {
                use tauri::{Emitter, Manager};
                let paths: Vec<String> = urls
                    .iter()
                    .filter_map(|u| {
                        if u.scheme() == "file" {
                            u.to_file_path().ok().and_then(|p| p.to_str().map(String::from))
                        } else {
                            None
                        }
                    })
                    .collect();
                if !paths.is_empty() {
                    if let Some(window) = app_handle.get_webview_window("main") {
                        let _ = window.show();
                        let _ = window.set_focus();
                        let _ = window.emit("orfc:open-files", paths);
                    }
                }
            }
            #[cfg(not(target_os = "macos"))]
            let _ = (app_handle, event);
        });
}
