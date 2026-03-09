import { execSync } from "child_process";
import { platform } from "os";

export function copyToClipboard(text: string): boolean {
  try {
    const os = platform();
    if (os === "darwin") {
      execSync("pbcopy", { input: text });
    } else if (os === "linux") {
      execSync("xclip -selection clipboard", { input: text });
    } else if (os === "win32") {
      execSync("clip", { input: text });
    } else {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}
