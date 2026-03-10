import fs from "fs";
import path from "path";
import os from "os";

export async function installSkillCommand() {
  const home = os.homedir();
  const skillName = "orfc";
  const targetDir = path.join(home, ".claude", "skills", skillName);
  const targetFile = path.join(targetDir, "SKILL.md");

  // Source: relative to compiled dist/ → ../skills/orfc/SKILL.md
  const sourceFile = path.join(__dirname, "..", "skills", skillName, "SKILL.md");

  if (!fs.existsSync(sourceFile)) {
    console.error("✗ Skill file not found. Try reinstalling: npm install -g @orfc/cli");
    process.exit(1);
  }

  try {
    fs.mkdirSync(targetDir, { recursive: true });
    fs.copyFileSync(sourceFile, targetFile);
    console.log(`✓ Claude Code skill installed → ~/.claude/skills/${skillName}/`);
    console.log(`  Use /orfc in Claude Code to publish and review plans`);
  } catch (err: any) {
    console.error(`✗ Failed to install skill: ${err.message}`);
    process.exit(1);
  }
}
