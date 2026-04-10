import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";
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
  // In dev the Vite proxy rewrites /api/* to orfc.dev — use empty base so
  // fetches stay same-origin. In production builds (no proxy) use the real
  // URL once CORS middleware is deployed to orfc.dev.
  const isDev =
    typeof window !== "undefined" &&
    window.location.hostname === "localhost";
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
    const { apiUrl } = useAuthStore.getState();
    set({ status: "signing-in", error: null });
    try {
      const result = await invoke<{ apiKey: string; email: string }>(
        "login_flow",
        { apiUrl },
      );

      // Persist to shared ~/.orfc/config.json (used by CLI too)
      const config = await loadOrfcConfig();
      const next = { ...config, apiKey: result.apiKey, email: result.email };
      await saveOrfcConfig(next);

      const client = buildClient(next);
      set({
        apiKey: result.apiKey,
        email: result.email,
        client,
        status: "signed-in",
        error: null,
      });
    } catch (e) {
      set({
        status: "error",
        error: e instanceof Error ? e.message : String(e),
      });
    }
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
    // Clear cloud data + reset editor so signed-out user can't access cloud docs
    const { useCloudStore } = await import("./cloud-store");
    const { useEditorStore } = await import("./editor-store");
    useCloudStore.getState().clearDocScopedState();
    useCloudStore.setState({ plans: [], plansError: null });
    useEditorStore.getState().newFile();
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
