import { loadConfig } from "./config";

interface PlanResponse {
  id: string;
  slug: string;
  url: string;
  title: string;
  createdAt: string;
  updatedAt?: string;
}

interface PlanDetail {
  id: string;
  slug: string;
  title: string | null;
  content: string;
  authorName: string | null;
  createdAt: string;
  updatedAt: string | null;
}

interface PlanListItem {
  id: string;
  slug: string;
  title: string;
  createdAt: string;
  expiresAt: string | null;
}

interface CommentItem {
  id: string;
  authorName: string;
  authorEmail: string | null;
  content: string;
  anchorText: string | null;
  resolved: boolean;
  createdAt: string;
}

export class ApiClient {
  private baseUrl: string;
  private apiKey: string | undefined;

  constructor() {
    const config = loadConfig();
    this.baseUrl = config.apiUrl;
    this.apiKey = config.apiKey;
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

    const res = await fetch(url, {
      ...options,
      headers,
    });
    return res;
  }

  async createPlan(data: {
    title?: string;
    content: string;
    accessRule?: string;
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
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    return res.json() as Promise<{ plans: PlanListItem[] }>;
  }

  async deletePlan(id: string): Promise<{ deleted: boolean }> {
    const res = await this.request(`/api/plans/${id}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    return res.json() as Promise<{ deleted: boolean }>;
  }

  async getPlan(id: string): Promise<PlanDetail> {
    const res = await this.request(`/api/plans/${id}`);
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    return res.json() as Promise<PlanDetail>;
  }

  async updatePlan(
    id: string,
    data: { title?: string; content: string }
  ): Promise<PlanResponse> {
    const res = await this.request(`/api/plans/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = (await res.json().catch(() => ({ error: res.statusText }))) as { error?: string };
      throw new Error(err.error || `HTTP ${res.status}`);
    }
    return res.json() as Promise<PlanResponse>;
  }

  async getComments(planId: string): Promise<{ comments: CommentItem[] }> {
    const res = await this.request(`/api/plans/${planId}/comments`);
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    return res.json() as Promise<{ comments: CommentItem[] }>;
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
