import { loadConfig } from "../lib/config";

export async function openCommand(slug: string) {
  const config = loadConfig();
  const url = `${config.apiUrl}/p/${slug}`;

  try {
    const open = (await import("open")).default;
    await open(url);
    console.log(`\n  ✓ Opened: ${url}\n`);
  } catch {
    console.log(`\n  Open in browser: ${url}\n`);
  }
}
