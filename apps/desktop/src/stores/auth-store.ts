import { create } from "zustand";
import { ApiClient } from "@orfc/api";
import {
  loadOrfcConfig,
  saveOrfcConfig,
  clearOrfcCredentials,
  type OrfcConfig,
} from "../lib/orfc-config";

type AuthStatus = "idle" | "loading" | "signing-in" | "signed-in" | "error";

interface AuthState {
  apiUrl: string;
  apiKey: string | null;
  email: string | null;
  status: AuthStatus;
  error: string | null;

  client: ApiClient | null;

  hydrate: () => Promise<void>;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  setApiUrl: (url: string) => Promise<void>;
}

function buildClient(config: OrfcConfig): ApiClient {
  // In dev the webview loads http://localhost:1420 and Vite proxies /api/*
  // to the real orfc.dev. Using an empty base means the client hits the
  // local webview origin, which the proxy rewrites upstream.
  const isDev = typeof window !== "undefined" && window.location.hostname === "localhost";
  const base = isDev ? "" : config.apiUrl;
  return new ApiClient({ apiUrl: base, apiKey: config.apiKey });
}

export const useAuthStore = create<AuthState>((set) => ({
  apiUrl: "https://www.orfc.dev",
  apiKey: null,
  email: null,
  status: "idle",
  error: null,
  client: null,

  hydrate: async () => {
    set({ status: "loading", error: null });
    try {
      const config = await loadOrfcConfig();
      const client = buildClient(config);
      set({
        apiUrl: config.apiUrl,
        apiKey: config.apiKey ?? null,
        email: config.email ?? null,
        client,
        status: config.apiKey ? "signed-in" : "idle",
        error: null,
      });
    } catch (e) {
      set({
        status: "error",
        error: e instanceof Error ? e.message : String(e),
      });
    }
  },

  signIn: async () => {
    // In-app sign-in flow is temporarily disabled while we chase a Tauri
    // tokio/http plugin conflict. For now the app reads the shared
    // ~/.orfc/config.json created by the CLI (`orfc login`), so the user
    // can authenticate from the terminal and the desktop picks it up.
    set({
      status: "error",
      error:
        "Sign in from the terminal with 'orfc login' — the desktop app shares the same ~/.orfc/config.json.",
    });
    throw new Error("In-app sign-in temporarily disabled");
  },

  signOut: async () => {
    const next = await clearOrfcCredentials();
    set({
      apiUrl: next.apiUrl,
      apiKey: null,
      email: null,
      client: buildClient(next),
      status: "idle",
      error: null,
    });
  },

  setApiUrl: async (url) => {
    const current = await loadOrfcConfig();
    const next = { ...current, apiUrl: url };
    await saveOrfcConfig(next);
    set({
      apiUrl: url,
      client: buildClient(next),
    });
  },
}));
