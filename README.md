# orfc

Publish markdown documents, collect inline feedback, pull comments back into your files. Built for engineers, technical writers, and AI agents.

**[orfc.dev](https://orfc.dev)**

## What it does

1. Write a markdown plan, RFC, or design doc
2. `orfc push plan.md` — publish it, get a shareable link
3. Reviewers open the link, select text, leave inline comments
4. `orfc pull <slug>` — pull comments back as embedded blocks in your markdown

Comments come back as `<!-- [COMMENT] ... -->` blocks — easy to parse, easy to address, works great with AI agents.

## Install the CLI

```bash
npm install -g @orfc/cli
```

```bash
orfc login                          # authenticate via browser
orfc push plan.md                   # publish, get a link
orfc push plan.md --to alice@co.com # notify a reviewer
orfc pull xK7mQ2                    # pull comments into markdown
orfc comments xK7mQ2               # view comments in terminal
orfc list                           # list your plans
orfc open xK7mQ2                   # open in browser
orfc delete xK7mQ2                 # delete a plan
```

### Push options

| Flag | Description |
|------|-------------|
| `--title` | Set title (default: auto-detect from `# heading`) |
| `--access anyone` | Make publicly accessible (default: `authenticated`) |
| `--allow @company.com` | Restrict to email domain |
| `--allow alice@co.com,bob@co.com` | Restrict to specific emails |
| `--expires 7d` | Auto-expire after duration (`7d`, `24h`, `30m`) |
| `--to email` | Notify reviewer on publish |
| `--no-open` | Don't open browser after push |

## Self-host

orfc is a monorepo with two packages:

```
apps/web/       → Next.js web app (viewer, comments, auth)
packages/cli/   → CLI tool (published to npm as @orfc/cli)
```

### Prerequisites

- Node.js + npm 10+
- PostgreSQL (Neon recommended) — or leave `DATABASE_URL` empty for local JSON file mode

### Setup

```bash
git clone https://github.com/titunian/rfc.git
cd rfc
npm install

# configure environment
cp apps/web/.env.example apps/web/.env.local
```

Edit `apps/web/.env.local`:

```env
DATABASE_URL=              # Neon postgres URL, or leave empty for JSON file mode
NEXTAUTH_SECRET=           # openssl rand -base64 32
NEXTAUTH_URL=http://localhost:3141
RESEND_API_KEY=            # for email notifications (optional)
APP_URL=http://localhost:3141
```

```bash
# run database migrations (skip if using JSON file mode)
npm run db:push

# start dev server
npm run dev
```

The web app runs on `http://localhost:3141`.

### Point CLI to your instance

```bash
orfc config set apiUrl http://localhost:3141
```

### Build

```bash
npm run build    # build all packages
npm run lint     # lint all packages
```

### Database commands

```bash
npm run db:push      # push schema to database
npm run db:generate  # generate migration SQL
npm run db:migrate   # run migrations
```

## Tech stack

- **Web**: Next.js 14, React 18, Tailwind CSS, Monaco Editor, Mermaid diagrams
- **Database**: PostgreSQL (Neon) via Drizzle ORM — or local JSON files
- **CLI**: TypeScript, Commander.js
- **Auth**: NextAuth with email magic links
- **Email**: Resend
- **Monorepo**: Turborepo

## Features

- Markdown rendering with syntax highlighting (100+ languages)
- Mermaid diagrams and LaTeX math
- Inline text selection commenting
- Access control — public, authenticated, domain-restricted, or email-restricted
- Auto-expiring documents
- Email and Slack webhook notifications
- CLI-first workflow — no UI required
- AI agent friendly — comments as parseable HTML blocks
- No database required for local development

## License

[MIT](LICENSE)
