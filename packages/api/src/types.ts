export interface OrfcConfig {
  apiKey?: string;
  apiUrl: string;
  email?: string;
  name?: string;
  slackWebhook?: string;
  defaultReviewers?: string[];
  defaultAccess?: string;
  defaultExpiry?: string;
  [key: string]: unknown;
}

export interface PlanResponse {
  id: string;
  slug: string;
  url: string;
  title: string;
  version?: number;
  createdAt: string;
  updatedAt?: string;
}

export interface PlanDetail {
  id: string;
  slug: string;
  title: string | null;
  content: string;
  authorName: string | null;
  authorEmail?: string | null;
  currentVersion?: number;
  status?: string | null;
  createdAt: string;
  updatedAt: string | null;
}

export interface PlanListItem {
  id: string;
  slug: string;
  title: string;
  status?: string | null;
  createdAt: string;
  expiresAt: string | null;
}

export interface CommentItem {
  id: string;
  parentId: string | null;
  authorName: string;
  authorEmail: string | null;
  content: string;
  anchorText: string | null;
  anchorBlockIndex?: number | null;
  anchorOffsetStart?: number | null;
  anchorOffsetEnd?: number | null;
  resolved: boolean;
  createdAt: string;
}

export interface VersionSummary {
  id: string;
  version: number;
  title: string | null;
  authorEmail: string | null;
  createdAt: string;
}

export interface VersionDetail extends VersionSummary {
  content: string;
}

export interface DiffLine {
  type: "add" | "remove" | "same";
  content: string;
}
