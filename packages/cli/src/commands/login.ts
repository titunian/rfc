import * as http from "http";
import * as crypto from "crypto";
import { loadConfig, saveConfig, getConfigDir } from "../lib/config";

interface CallbackResult {
  key: string;
  email: string;
}

function startCallbackServer(expectedState: string): Promise<{
  port: number;
  server: http.Server;
  waitForCallback: (timeoutMs: number) => Promise<CallbackResult>;
}> {
  return new Promise((resolveSetup, rejectSetup) => {
    let resolveCallback: (result: CallbackResult) => void;
    let rejectCallback: (err: Error) => void;

    const callbackPromise = new Promise<CallbackResult>((res, rej) => {
      resolveCallback = res;
      rejectCallback = rej;
    });

    // Suppress unused var warnings — they're assigned in the Promise constructor above
    void rejectCallback!;

    const server = http.createServer((req, res) => {
      // CORS preflight — browser at web domain POSTing to localhost
      if (req.method === "OPTIONS") {
        res.writeHead(200, {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
          "Access-Control-Max-Age": "86400",
        });
        res.end();
        return;
      }

      if (req.method === "POST" && req.url === "/callback") {
        let body = "";
        req.on("data", (chunk: Buffer) => (body += chunk.toString()));
        req.on("end", () => {
          try {
            const data = JSON.parse(body);

            if (data.state !== expectedState) {
              res.writeHead(403, {
                "Access-Control-Allow-Origin": "*",
                "Content-Type": "application/json",
              });
              res.end(JSON.stringify({ error: "Invalid state" }));
              return;
            }

            if (!data.key || !data.email) {
              res.writeHead(400, {
                "Access-Control-Allow-Origin": "*",
                "Content-Type": "application/json",
              });
              res.end(JSON.stringify({ error: "Missing key or email" }));
              return;
            }

            res.writeHead(200, {
              "Access-Control-Allow-Origin": "*",
              "Content-Type": "application/json",
            });
            res.end(JSON.stringify({ ok: true }));
            resolveCallback({ key: data.key, email: data.email });
          } catch {
            res.writeHead(400, {
              "Access-Control-Allow-Origin": "*",
              "Content-Type": "application/json",
            });
            res.end(JSON.stringify({ error: "Invalid request" }));
          }
        });
        return;
      }

      res.writeHead(404);
      res.end();
    });

    server.listen(0, "127.0.0.1", () => {
      const addr = server.address();
      if (!addr || typeof addr === "string") {
        rejectSetup(new Error("Failed to start callback server"));
        return;
      }
      resolveSetup({
        port: addr.port,
        server,
        waitForCallback: (timeoutMs: number) => {
          return Promise.race([
            callbackPromise,
            new Promise<never>((_, reject) =>
              setTimeout(
                () => reject(new Error("Login timed out. Please try again.")),
                timeoutMs
              )
            ),
          ]);
        },
      });
    });

    server.on("error", (err) => {
      rejectSetup(err);
    });
  });
}

export async function loginCommand() {
  const config = loadConfig();
  const apiUrl = config.apiUrl;

  console.log(`\n  Logging in to ${apiUrl}...`);

  // Generate CSRF state nonce
  const state = crypto.randomBytes(16).toString("hex");

  // Start temporary localhost callback server
  const { port, server, waitForCallback } = await startCallbackServer(state);

  const authUrl = `${apiUrl}/auth/cli?port=${port}&state=${state}`;
  console.log("  Opening browser...");

  try {
    const open = (await import("open")).default;
    await open(authUrl);
  } catch {
    console.log(`\n  Open this URL in your browser:\n  ${authUrl}\n`);
  }

  console.log("  Waiting for authentication...\n");

  try {
    const result = await waitForCallback(120_000);

    config.apiKey = result.key;
    config.email = result.email;
    saveConfig(config);

    console.log(`  ✓ Logged in as ${result.email}`);
    console.log(`  ✓ API key saved to ${getConfigDir()}/config.json\n`);
    server.close(() => process.exit(0));
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`\n  ✗ ${message}\n`);
    server.close(() => process.exit(1));
  }
}
