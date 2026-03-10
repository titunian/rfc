---
name: orfc
description: >
  Publish markdown plans to orfc.dev for team review and pull back inline feedback.
  Use when the user wants to share an implementation plan, architecture doc, or RFC
  for review, or when they want to check feedback on a previously shared plan.
allowed-tools: Bash, Read, Write, Glob, Grep
argument-hint: "[push <file>|pull <slug>|comments <slug>|list]"
---

# orfc — Share Plans, Get Feedback

You are using **orfc**, a tool for publishing markdown plans to [orfc.dev](https://orfc.dev) so team members can leave inline comments, then pulling that feedback back for iteration.

## Step 1: Check setup (ALWAYS do this first)

Before running any orfc command, you MUST verify the CLI is installed and the user is authenticated.

### Check if CLI is installed

```bash
which orfc
```

If not found, ask the user whether they want to install it globally or use npx:

- **Global install**: `npm install -g @orfc/cli`
- **One-off via npx**: prefix all commands with `npx @orfc/cli` instead of `orfc`

### Check if user is logged in

```bash
cat ~/.orfc/config.json 2>/dev/null
```

If the file doesn't exist or has no `apiKey` field, the user needs to log in first:

1. Tell the user: "You need to log in to orfc.dev first. This will open your browser for email-based sign-in."
2. Run: `orfc login`
3. This opens a browser window → user enters their email → receives a magic link → clicks it → CLI receives an API key
4. The API key is saved to `~/.orfc/config.json` automatically
5. **Important**: This is interactive and requires the user to complete the browser flow. Wait for it to finish (120s timeout).

If the user is in a headless environment (no browser), `orfc login` will print a URL they can open manually on any device.

## Step 2: Run the requested command

### Publish a plan

```bash
orfc push <file.md>                                         # publish, get URL
orfc push <file.md> --to reviewer@company.com               # publish + email reviewer
orfc push <file.md> --viewers "@company.com"                # restrict to domain
orfc push <file.md> --viewers "a@co.com,b@co.com"           # restrict to specific emails
orfc push <file.md> --access anyone                         # public, no sign-in
orfc push <file.md> --update <slug>                         # update existing plan
orfc push <file.md> --expires 7d                            # auto-expire after 7 days
orfc push <file.md> --no-open                               # don't open browser after push
```

After pushing, share the returned URL with the user.

### Pull feedback

```bash
orfc pull <slug>                   # prints markdown with inline <!-- [COMMENT] --> blocks
orfc pull <slug> > feedback.md     # save to file for revision
```

Comments are embedded as:
```
<!-- [COMMENT by reviewer@co.com]
On: "the specific text they highlighted"
> Their feedback here
-->
```

### Other commands

```bash
orfc comments <slug>    # view comments in terminal
orfc list               # list all your published plans
orfc open <slug>        # open plan in browser
orfc delete <slug>      # delete a plan
```

## Typical workflow

When the user asks to share a plan for review:

1. Check setup (Step 1 above)
2. Write the plan as a markdown file (or use an existing one)
3. Run `orfc push <file.md>` with any access/notification flags the user specifies
4. Share the returned URL with the user
5. When asked to check feedback, run `orfc pull <slug>` and read the embedded comments
6. Address each comment, revise the plan, and optionally `orfc push <file.md> --update <slug>`

## Argument handling

- If `$ARGUMENTS` is `push <file>`, publish that file
- If `$ARGUMENTS` is `pull <slug>`, pull feedback for that slug
- If `$ARGUMENTS` is `comments <slug>`, show comments
- If `$ARGUMENTS` is `list`, list all plans
- If `$ARGUMENTS` is empty, ask the user what they want to do
- If `$ARGUMENTS` is just a filename (e.g., `plan.md`), treat it as `push <file>`

## Error handling

- If `orfc push` fails with an auth error, re-run `orfc login`
- If the CLI is not found and the user doesn't want to install globally, use `npx @orfc/cli <command>` instead
- If `orfc login` times out, the user didn't complete the browser flow — ask them to try again
