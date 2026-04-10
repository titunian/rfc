// Browser-safe entry for @orfc/api — re-exports only the ApiClient and types,
// omitting config.ts (which uses Node's fs/os/path modules).
// The desktop app (Vite/Rollup) aliases @orfc/api to this file.

export { ApiClient } from "./client";
export type { ApiClientOptions } from "./client";
export type {
  OrfcConfig,
  PlanResponse,
  PlanDetail,
  PlanListItem,
  CommentItem,
  VersionSummary,
  VersionDetail,
  DiffLine,
} from "./types";
