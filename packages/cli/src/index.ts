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
  .description("Publish markdown plans, get feedback from your team.")
  .version("0.1.0");

program
  .command("init")
  .description("Configure orfc (server URL, name)")
  .action(initCommand);

program
  .command("push [file]")
  .description("Publish a markdown file and get a shareable link")
  .option("-t, --title <title>", "RFC title (auto-detected from # heading)")
  .option("--no-open", "Don't auto-open in browser")
  .option("--expires <duration>", "Expiry duration (e.g., 7d, 24h, 30m)")
  .option("-u, --update <slug>", "Update an existing plan instead of creating new")
  .option("--to <emails>", "Email reviewers (comma-separated)")
  .option("--slack <webhook>", "Send to Slack webhook URL")
  .action(pushCommand);

program
  .command("pull <slug>")
  .description("Pull plan with inline comments (for AI revision)")
  .option("--include-resolved", "Include resolved comments")
  .action(pullCommand);

program
  .command("list")
  .alias("ls")
  .description("List your published plans")
  .action(listCommand);

program
  .command("delete <slug>")
  .alias("rm")
  .description("Delete a published plan")
  .action(deleteCommand);

program
  .command("open <slug>")
  .description("Open a plan in the browser")
  .action(openCommand);

program
  .command("comments <slug>")
  .description("View comments on a plan")
  .action(commentsCommand);

program
  .command("login")
  .description("Authenticate with the orfc server via browser")
  .action(loginCommand);

program
  .command("config <action> [key] [value]")
  .description("Manage config (show, set)")
  .action(configCommand);

program.parse();
