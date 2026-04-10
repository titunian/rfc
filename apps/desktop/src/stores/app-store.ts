import { create } from "zustand";

type Theme = "light" | "dark";

const STORAGE_KEY = "orfc-desktop-theme";

function readInitialTheme(): Theme {
  if (typeof document === "undefined") return "light";
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

export type RightPanel = "none" | "comments" | "history";

interface AppState {
  sidebarOpen: boolean;
  focusMode: boolean;
  commandPaletteOpen: boolean;
  authModalOpen: boolean;
  publishDialogOpen: boolean;
  settingsOpen: boolean;
  rightPanel: RightPanel;
  theme: Theme;
  recentFiles: string[];
  tocVisible: boolean;

  toggleSidebar: () => void;
  toggleFocusMode: () => void;
  toggleToc: () => void;
  openCommandPalette: () => void;
  closeCommandPalette: () => void;
  toggleCommandPalette: () => void;
  openAuthModal: () => void;
  closeAuthModal: () => void;
  openPublishDialog: () => void;
  closePublishDialog: () => void;
  openSettings: () => void;
  closeSettings: () => void;
  toggleRightPanel: (panel: Exclude<RightPanel, "none">) => void;
  closeRightPanel: () => void;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  addRecentFile: (path: string) => void;
  removeRecentFile: (path: string) => void;
}

export const useAppStore = create<AppState>((set) => ({
  sidebarOpen: true,
  focusMode: false,
  commandPaletteOpen: false,
  authModalOpen: false,
  publishDialogOpen: false,
  settingsOpen: false,
  rightPanel: "none",
  theme: readInitialTheme(),
  recentFiles: [],
  tocVisible: true,

  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  toggleToc: () => set((s) => ({ tocVisible: !s.tocVisible })),

  toggleFocusMode: () =>
    set((s) => ({
      focusMode: !s.focusMode,
      // When entering focus mode, collapse the sidebar + right panel too
      sidebarOpen: s.focusMode ? s.sidebarOpen : false,
      rightPanel: "none",
      commandPaletteOpen: false,
    })),

  openCommandPalette: () => set({ commandPaletteOpen: true }),
  closeCommandPalette: () => set({ commandPaletteOpen: false }),
  toggleCommandPalette: () =>
    set((s) => ({ commandPaletteOpen: !s.commandPaletteOpen })),

  openAuthModal: () => set({ authModalOpen: true }),
  closeAuthModal: () => set({ authModalOpen: false }),

  openPublishDialog: () => set({ publishDialogOpen: true }),
  closePublishDialog: () => set({ publishDialogOpen: false }),

  openSettings: () => set({ settingsOpen: true }),
  closeSettings: () => set({ settingsOpen: false }),

  toggleRightPanel: (panel) =>
    set((s) => ({
      rightPanel: s.rightPanel === panel ? "none" : panel,
    })),
  closeRightPanel: () => set({ rightPanel: "none" }),

  setTheme: (theme) => {
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {}
    const root = document.documentElement;
    if (theme === "dark") root.classList.add("dark");
    else root.classList.remove("dark");
    set({ theme });
  },

  toggleTheme: () =>
    set((s) => {
      const next: Theme = s.theme === "dark" ? "light" : "dark";
      try {
        localStorage.setItem(STORAGE_KEY, next);
      } catch {}
      const root = document.documentElement;
      if (next === "dark") root.classList.add("dark");
      else root.classList.remove("dark");
      return { theme: next };
    }),

  addRecentFile: (path) =>
    set((s) => ({
      recentFiles: [path, ...s.recentFiles.filter((p) => p !== path)].slice(0, 12),
    })),

  removeRecentFile: (path) =>
    set((s) => ({
      recentFiles: s.recentFiles.filter((p) => p !== path),
    })),
}));
