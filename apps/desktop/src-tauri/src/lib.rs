#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
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
