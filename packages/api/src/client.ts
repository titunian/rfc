import type {
  PlanResponse,
  PlanDetail,
  PlanListItem,
  CommentItem,
  VersionSummary,
  VersionDetail,
  DiffLine,
} from "./types";

export interface ApiClientOptions {
  apiUrl: string;
  apiKey?: string;
}

export class ApiClient {
  private baseUrl: string;
  private apiKey: string | undefined;

  constructor(options: ApiClientOptions) {
    this.baseUrl = options.apiUrl;
    this.apiKey = options.apiKey;
  }

  private async request(
    path: string,
    options: RequestInit = {}
  ): Promise<Response> {
    const url = `${this.baseUrl}${path}`;
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(options.headers as Record<string, string>),
    };

    if (this.apiKey) {
      headers["Authorization"] = `Bearer ${this.apiKey}`;
    }

    return fetch(url, { ...options, headers });
  }

  async createPlan(data: {
    title?: string;
    content: string;
    accessRule?: string;
    allowedViewers?: string;
    expiresIn?: string;
  }): Promise<PlanResponse> {
    const res = await this.request("/api/plans", {
      method: "POST",
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = (await res.json().catch(() => ({ error: res.statusText }))) as { error?: string };
      throw new Error(err.error || `HTTP ${res.status}`);
    }
    return res.json() as Promise<PlanResponse>;
  }

  async listPlans(): Promise<{ plans: PlanListItem[] }> {
    const res = await this.request("/api/plans");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json() as Promise<{ plans: PlanListItem[] }>;
  }

  async getPlan(id: string): Promise<PlanDetail> {
    const res = await this.request(`/api/plans/${id}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json() as Promise<PlanDetail>;
  }

  async updatePlan(
    id: string,
    data: {
      title?: string;
      content?: string;
      accessRule?: string;
      allowedViewers?: string;
      expectedVersion?: number;
      status?: string;
    }
  ): Promise<PlanResponse> {
    const res = await this.request(`/api/plans/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = (await res.json().catch(() => ({ error: res.statusText }))) as {
        error?: string;
        currentVersion?: number;
      };
      if (res.status === 409) {
        const conflictErr = new Error(err.error || "Conflict") as Error & { currentVersion?: number };
        conflictErr.currentVersion = err.currentVersion;
        throw conflictErr;
      }
      throw new Error(err.error || `HTTP ${res.status}`);
    }
    return res.json() as Promise<PlanResponse>;
  }

  async deletePlan(id: string): Promise<{ deleted: boolean }> {
    const res = await this.request(`/api/plans/${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json() as Promise<{ deleted: boolean }>;
  }

  async getComments(planId: string): Promise<{ comments: CommentItem[] }> {
    const res = await this.request(`/api/plans/${planId}/comments`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json() as Promise<{ comments: CommentItem[] }>;
  }

  async addComment(
    planId: string,
    data: {
      content: string;
      parentId?: string | null;
      authorName?: string;
      anchorText?: string;
      anchorBlockIndex?: number | null;
      anchorOffsetStart?: number | null;
      anchorOffsetEnd?: number | null;
    }
  ): Promise<CommentItem> {
    const res = await this.request(`/api/plans/${planId}/comments`, {
      method: "POST",
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = (await res.json().catch(() => ({ error: res.statusText }))) as { error?: string };
      throw new Error(err.error || `HTTP ${res.status}`);
    }
    return res.json() as Promise<CommentItem>;
  }

  async setCommentResolved(
    planId: string,
    commentId: string,
    resolved: boolean
  ): Promise<CommentItem> {
    const res = await this.request(`/api/plans/${planId}/comments/${commentId}`, {
      method: "PATCH",
      body: JSON.stringify({ resolved }),
    });
    if (!res.ok) {
      const err = (await res.json().catch(() => ({ error: res.statusText }))) as { error?: string };
      throw new Error(err.error || `HTTP ${res.status}`);
    }
    return res.json() as Promise<CommentItem>;
  }

  async getVersions(planId: string): Promise<{ currentVersion: number; versions: VersionSummary[] }> {
    const res = await this.request(`/api/plans/${planId}/versions`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json() as Promise<{ currentVersion: number; versions: VersionSummary[] }>;
  }

  async getVersion(planId: string, versionId: string): Promise<VersionDetail> {
    const res = await this.request(`/api/plans/${planId}/versions/${versionId}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json() as Promise<VersionDetail>;
  }

  async getDiff(planId: string, fromId: string, toId: string = "current"): Promise<{ diff: DiffLine[] }> {
    const res = await this.request(`/api/plans/${planId}/diff?from=${fromId}&to=${toId}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json() as Promise<{ diff: DiffLine[] }>;
  }

  async notify(data: {
    title: string;
    url: string;
    emails?: string[];
    slackWebhook?: string;
  }): Promise<void> {
    const res = await this.request("/api/notify", {
      method: "POST",
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = (await res.json().catch(() => ({ error: res.statusText }))) as { error?: string };
      throw new Error(err.error || `HTTP ${res.status}`);
    }
  }
}
