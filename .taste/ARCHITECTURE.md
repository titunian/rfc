# orfc Architecture

## What This Is

orfc is a collaborative RFC (Request for Comments) platform that allows teams to create, share, and review technical documents with real-time commenting. Users can write RFCs in markdown, share them via unique URLs with configurable access controls, and collaborate through inline comments. The platform supports both web and CLI interfaces, making it easy to integrate into developer workflows.

**Core Features:**
- Markdown-based RFC authoring with Mermaid diagram support
- Granular access controls (public, authenticated, or specific viewers)
- Real-time commenting system with selection-based annotations
- CLI tool for seamless workflow integration
- Email and Slack notifications for review requests
- Temporary document expiration (minutes, hours, days)

## Tech Stack

| Technology | Role in orfc |
|------------|--------------|
| **Next.js 14** | Full-stack framework using App Router for file-based routing and API routes |
| **TypeScript** | Type safety across web app and CLI package |
| **NextAuth.js** | Authentication with custom email OTP provider |
| **Drizzle ORM** | Type-safe database operations with PostgreSQL |
| **PostgreSQL** | Production database for plans, comments, users, and API keys |
| **Tailwind CSS** | Utility-first styling with custom design tokens |
| **Turborepo** | Monorepo management for web app and CLI packages |
| **Resend** | Transactional email service for OTP codes and notifications |
| **Mermaid** | Diagram rendering within markdown content |

## How It's Organized

```
orfc/
├── apps/web/                    # Next.js web application
│   ├── app/
│   │   ├── api/                 # API routes
│   │   │   ├── auth/            # Authentication endpoints
│   │   │   ├── plans/           # RFC CRUD operations
│   │   │   ├── notify/          # Email/Slack notifications
│   │   │   └── debug/           # Development utilities
│   │   ├── auth/                # Authentication pages
│   │   ├── dashboard/           # User dashboard
│   │   ├── p/[slug]/           # Public RFC viewer
│   │   └── layout.tsx          # Root layout with providers
│   ├── components/              # Reusable UI components
│   ├── lib/                     # Shared utilities and configs
│   └── drizzle/                # Database migrations
├── packages/cli/                # Command-line interface
│   └── src/
│       ├── commands/            # CLI command implementations
│       └── lib/                 # CLI utilities and API client
└── turbo.json                   # Monorepo build configuration
```

## Pages & Navigation

| Route | Purpose | Components Used | Access |
|-------|---------|-----------------|--------|
| `/` | Landing page and RFC creation form | `plan-view.tsx`, `auth-bar.tsx` | Public |
| `/auth/signin` | Email OTP authentication | Custom form components | Public |
| `/auth/cli` | CLI authentication flow | `copy-command.tsx` | Authenticated |
| `/dashboard` | User's RFC management | Plan list, access controls | Authenticated |
| `/p/[slug]` | RFC viewer with comments | `plan-view.tsx`, `comment-sidebar.tsx`, `mermaid-block.tsx` | Configurable |

**Navigation Pattern:**
- `auth-bar.tsx` provides consistent auth state across all pages
- `session-provider.tsx` wraps the app for NextAuth integration
- Dynamic routing via Next.js App Router with TypeScript params

## Key Components

### Content & Viewing
- **`plan-view.tsx`** - Main RFC renderer with markdown parsing and Mermaid support
- **`mermaid-block.tsx`** - Renders diagrams from mermaid code blocks
- **`copy-block.tsx`** - Code syntax highlighting with copy functionality

### Collaboration
- **`comment-sidebar.tsx`** - Threaded comment interface with real-time updates
- **`selection-popover.tsx`** - Inline comment creation on text selection

### Utilities
- **`copy-command.tsx`** - CLI command copying with visual feedback
- **`auth-bar.tsx`** - Authentication status and user menu
- **`session-provider.tsx`** - NextAuth session context wrapper

## Data & State

**Data Flow Pattern:**
```
API Routes → Database (Drizzle) → JSON Response → Client Components → Local State
```

