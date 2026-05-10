import { loadConfig, setConfigValue } from "../lib/config";

const CONFIG_KEYS: Record<string, string> = {
  "api-key": "apiKey",
  "api-url": "apiUrl",
  "email": "email",
  "name": "name",
  "slack-webhook": "slackWebhook",
  "default-reviewers": "defaultReviewers",
  "default-access": "defaultAccess",
  "default-expiry": "defaultExpiry",
};

export function configCommand(action: string, key?: string, value?: string) {
  if (action === "show") {
    const config = loadConfig();
    console.log("\n  orfc config:\n");
    console.log(`  api-url:           ${config.apiUrl}`);
    console.log(`  email:             ${config.email || "(not set)"}`);
    console.log(`  name:              ${config.name || "(not set)"}`);
    console.log(
      `  api-key:           ${config.apiKey ? config.apiKey.slice(0, 8) + "..." : "(not set)"}`
    );
    console.log(
      `  slack-webhook:     ${config.slackWebhook ? "(configured)" : "(not set)"}`
    );
    console.log(
      `  default-reviewers: ${config.defaultReviewers?.join(", ") || "(not set)"}`
    );
    console.log(
      `  default-access:    ${config.defaultAccess || "(not set)"}`
    );
    console.log(
      `  default-expiry:    ${config.defaultExpiry || "(not set)"}`
    );
    console.log("");
    return;
  }

  if (action === "set") {
    if (!key || !value) {
      console.error("\n  Usage: orfc config set <key> <value>\n");
      console.log("  Available keys:");
      for (const k of Object.keys(CONFIG_KEYS)) {
        console.log(`    ${k}`);
      }
      console.log("");
      process.exit(1);
    }

    const configKey = CONFIG_KEYS[key];
    if (!configKey) {
      console.error(`\n  ✗ Unknown config key: ${key}`);
      console.log("  Available keys:");
      for (const k of Object.keys(CONFIG_KEYS)) {
        console.log(`    ${k}`);
      }
      console.log("");
      process.exit(1);
    }

    setConfigValue(configKey, value);
    console.log(`\n  ✓ Set ${key} = ${value}\n`);
    return;
  }

  console.error("\n  Usage: orfc config <show|set> [key] [value]\n");
}
