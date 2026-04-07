import { create } from "zustand";

interface AppState {
  sidebarOpen: boolean;
  focusMode: boolean;
  theme: "light" | "dark" | "system";
  recentFiles: string[];

  toggleSidebar: () => void;
  toggleFocusMode: () => void;
  setTheme: (theme: "light" | "dark" | "system") => void;
  addRecentFile: (path: string) => void;
}

export const useAppStore = create<AppState>((set) => ({
  sidebarOpen: true,
  focusMode: false,
  theme: "system",
  recentFiles: [],

  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  toggleFocusMode: () => set((s) => ({ focusMode: !s.focusMode, sidebarOpen: s.focusMode ? s.sidebarOpen : false })),
  setTheme: (theme) => set({ theme }),
  addRecentFile: (path) =>
    set((s) => ({
      recentFiles: [path, ...s.recentFiles.filter((p) => p !== path)].slice(0, 10),
    })),
}));
