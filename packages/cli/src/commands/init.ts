import * as readline from "readline";
import { loadConfig, saveConfig, getConfigDir } from "../lib/config";

function prompt(question: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

export async function initCommand() {
  console.log("\n  rfc — setup\n");

  const config = loadConfig();

  const url = await prompt(`  Server URL [${config.apiUrl}]: `);
  if (url) config.apiUrl = url;

  const name = await prompt("  Your name: ");
  if (name) config.name = name;

  const apiKey = await prompt(
    "  API key (get one at your rfc server, or leave blank for local): "
  );
  if (apiKey) config.apiKey = apiKey;

  saveConfig(config);

  console.log(`\n  ✓ Config saved to ${getConfigDir()}/config.json`);
  console.log("  You're ready to go! Try: rfc push plan.md\n");
}
