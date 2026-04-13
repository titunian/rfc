import {
  BaseDirectory,
  readTextFile,
  writeTextFile,
  mkdir,
  exists,
} from "@tauri-apps/plugin-fs";

// Shared with the @orfc/cli config at ~/.orfc/config.json
export interface OrfcConfig {
  apiUrl: string;
  apiKey?: string;
  anthropicApiKey?: string;
  email?: string;
  name?: string;
}

const CONFIG_DIR = ".orfc";
const CONFIG_PATH = `${CONFIG_DIR}/config.json`;
const DEFAULT_API_URL = "https://www.orfc.dev";

const DEFAULTS: OrfcConfig = {
  apiUrl: DEFAULT_API_URL,
};

export async function loadOrfcConfig(): Promise<OrfcConfig> {
  try {
    const raw = await readTextFile(CONFIG_PATH, {
      baseDir: BaseDirectory.Home,
    });
    const parsed = JSON.parse(raw);
    return { ...DEFAULTS, ...parsed };
  } catch {
    return { ...DEFAULTS };
  }
}

export async function saveOrfcConfig(config: OrfcConfig): Promise<void> {
  // Ensure the ~/.orfc directory exists.
  try {
    const dirExists = await exists(CONFIG_DIR, { baseDir: BaseDirectory.Home });
    if (!dirExists) {
      await mkdir(CONFIG_DIR, { baseDir: BaseDirectory.Home, recursive: true });
    }
  } catch {
    // mkdir may fail if the dir already exists under certain fs races — ignore.
  }

  const body = JSON.stringify({ ...DEFAULTS, ...config }, null, 2);
  await writeTextFile(CONFIG_PATH, body, { baseDir: BaseDirectory.Home });
}

export async function clearOrfcCredentials(): Promise<OrfcConfig> {
  const config = await loadOrfcConfig();
  const { apiKey: _k, email: _e, ...rest } = config;
  const next = { ...DEFAULTS, ...rest };
  await saveOrfcConfig(next);
  return next;
}
