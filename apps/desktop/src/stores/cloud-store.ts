import { create } from "zustand";
import type {
  CommentItem,
  PlanDetail,
  PlanListItem,
  VersionSummary,
} from "@orfc/api";
import { useAuthStore } from "./auth-store";

interface CloudState {
  // List of plans owned by the signed-in user
  plans: PlanListItem[];
  plansLoading: boolean;
  plansError: string | null;
  lastPlansFetch: number;

  // Comments for the currently-open cloud doc
  comments: CommentItem[];
  commentsLoading: boolean;
  commentsError: string | null;

  // Versions for the currently-open cloud doc
  versions: VersionSummary[];
  currentVersion: number | null;
  versionsLoading: boolean;
  versionsError: string | null;

  // Actions
  fetchPlans: () => Promise<void>;
  fetchComments: (planId: string) => Promise<void>;
  addComment: (planId: string, content: string) => Promise<void>;
  resolveComment: (
    planId: string,
    commentId: string,
    resolved: boolean
  ) => Promise<void>;
  fetchVersions: (planId: string) => Promise<void>;
  fetchPlan: (id: string) => Promise<PlanDetail | null>;
  publish: (args: {
    planId?: string | null;
    title: string;
    content: string;
    accessRule?: string;
    allowedViewers?: string;
  }) => Promise<{ id: string; slug: string; url: string; title: string | null }>;
  updateAccess: (
    planId: string,
    args: { accessRule?: string; allowedViewers?: string }
  ) => Promise<void>;
  clearDocScopedState: () => void;
}

export const useCloudStore = create<CloudState>((set, get) => ({
  plans: [],
  plansLoading: false,
  plansError: null,
  lastPlansFetch: 0,

  comments: [],
  commentsLoading: false,
  commentsError: null,

  versions: [],
  currentVersion: null,
  versionsLoading: false,
  versionsError: null,

  fetchPlans: async () => {
    const client = useAuthStore.getState().client;
    if (!client || !useAuthStore.getState().apiKey) {
      set({ plans: [], plansError: "Not signed in" });
      return;
    }
    set({ plansLoading: true, plansError: null });
    try {
      const { plans } = await client.listPlans();
      set({
        plans,
        plansLoading: false,
        lastPlansFetch: Date.now(),
      });
    } catch (e) {
      set({
        plansLoading: false,
        plansError: e instanceof Error ? e.message : String(e),
      });
    }
  },

  fetchPlan: async (id: string) => {
    const client = useAuthStore.getState().client;
    if (!client) return null;
    try {
      return await client.getPlan(id);
    } catch (e) {
      console.error("fetchPlan failed", e);
      return null;
    }
  },

  fetchComments: async (planId) => {
    const client = useAuthStore.getState().client;
    if (!client) return;
    set({ commentsLoading: true, commentsError: null });
    try {
      const { comments } = await client.getComments(planId);
      set({ comments, commentsLoading: false });
    } catch (e) {
      set({
        commentsLoading: false,
        commentsError: e instanceof Error ? e.message : String(e),
      });
    }
  },

  addComment: async (planId, content) => {
    const client = useAuthStore.getState().client;
    if (!client) return;
    const email = useAuthStore.getState().email ?? undefined;
    const created = await client.addComment(planId, {
      content,
      authorName: email,
    });
    set((s) => ({ comments: [...s.comments, created] }));
  },

  resolveComment: async (planId, commentId, resolved) => {
    const client = useAuthStore.getState().client;
    if (!client) return;
    // Optimistic update
    set((s) => ({
      comments: s.comments.map((c) =>
        c.id === commentId ? { ...c, resolved } : c
      ),
    }));
    try {
      await client.setCommentResolved(planId, commentId, resolved);
    } catch (e) {
      // Rollback
      set((s) => ({
        comments: s.comments.map((c) =>
          c.id === commentId ? { ...c, resolved: !resolved } : c
        ),
      }));
      throw e;
    }
  },

  fetchVersions: async (planId) => {
    const client = useAuthStore.getState().client;
    if (!client) return;
    set({ versionsLoading: true, versionsError: null });
    try {
      const { currentVersion, versions } = await client.getVersions(planId);
      set({
        versions,
        currentVersion,
        versionsLoading: false,
      });
    } catch (e) {
      set({
        versionsLoading: false,
        versionsError: e instanceof Error ? e.message : String(e),
      });
    }
  },

  publish: async ({ planId, title, content, accessRule, allowedViewers }) => {
    const client = useAuthStore.getState().client;
    if (!client) throw new Error("Not signed in");

    if (planId) {
      const updated = await client.updatePlan(planId, {
        title,
        content,
        accessRule,
        allowedViewers,
      });
      void get().fetchPlans();
      return {
        id: updated.id,
        slug: updated.slug,
        url: updated.url,
        title: updated.title,
      };
    }

    const created = await client.createPlan({
      title,
      content,
      accessRule: accessRule || undefined,
      allowedViewers: allowedViewers || undefined,
    });
    void get().fetchPlans();
    return {
      id: created.id,
      slug: created.slug,
      url: created.url,
      title: created.title,
    };
  },

  updateAccess: async (planId, { accessRule, allowedViewers }) => {
    const client = useAuthStore.getState().client;
    if (!client) throw new Error("Not signed in");
    await client.updatePlan(planId, { accessRule, allowedViewers });
    void get().fetchPlans();
  },

  clearDocScopedState: () => {
    set({
      comments: [],
      commentsError: null,
      versions: [],
      currentVersion: null,
      versionsError: null,
    });
  },
}));
