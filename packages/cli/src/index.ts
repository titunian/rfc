#!/usr/bin/env node

import { Command } from "commander";
import { initCommand } from "./commands/init";
import { pushCommand } from "./commands/push";
import { listCommand } from "./commands/list";
import { deleteCommand } from "./commands/delete";
import { openCommand } from "./commands/open";
import { commentsCommand } from "./commands/comments";
import { configCommand } from "./commands/config";
import { pullCommand } from "./commands/pull";
import { loginCommand } from "./commands/login";

const program = new Command();

program
  .name("orfc")
  .description(
    `orfc — publish markdown plans, get inline feedback from your team.

  Workflow:
    1. Write a plan in markdown (or let your AI agent generate one)
    2. orfc push plan.md          → publishes to orfc.dev, returns a URL
    3. Share the URL with reviewers → they sign in and leave inline comments
    4. orfc pull <slug>            → pulls comments back into your markdown
    5. Revise and iterate

  Quick start:
    $ orfc login                          # authenticate via browser
    $ orfc push plan.md                   # publish, auto-opens in browser
    $ orfc push plan.md --to reviewer@company.com  # publish and email reviewer
    $ orfc pull xK7mQ2 > feedback.md      # pull comments into file

  Access control:
    By default, plans require sign-in to view ("authenticated").
    --access anyone                       # public, no sign-in needed
    --viewers "@company.com"              # only @company.com emails can view
    --viewers "a@co.com,b@co.com"         # only specific emails can view
    The plan author always has access regardless of viewer restrictions.

  AI agent usage:
    AI agents (Cursor, Claude Code, Windsurf, etc.) can use orfc to share
    implementation plans for human review before executing. Typical flow:
      1. Agent generates a markdown plan
      2. Agent runs: orfc push plan.md --viewers "@yourcompany.com" --to you@yourcompany.com
      3. Human reviews on orfc.dev, leaves inline comments on specific sections
      4. Agent runs: orfc pull <slug> > feedback.md
      5. Agent reads feedback.md (comments are embedded as <!-- [COMMENT] --> blocks
         next to the relevant text) and revises the plan
      6. Agent runs: orfc push plan.md --update <slug>  to publish the revision

  Config is stored in ~/.orfc/config.json. Use "orfc config show" to view.`
  )
  .version("0.1.4");

program
  .command("login")
  .description(
    "Authenticate with orfc.dev via browser. Opens a browser window for " +
    "email-based sign-in. After authentication, your API key is saved to " +
    "~/.orfc/config.json. You only need to do this once."
  )
  .action(loginCommand);

program
  .command("push [file]")
  .description(
    "Publish a markdown file to orfc.dev and get a shareable link.\n" +
    "  The file can be a .md file path, or piped via stdin.\n" +
    "  Title is auto-detected from the first # heading.\n" +
    "  Returns a URL like https://orfc.dev/p/xK7mQ2 and copies it to clipboard.\n\n" +
    "  Examples:\n" +
    "    orfc push plan.md\n" +
    "    orfc push plan.md --viewers \"@company.com\" --to alice@company.com\n" +
    "    orfc push plan.md --access anyone\n" +
    "    orfc push plan.md --update xK7mQ2\n" +
    "    cat plan.md | orfc push"
  )
  .option("-t, --title <title>", "RFC title (overrides auto-detection from # heading)")
  .option("--access <rule>", "Access rule: \"anyone\" (public) or \"authenticated\" (default, requires sign-in)")
  .option("--viewers <patterns>", "Restrict who can view. Use \"@domain.com\" for domain-based access or comma-separated emails. Implies authenticated access. Author always has access.")
  .option("-u, --update <slug>", "Update an existing plan by its slug instead of creating a new one")
  .option("--to <emails>", "Email notification to reviewers (comma-separated email addresses)")
  .option("--slack <webhook>", "Send notification to a Slack webhook URL")
  .option("--expires <duration>", "Auto-expire the plan after a duration (e.g., 7d, 24h, 30m)")
  .option("--no-open", "Don't auto-open the published URL in the browser")
  .action(pushCommand);

program
  .command("pull <slug>")
  .description(
    "Pull a plan with reviewer comments embedded inline as HTML comment blocks.\n" +
    "  Comments are inserted next to the text they reference:\n\n" +
    "    <!-- [COMMENT by reviewer@co.com]\n" +
    "    On: \"the specific text they highlighted\"\n" +
    "    > Their feedback here\n" +
    "    -->\n\n" +
    "  Pipe to a file for AI revision:\n" +
    "    orfc pull xK7mQ2 > feedback.md\n\n" +
    "  The AI agent can then read feedback.md, address each comment,\n" +
    "  remove the comment blocks, and push the updated version."
  )
  .option("--include-resolved", "Include resolved comments (by default only unresolved are shown)")
  .action(pullCommand);

program
  .command("comments <slug>")
  .description(
    "View all comments on a plan in the terminal.\n" +
    "  Shows each comment with author, timestamp, quoted anchor text, and content.\n" +
    "  Works for any plan you have access to (not just your own)."
  )
  .action(commentsCommand);

program
  .command("list")
  .alias("ls")
  .description(
    "List all your published plans with title, slug, date, and expiry.\n" +
    "  Use the slug with other commands: orfc open <slug>, orfc pull <slug>, etc."
  )
  .action(listCommand);

program
  .command("open <slug>")
  .description("Open a plan in the default browser by its slug.")
  .action(openCommand);

program
  .command("delete <slug>")
  .alias("rm")
  .description("Permanently delete a published plan and all its comments.")
  .action(deleteCommand);

program
  .command("init")
  .description(
    "Interactive setup wizard. Configures server URL and default settings.\n" +
    "  Config is stored at ~/.orfc/config.json.\n" +
    "  Usually not needed — defaults point to https://orfc.dev."
  )
  .action(initCommand);

program
  .command("config <action> [key] [value]")
  .description(
    "View or modify orfc configuration.\n\n" +
    "  Actions:\n" +
    "    show              Show all config values\n" +
    "    set <key> <value> Set a config value\n\n" +
    "  Available keys:\n" +
    "    apiUrl          Server URL (default: https://orfc.dev)\n" +
    "    defaultAccess   Default access rule for new plans (anyone | authenticated)\n" +
    "    defaultExpiry   Default expiry for new plans (e.g., 7d)\n" +
    "    slackWebhook    Default Slack webhook URL for notifications\n\n" +
    "  Example:\n" +
    "    orfc config set defaultAccess anyone\n" +
    "    orfc config show"
  )
  .action(configCommand);

program.parse();