**State Management:**
- **Server State**: NextAuth session via `session-provider.tsx`
- **Client State**: React useState for UI interactions, form data
- **Database**: PostgreSQL with Drizzle ORM for type-safe queries
- **Local Development**: JSON file fallback when `DATABASE_URL` not set

**Key Data Models:**
- `plans` - RFC documents with content, access rules, expiration
- `comments` - Threaded comments with text selection ranges
- `apiKeys` - CLI authentication tokens
- `verificationCodes` - Email OTP codes

## API Endpoints

### Authentication
- `POST /api/auth/send-code` - Send email OTP code
- `POST /api/auth/key` - Generate CLI API key
- `POST /api/auth/cli-callback` - CLI authentication completion

### RFC Management
- `GET/POST /api/plans` - List user RFCs / Create new RFC
- `GET/PUT /api/plans/[id]` - Fetch/update specific RFC
- `GET/POST /api/plans/[id]/comments` - Fetch/create comments

### Utilities
- `POST /api/notify` - Send email/Slack review requests
- `POST /api/migrate-access` - Admin migration endpoint
- `GET /api/debug` - Environment configuration check

**Authentication Requirements:**
- Public: RFC viewing (based on access rules), OTP sending
- Authenticated: RFC creation, commenting, API key generation
- API Key: CLI operations via `Authorization: Bearer` header

## Authentication

**Flow:**
1. User enters email on `/auth/signin`
2. `POST /api/auth/send-code` sends 6-digit OTP via Resend
3. User enters code, NextAuth validates via `options.ts`
4. JWT session stored, user redirected to dashboard

**CLI Authentication:**
1. `rfc login` opens browser to `/auth/cli`
2. User authenticates, `POST /api/auth/cli-callback` generates API key
3. Key stored locally in CLI config for subsequent requests

**Session Management:**
- JWT strategy via NextAuth
- `requireSession()` helper for protected API routes
- `getAuthUser()` for optional authentication
- API key validation for CLI requests

## For Designers

**Design System:**
- **Framework**: Tailwind CSS with custom configuration
- **Typography**: Inter (sans-serif) and custom serif font variables
- **Color Palette**: Tailwind defaults with semantic color usage
- **Components**: Utility-first approach, no component library

**Key Design Patterns:**
- Minimal, document-focused interface
- Syntax highlighting for code blocks
- Responsive layout with sidebar comments
- Toast notifications for user feedback
- Modal overlays for authentication flows

**Customization Points:**
- `tailwind.config.ts` - Design tokens and theme extension
- `globals.css` - Global styles and CSS variables
- Font loading via Next.js font optimization

## For Developers

**Local Development:**
```bash
# Install dependencies
npm install

# Start development servers
npm run dev

# Database operations (production only)
npm run db:push     # Push schema changes
npm run db:generate # Generate migrations
npm run db:migrate  # Run migrations
```

**Key Patterns:**
- **API Routes**: Use `getAuthUser()` for optional auth, `requireSession()` for required
- **Database**: Drizzle ORM with `getDb()` helper, automatic local/production switching
- **Error Handling**: Consistent JSON error responses with appropriate HTTP status codes
- **Type Safety**: Shared types between API and client, Drizzle schema as source of truth

**Environment Variables:**
```bash
DATABASE_URL=          # PostgreSQL connection string
NEXTAUTH_SECRET=       # JWT signing secret
NEXTAUTH_URL=          # Canonical app URL
GOOGLE_CLIENT_ID=      # OAuth (if enabled)
GOOGLE_CLIENT_SECRET=  # OAuth (if enabled)
RESEND_API_KEY=        # Email service
RESEND_FROM_EMAIL=     # Sender address
```

**Gotchas:**
- Local mode uses JSON file storage when `DATABASE_URL` not set
- API keys only work with production database
- Email OTP requires Resend configuration
- CLI and web share authentication via API keys

## Module Index

[→ API Documentation](api.md) | [→ Component Library](components.md) | [→ CLI Commands](cli.md) | [→ Database Schema](schema.md)