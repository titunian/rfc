import { existsSync, readFileSync, writeFileSync, mkdirSync } from "fs";
import { homedir } from "os";
import { join } from "path";
import type { OrfcConfig } from "./types";

const CONFIG_DIR = join(homedir(), ".orfc");
const CONFIG_FILE = join(CONFIG_DIR, "config.json");

const DEFAULT_CONFIG: OrfcConfig = {
  apiUrl: "https://www.orfc.dev",
};

export function getConfigDir(): string {
  return CONFIG_DIR;
}

export function loadConfig(): OrfcConfig {
  if (!existsSync(CONFIG_FILE)) {
    return { ...DEFAULT_CONFIG };
  }
  try {
    const raw = readFileSync(CONFIG_FILE, "utf-8");
    const config: OrfcConfig = { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
    if (config.apiUrl === "https://orfc.dev") {
      config.apiUrl = "https://www.orfc.dev";
    }
    return config;
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}

export function saveConfig(config: OrfcConfig): void {
  if (!existsSync(CONFIG_DIR)) {
    mkdirSync(CONFIG_DIR, { recursive: true });
  }
  writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2) + "\n");
}

export function getConfigValue(key: string): string | undefined {
  const config = loadConfig();
  return config[key] as string | undefined;
}

export function setConfigValue(key: string, value: string): void {
  const config = loadConfig();
  config[key] = value;
  saveConfig(config);
}
