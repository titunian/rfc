import { create } from "zustand";

interface EditorState {
  filePath: string | null;
  fileName: string;
  content: string;
  savedContent: string;
  isDirty: boolean;

  setFile: (path: string | null, name: string, content: string) => void;
  setContent: (content: string) => void;
  markSaved: () => void;
  newFile: () => void;
}

export const useEditorStore = create<EditorState>((set) => ({
  filePath: null,
  fileName: "Untitled",
  content: "",
  savedContent: "",
  isDirty: false,

  setFile: (path, name, content) =>
    set({ filePath: path, fileName: name, content, savedContent: content, isDirty: false }),

  setContent: (content) =>
    set((state) => ({ content, isDirty: content !== state.savedContent })),

  markSaved: () =>
    set((state) => ({ savedContent: state.content, isDirty: false })),

  newFile: () =>
    set({ filePath: null, fileName: "Untitled", content: "", savedContent: "", isDirty: false }),
}));
