import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { homedir } from "os";
import { join } from "path";

export interface RfcConfig {
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

const CONFIG_DIR = join(homedir(), ".rfc");
const CONFIG_FILE = join(CONFIG_DIR, "config.json");

const DEFAULT_CONFIG: RfcConfig = {
  apiUrl: "http://localhost:3141",
};

export function getConfigDir(): string {
  return CONFIG_DIR;
}

export function loadConfig(): RfcConfig {
  if (!existsSync(CONFIG_FILE)) {
    return { ...DEFAULT_CONFIG };
  }
  try {
    const raw = readFileSync(CONFIG_FILE, "utf-8");
    return { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}

export function saveConfig(config: RfcConfig): void {
  if (!existsSync(CONFIG_DIR)) {
    mkdirSync(CONFIG_DIR, { recursive: true });
  }
  writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2) + "\n");
}

export function getConfigValue(key: string): string | undefined {
  const config = loadConfig();
  return (config as Record<string, unknown>)[key] as string | undefined;
}

export function setConfigValue(key: string, value: string): void {
  const config = loadConfig();
  (config as Record<string, unknown>)[key] = value;
  saveConfig(config);
}
