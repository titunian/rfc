<div align="center">

# orfc

**The place your agent's documents land for human review.**

Publish markdown or HTML docs · collect inline feedback · pull comments back as parseable blocks · iterate.

[orfc.dev](https://orfc.dev) · `npm i -g @orfc/cli`

</div>

---

## Why

Most agents today write code straight into your repo. Good ones write the **plan first** — an architecture doc, an RFC, a migration design — and want a human to sanity-check it before any code lands.

That review loop is broken. Slack threads lose context. PR comments only work after the code exists. Google Docs strips out your code blocks and SVG diagrams.

**orfc is built for that loop, agent-first.** The agent writes a doc, pushes it with one command, the team reviews it with inline comments in their browser, the agent pulls the comments back as machine-readable blocks and revises. The doc is the artifact, not the PR.

Markdown + HTML both first-class. Charts and diagrams render. Comments anchor to exact text snippets. Every push snapshots the previous version. Works with any agent that has a shell.

## The agent workflow

```bash
# 1. Agent writes the plan
$ orfc push plan.md --viewers "@company.com" --to alice@co.com
✓ Published → https://orfc.dev/p/xK7mQ2
✓ Emailed 1 reviewer

# 2. Human reviews on orfc.dev — selects text, leaves comments

# 3. Agent pulls the feedback
$ orfc pull xK7mQ2 > feedback.md
# feedback.md now has the plan + reviewer comments
# inlined as <!-- [COMMENT by alice@co.com] ... --> blocks

# 4. Agent revises, re-publishes
$ orfc push plan.md --update xK7mQ2
✓ Updated → https://orfc.dev/p/xK7mQ2 (v2)
```

Drop this into a Cursor rule, a `CLAUDE.md`, or your agent's system prompt — see [the agent prompt](https://orfc.dev/#docs) on the docs page for a copy-pasteable version.

## What's in the box

- **CLI** (`@orfc/cli`) — `push`, `pull`, `edit`, `list`, `comments`, `delete`, `open`, `login`
- **Web** ([orfc.dev](https://orfc.dev)) — viewer, inline comments, version history, dashboard with folders + tags
- **Two content types** — `.md` and `.html` (push `design.html` directly; SVG charts and inline styles preserved sanitized)
- **Access control** — public, authenticated, email or domain-restricted
- **Auto-expiry** — `--expires 7d` for time-boxed plans
- **Notifications** — email reviewers via Resend, Slack webhook on publish

## Install

```bash
npm install -g @orfc/cli
orfc login
```

The CLI saves an API key to `~/.orfc/config.json`. One login, then it's just `orfc <command>`.

## Commands

```bash
orfc push <file>           # publish a markdown or HTML doc
orfc push <file> --update <slug>  # update an existing doc
orfc pull <slug>           # pull doc + inline comments as markdown
orfc edit <slug>           # pull, edit in $EDITOR, push back
orfc comments <slug>       # view comments in terminal
orfc list                  # list your docs
orfc open <slug>           # open in browser
orfc delete <slug>         # delete a doc
orfc config <action>       # view or set config (apiUrl, defaults)
orfc --help                # full usage
```

### Push flags

| Flag | Description |
|------|-------------|
| `--title "…"` | Custom title (default: from `# heading` for md, `<title>` / `<h1>` for html) |
| `--access anyone` | Public link, no sign-in required |
| `--viewers "@co.com"` | Restrict to an email domain |
| `--viewers "a@x.com,b@y.com"` | Restrict to a list |
| `--folder platform/2026` | Group on the dashboard |
| `--tag roadmap,infra` | Tag for filtering |
| `--expires 7d` | Auto-expire (`7d`, `24h`, `30m`) |
| `--to alice@co.com` | Email reviewers on publish |
| `--slack https://…` | Slack webhook on publish |
| `--update <slug>` | Update an existing doc (preserves version history) |
| `--no-open` | Don't auto-open the browser |

## Agent-side integration

Anything that can run a shell command can use orfc. For Claude Code / Cursor / Windsurf:

1. Have the agent install `@orfc/cli` and run `orfc login` once.
2. Include this snippet in your agent's instructions (`CLAUDE.md`, Cursor rules, etc.):

```
Before implementing any non-trivial task, publish your plan for human
review using orfc:

  orfc push plan.md --viewers "@company.com" --to reviewer@company.com

Wait for the reviewer to leave comments, then:

  orfc pull <slug> > feedback.md

Read the inline <!-- [COMMENT] --> blocks, address each one, revise
the plan, and re-publish:

  orfc push plan.md --update <slug>

Repeat until approved, then implement.
```

A copy-pasteable longer version is on [orfc.dev](https://orfc.dev/#docs).

## Self-host

Monorepo with two packages:

```
apps/web/      → Next.js 14 web app (viewer, comments, auth, API)
packages/cli/  → CLI (@orfc/cli on npm)
examples/      → reference HTML docs (handbook, single-page demo)
```

### Prerequisites

- Node.js 18+
- PostgreSQL (Neon works great) — or skip and use the JSON-file fallback

### Setup

```bash
git clone https://github.com/titunian/rfc.git
cd rfc
npm install
cp apps/web/.env.example apps/web/.env.local
# fill in DATABASE_URL, NEXTAUTH_SECRET, optionally RESEND_API_KEY
npm run db:push           # if you set a DATABASE_URL
npm run dev               # http://localhost:3141
```

Point a local CLI at it:

```bash
orfc config set apiUrl http://localhost:3141
```

### Database

```bash
npm run db:push       # diff schema.ts against the DB and apply
npm run db:generate   # generate migration SQL
npm run db:migrate    # run migrations (with journal)
```

## Stack

- **Web** — Next.js 14 App Router, React 18, Tailwind, react-markdown + rehype-highlight + Mermaid for markdown, sanitize-html for HTML docs
- **CLI** — TypeScript, Commander, Node 18+
- **Database** — Postgres on Neon via Drizzle ORM (or JSON-file fallback for local dev)
- **Auth** — NextAuth + email OTP via Resend
- **Hosting** — Vercel (serverless)

## License

[MIT](LICENSE) — built by [@titunian](https://github.com/titunian)
