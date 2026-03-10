#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const os = require("os");

const SKILL_NAME = "orfc";

function installSkill() {
  const home = os.homedir();
  const targetDir = path.join(home, ".claude", "skills", SKILL_NAME);
  const sourceFile = path.join(__dirname, "..", "skills", SKILL_NAME, "SKILL.md");

  // Check if source skill file exists
  if (!fs.existsSync(sourceFile)) {
    return;
  }

  try {
    // Create target directory
    fs.mkdirSync(targetDir, { recursive: true });

    // Copy SKILL.md
    const targetFile = path.join(targetDir, "SKILL.md");
    fs.copyFileSync(sourceFile, targetFile);

    console.log(`  ✓ Claude Code skill installed → ~/.claude/skills/${SKILL_NAME}/`);
    console.log(`    Use /orfc in Claude Code to publish and review plans`);
  } catch (err) {
    // Silently fail — skill install is optional
  }
}

installSkill();
