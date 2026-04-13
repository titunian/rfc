import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "url";
import path from "path";

const host = process.env.TAURI_DEV_HOST;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(async () => ({
  plugins: [react()],
  clearScreen: false,
  resolve: {
    alias: {
      // Pull @orfc/api from a browser-safe TS entry so Vite bundles it as ESM
      // and skips the Node-only config module. The dist/index.js is CJS and
      // is only consumed by the Node CLI.
      "@orfc/api": path.resolve(__dirname, "../../packages/api/src/browser.ts"),
    },
  },
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host
      ? {
          protocol: "ws",
          host,
          port: 1421,
        }
      : undefined,
    // Dev-only: proxy /api/* to orfc.dev so fetches are same-origin during
    // local development. In production builds the webview makes direct
    // cross-origin requests to orfc.dev (CORS headers added via middleware).
    proxy: {
      "/api": {
        target: "https://www.orfc.dev",
        changeOrigin: true,
        secure: true,
      },
      "/anthropic": {
        target: "https://api.anthropic.com",
        changeOrigin: true,
        secure: true,
        rewrite: (p: string) => p.replace(/^\/anthropic/, ""),
      },
    },
    watch: {
      ignored: ["**/src-tauri/**"],
    },
  },
}));
