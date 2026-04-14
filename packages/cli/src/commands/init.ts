import * as readline from "readline";
import * as fs from "fs";
import * as path from "path";
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

// --- Agent scaffold content ---

// Universal orfc context — same content, deployed to multiple agent config locations
const ORFC_AGENT_CONTEXT = `# orfc — Plan & Review Tool

This project uses orfc for publishing, reviewing, and iterating on plans/RFCs.

## CLI Commands (use --json for machine-readable output)

- \`orfc push <file.md> [--status review] [--tags t1,t2] [--json]\` — Publish a plan
- \`orfc pull <slug> [--json]\` — Fetch plan with inline comments
- \`orfc status <slug> [draft|review|approved|executing|done]\` — Get/set lifecycle
- \`orfc wait <slug> --for approved [--timeout 300]\` — Block until status changes
- \`orfc comments <slug>\` — View comments in terminal
- \`orfc search <query> [--tag t] [--json]\` — Full-text search across plans
- \`orfc list [--status review] [--json]\` — List all plans

## Agent Workflow

1. Write a plan as markdown
2. \`orfc push plan.md --status review --json\` → get slug + URL
3. Share URL with reviewer, wait: \`orfc wait <slug> --for approved\`
4. Read feedback: \`orfc pull <slug> --json\` → includes comments
5. Iterate on the plan based on feedback
6. Push update: \`orfc push plan.md --update <slug> --status review --json\`
7. When approved: \`orfc status <slug> executing\`
8. When done: \`orfc status <slug> done\`

## Important

- Always use \`--json\` flag when invoking orfc programmatically
- The \`orfc wait\` command polls every 5s and blocks — use it to wait for human approval
- Plans are markdown files — any .md file can be pushed
- Comments include \`anchorText\` showing which text was highlighted

## Tool Integration

If your agent supports MCP or tool calling, use the CLI with --json:
- Input: \`orfc push plan.md --status review --json\`
- Output: \`{"id":"...","slug":"...","url":"...","title":"...","status":"review"}\`

All orfc commands support --json for structured output to stdout, errors to stderr.
`;

const ORFC_PUSH_MD = `---
description: Push a markdown file to orfc.dev for review
allowed-tools: Bash(orfc push *)
---

Push the specified file to orfc.dev:

\`\`\`bash
orfc push $ARGUMENTS --json
\`\`\`

Parse the JSON response and report the URL to the user.
`;

const ORFC_PULL_MD = `---
description: Pull a plan from orfc.dev with comments
allowed-tools: Bash(orfc pull *)
---

Pull the plan and its comments:

\`\`\`bash
orfc pull $ARGUMENTS --json
\`\`\`

Parse comments and summarize the feedback for the user.
`;

const ORFC_REVIEW_MD = `---
description: Full plan review workflow — push for review, wait for approval, read feedback
allowed-tools: Bash(orfc push *), Bash(orfc wait *), Bash(orfc pull *), Bash(orfc status *)
---

Execute the full orfc review cycle:

1. Push the plan for review:
\`\`\`bash
orfc push $ARGUMENTS --status review --json
\`\`\`

2. Extract the slug from the response and wait for approval:
\`\`\`bash
orfc wait <slug> --for approved --timeout 600 --json
\`\`\`

3. Once approved, pull the feedback:
\`\`\`bash
orfc pull <slug> --json
\`\`\`

4. Report the comments and feedback to the user.
`;

interface AgentFile {
  relativePath: string;
  content: string;
  label: string;
}

const AGENT_FILES: AgentFile[] = [
  // ── Claude Code ──
  {
    relativePath: ".claude/CLAUDE.md",
    content: ORFC_AGENT_CONTEXT,
    label: "Claude Code — agent context",
  },
  {
    relativePath: ".claude/commands/orfc-push.md",
    content: ORFC_PUSH_MD,
    label: "Claude Code — /orfc-push skill",
  },
  {
    relativePath: ".claude/commands/orfc-pull.md",
    content: ORFC_PULL_MD,
    label: "Claude Code — /orfc-pull skill",
  },
  {
    relativePath: ".claude/commands/orfc-review.md",
    content: ORFC_REVIEW_MD,
    label: "Claude Code — /orfc-review workflow",
  },
  // ── Cursor ──
  {
    relativePath: ".cursor/rules/orfc.md",
    content: ORFC_AGENT_CONTEXT,
    label: "Cursor — agent rules",
  },
  // ── GitHub Copilot ──
  {
    relativePath: ".github/copilot-instructions.md",
    content: ORFC_AGENT_CONTEXT,
    label: "GitHub Copilot — instructions",
  },
  // ── OpenAI Codex ──
  {
    relativePath: "AGENTS.md",
    content: ORFC_AGENT_CONTEXT,
    label: "Codex / generic — AGENTS.md",
  },
  // ── Windsurf ──
  {
    relativePath: ".windsurfrules",
    content: ORFC_AGENT_CONTEXT,
    label: "Windsurf — rules",
  },
  // ── Cline ──
  {
    relativePath: ".clinerules",
    content: ORFC_AGENT_CONTEXT,
    label: "Cline — rules",
  },
];

function scaffoldAgentFiles(): void {
  const cwd = process.cwd();

  console.log("");

  for (const file of AGENT_FILES) {
    const fullPath = path.join(cwd, file.relativePath);
    const dir = path.dirname(fullPath);

    if (fs.existsSync(fullPath)) {
      console.log(`  · ${file.relativePath} already exists, skipping`);
      continue;
    }

    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(fullPath, file.content, "utf-8");
    console.log(`  ✓ Created ${file.relativePath} — ${file.label}`);
  }

  console.log(`
  AI agents will now understand orfc in this project:

    Claude Code  →  .claude/CLAUDE.md + /orfc-push, /orfc-pull, /orfc-review skills
    Cursor       →  .cursor/rules/orfc.md
    Copilot      →  .github/copilot-instructions.md
    Codex        →  AGENTS.md
    Windsurf     →  .windsurfrules
    Cline        →  .clinerules

  Try: /orfc-push plan.md  (in Claude Code)
       or just ask your agent to "push this plan to orfc for review"
`);
}

export async function initCommand(options: { agent?: boolean }) {
  if (options.agent) {
    scaffoldAgentFiles();
    return;
  }

  console.log("\n  orfc — setup\n");

  const config = loadConfig();

  const url = await prompt(`  Server URL [${config.apiUrl}]: `);
  if (url) config.apiUrl = url;

  const name = await prompt("  Your name: ");
  if (name) config.name = name;

  const apiKey = await prompt(
    "  API key (get one at your orfc server, or leave blank for local): "
  );
  if (apiKey) config.apiKey = apiKey;

  saveConfig(config);

  console.log(`\n  ✓ Config saved to ${getConfigDir()}/config.json`);
  console.log("  You're ready to go! Try: orfc push plan.md\n");
}
