import { create } from "zustand";

export type SyncState =
  | "local-only" // never published, no disk path
  | "disk" // on disk, never published
  | "synced" // matches cloud
  | "dirty" // local changes vs cloud/disk
  | "conflict"; // cloud moved ahead of us

interface PreviewVersion {
  versionId: string;
  version: number;
  title: string | null;
  content: string;
  authorEmail: string | null;
  createdAt: string;
}

interface EditorState {
  // Disk
  filePath: string | null;
  fileName: string;

  // Content
  content: string;
  savedContent: string;
  isDirty: boolean;

  // Cloud
  planId: string | null;
  planSlug: string | null;
  planUrl: string | null;
  planVersion: number | null;
  cloudSavedContent: string | null; // content we last pushed/pulled

  // Plan lifecycle status (draft | review | approved | executing | done)
  planStatus: string | null;

  // Cloud update detection
  cloudUpdateAvailable: boolean;

  // Read-only version preview overlay (set when browsing history)
  previewVersion: PreviewVersion | null;

  syncState: SyncState;

  // Actions
  setCloudUpdateAvailable: (v: boolean) => void;
  setPlanStatus: (status: string) => void;
  setFile: (args: {
    filePath: string | null;
    fileName: string;
    content: string;
  }) => void;
  setContent: (content: string) => void;
  setTitle: (title: string) => void;
  reconcileSyncedContent: (canonicalMd: string) => void;
  markSaved: () => void;
  newFile: () => void;
  setPreviewVersion: (preview: PreviewVersion | null) => void;
  restorePreviewVersion: () => void;
  attachCloud: (args: {
    planId: string;
    planSlug: string;
    planUrl: string;
    planVersion: number;
    title: string | null;
    content: string;
    planStatus?: string | null;
  }) => void;
  markCloudSaved: (content: string, version: number) => void;
  detachCloud: () => void;
}

function computeSyncState(state: {
  content: string;
  savedContent: string;
  filePath: string | null;
  planId: string | null;
  cloudSavedContent: string | null;
}): SyncState {
  const dirtyLocal = state.content !== state.savedContent;
  if (state.planId) {
    if (state.cloudSavedContent !== null && state.content === state.cloudSavedContent) {
      return "synced";
    }
    return "dirty";
  }
  if (state.filePath) {
    return dirtyLocal ? "dirty" : "disk";
  }
  return "local-only";
}

export const useEditorStore = create<EditorState>((set) => ({
  filePath: null,
  fileName: "Untitled",
  content: "",
  savedContent: "",
  isDirty: false,

  planId: null,
  planSlug: null,
  planUrl: null,
  planVersion: null,
  cloudSavedContent: null,

  planStatus: null,

  cloudUpdateAvailable: false,

  previewVersion: null,

  syncState: "local-only",

  setCloudUpdateAvailable: (v) => set({ cloudUpdateAvailable: v }),
  setPlanStatus: (status) => set({ planStatus: status }),

  setFile: ({ filePath, fileName, content }) =>
    set(() => ({
      filePath,
      fileName,
      content,
      savedContent: content,
      isDirty: false,
      // Opening a local file detaches any cloud association
      planId: null,
      planSlug: null,
      planUrl: null,
      planVersion: null,
      planStatus: null,
      cloudSavedContent: null,
      previewVersion: null,
      syncState: computeSyncState({
        content,
        savedContent: content,
        filePath,
        planId: null,
        cloudSavedContent: null,
      }),
    })),

  setContent: (content) =>
    set((state) => ({
      content,
      isDirty: content !== state.savedContent,
      syncState: computeSyncState({
        content,
        savedContent: state.savedContent,
        filePath: state.filePath,
        planId: state.planId,
        cloudSavedContent: state.cloudSavedContent,
      }),
    })),

  setTitle: (title) =>
    set({ fileName: title || "Untitled" }),

  /**
   * Called by the editor immediately after it loads external content
   * (cloud pull, file open, version preview restore). The Tiptap →
   * turndown round-trip produces a slightly different markdown string
   * than the original (whitespace, list bullet style, etc.) — without
   * this reconcile step, the editor would think those normalization
   * differences were dirty user edits, and the Publish button would
   * appear immediately after every cloud load.
   */
  reconcileSyncedContent: (canonicalMd: string) =>
    set((state) => {
      const next: Partial<EditorState> = {
        content: canonicalMd,
        savedContent: canonicalMd,
        isDirty: false,
      };
      if (state.cloudSavedContent !== null) {
        next.cloudSavedContent = canonicalMd;
        next.syncState = "synced";
      } else if (state.filePath) {
        next.syncState = "disk";
      } else {
        next.syncState = "local-only";
      }
      return next as EditorState;
    }),

  setPreviewVersion: (preview) => set({ previewVersion: preview }),

  restorePreviewVersion: () =>
    set((state) => {
      if (!state.previewVersion) return state;
      const restored = state.previewVersion;
      return {
        ...state,
        content: restored.content,
        savedContent: state.savedContent, // local working content marker stays
        isDirty: restored.content !== state.savedContent,
        fileName: restored.title || state.fileName,
        previewVersion: null,
        syncState: computeSyncState({
          content: restored.content,
          savedContent: state.savedContent,
          filePath: state.filePath,
          planId: state.planId,
          cloudSavedContent: state.cloudSavedContent,
        }),
      };
    }),

  markSaved: () =>
    set((state) => ({
      savedContent: state.content,
      isDirty: false,
      syncState: computeSyncState({
        content: state.content,
        savedContent: state.content,
        filePath: state.filePath,
        planId: state.planId,
        cloudSavedContent: state.cloudSavedContent,
      }),
    })),

  newFile: () =>
    set({
      filePath: null,
      fileName: "Untitled",
      content: "",
      savedContent: "",
      isDirty: false,
      planId: null,
      planSlug: null,
      planUrl: null,
      planVersion: null,
      planStatus: null,
      cloudSavedContent: null,
      previewVersion: null,
      cloudUpdateAvailable: false,
      syncState: "local-only",
    }),

  attachCloud: ({ planId, planSlug, planUrl, planVersion, title, content, planStatus }) =>
    set(() => ({
      planId,
      planSlug,
      planUrl,
      planVersion,
      planStatus: planStatus ?? null,
      content,
      savedContent: content,
      cloudSavedContent: content,
      isDirty: false,
      fileName: title || "Untitled",
      filePath: null,
      previewVersion: null,
      cloudUpdateAvailable: false,
      syncState: "synced",
    })),

  markCloudSaved: (content, version) =>
    set((state) => ({
      cloudSavedContent: content,
      savedContent: content,
      planVersion: version,
      isDirty: state.content !== content,
      syncState: state.content === content ? "synced" : "dirty",
    })),

  detachCloud: () =>
    set((state) => ({
      planId: null,
      planSlug: null,
      planUrl: null,
      planVersion: null,
      planStatus: null,
      cloudSavedContent: null,
      syncState: computeSyncState({
        content: state.content,
        savedContent: state.savedContent,
        filePath: state.filePath,
        planId: null,
        cloudSavedContent: null,
      }),
    })),
}));
