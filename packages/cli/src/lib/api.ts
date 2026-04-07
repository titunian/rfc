import { ApiClient as BaseApiClient } from "@orfc/api";
import { loadConfig } from "./config";
import type {
  PlanResponse,
  PlanDetail,
  PlanListItem,
  CommentItem,
} from "@orfc/api";

// Re-export types for backwards compat with existing commands
export type { PlanResponse, PlanDetail, PlanListItem, CommentItem };

/**
 * CLI-specific ApiClient that auto-loads config from ~/.orfc/config.json
 */
export class ApiClient extends BaseApiClient {
  constructor() {
    const config = loadConfig();
    super({ apiUrl: config.apiUrl, apiKey: config.apiKey });
  }
}
