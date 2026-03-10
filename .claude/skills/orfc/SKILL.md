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

## Prerequisites

The `orfc` CLI must be installed. If not installed, run:

```bash
npm install -g @orfc/cli
```

If the user has not logged in yet, run:

```bash
orfc login
```

## Commands

### Publish a plan

```bash
orfc push <file.md>                                         # publish, get URL
orfc push <file.md> --to reviewer@company.com               # publish + email reviewer
orfc push <file.md> --viewers "@company.com"                # restrict to domain
orfc push <file.md> --viewers "a@co.com,b@co.com"           # restrict to specific emails
orfc push <file.md> --access anyone                         # public, no sign-in
orfc push <file.md> --update <slug>                         # update existing plan
orfc push <file.md> --expires 7d                            # auto-expire after 7 days
```

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

1. Write the plan as a markdown file (or use an existing one)
2. Run `orfc push <file.md>` with any access/notification flags the user specifies
3. Share the returned URL with the user
4. When asked to check feedback, run `orfc pull <slug>` and read the embedded comments
5. Address each comment, revise the plan, and optionally `orfc push <file.md> --update <slug>`

## Argument handling

- If `$ARGUMENTS` is `push <file>`, publish that file
- If `$ARGUMENTS` is `pull <slug>`, pull feedback for that slug
- If `$ARGUMENTS` is `comments <slug>`, show comments
- If `$ARGUMENTS` is `list`, list all plans
- If `$ARGUMENTS` is empty, ask the user what they want to do
- If `$ARGUMENTS` is just a filename (e.g., `plan.md`), treat it as `push <file>`
