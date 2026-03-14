# orfc — Architecture

## Overview

**orfc** is a collaborative RFC (Request for Comments) platform that enables teams to create, share, and review technical documents with inline commenting. The platform consists of a Next.js web application and a CLI tool for seamless workflow integration.

**Target Users:** Engineering teams, technical writers, and organizations that need structured document review processes.

**Core Problem Solved:** Eliminates the friction of sharing and collecting feedback on technical documents by providing a unified platform with both web and command-line interfaces, supporting markdown documents with inline comments and collaborative review workflows.

## Tech Stack

- **Next.js 14** - Full-stack React framework with App Router for web application
- **NextAuth.js** - Authentication system with email OTP verification
- **Drizzle ORM** - Type-safe database operations and migrations
- **PostgreSQL** - Production database (with local SQLite fallback)
- **Turbo** - Monorepo build system and task runner
- **TypeScript** - Type safety across web and CLI packages
- **Tailwind CSS** - Styling framework
- **Resend** - Email delivery service for OTP codes
- **Mermaid** - Diagram rendering in markdown documents
- **Slack Integration** - Webhook notifications for review requests

## Project Structure

```
orfc/
├── apps/
│   └── web/                    # Next.js web application
│       ├── app/
│       │   ├── api/           # API routes
│       │   ├── auth/          # Authentication pages
│       │   ├── dashboard/     # User dashboard
│       │   └── p/[slug]/      # Plan viewing pages
│       ├── components/        # React components
│       ├── lib/              # Shared utilities
│       └── drizzle/          # Database migrations
├── packages/
│   └── cli/                   # Command-line interface
│       ├── src/
│       │   ├── commands/      # CLI command implementations
│       │   └── lib/          # CLI utilities
└── turbo.json                # Monorepo configuration
```

## Key Files

- **`apps/web/app/api/auth/[...nextauth]/options.ts`** - NextAuth configuration with email OTP provider
- **`apps/web/lib/schema.ts`** - Drizzle database schema definitions
- **`apps/web/lib/auth.ts`** - Authentication utilities and API key management
- **`apps/web/components/plan-view.tsx`** - Main document viewer with commenting system
- **`packages/cli/src/index.ts`** - CLI entry point and command routing
- **`packages/cli/src/lib/api.ts`** - API client for CLI-to-web communication
- **`turbo.json`** - Monorepo build and development task configuration

## Pages & Routes

### Web Application
- **`/`** - Landing page
- **`/auth/signin`** - Email OTP authentication
- **`/auth/cli`** - CLI authentication flow
- **`/dashboard`** - User's plan management dashboard
- **`/p/[slug]`** - Individual plan/document viewer

### API Routes
- **`/api/auth/*`** - Authentication endpoints (NextAuth, OTP, API keys)
- **`/api/plans`** - CRUD operations for documents
- **`/api/plans/[id]`** - Individual plan operations
- **`/api/notify`** - Email and Slack notification system
- **`/api/migrate-access`** - Database migration utilities

## Components

- **`auth-bar.tsx`** - Authentication status and user menu
- **`plan-view.tsx`** - Document renderer with markdown parsing and comment integration
- **`comment-sidebar.tsx`** - Inline commenting system with selection-based comments
- **`selection-popover.tsx`** - Text selection interface for adding comments
- **`mermaid-block.tsx`** - Mermaid diagram rendering component
- **`copy-block.tsx`** & **`copy-command.tsx`** - Code copying utilities
- **`session-provider.tsx`** - NextAuth session context wrapper

## Data Flow

### Authentication Flow
1. User enters email → OTP sent via Resend
2. Email verification → JWT session created
3. CLI authentication → API key generated and sent to local CLI server

### Document Management
1. **CLI Push:** `rfc push` → API call to `/api/plans` → Database storage
2. **Web View:** Browser request → `/p/[slug]` → Database query → Rendered document
3. **Comments:** Text selection → Comment creation → Real-time updates via API

### Notification System
1. Review request → `/api/notify` → Parallel email (Resend) and Slack webhook calls
2. Email templates with document links and reviewer instructions

### Database Strategy
- **Production:** PostgreSQL with Drizzle ORM
- **Development:** Local SQLite fallback for offline development
- **Migrations:** Drizzle Kit for schema changes

## Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL database (production) or SQLite (development)
- Resend API key (for email OTP)

### Environment Setup
```bash
# Required for production
DATABASE_URL=postgresql://...
NEXTAUTH_SECRET=your-secret
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=noreply@yourdomain.com

# Optional
SLACK_WEBHOOK_URL=https://hooks.slack.com/...
APP_URL=https://yourdomain.com
```

### Development Commands
```bash
# Install dependencies
npm install

# Start development servers (web + CLI)
npm run dev

# Database operations
npm run db:generate  # Generate migrations
npm run db:push      # Push schema changes
npm run db:migrate   # Run migrations

# Build all packages
npm run build

# Lint all packages
npm run lint
```

### CLI Usage
```bash
# Install CLI globally
npm install -g @orfc/cli

# Authenticate
rfc login

# Create and push a plan
rfc init
rfc push

# View plans
rfc list
rfc open [slug]
```

The application supports both authenticated and local development modes, with automatic fallback to SQLite when no production database is configured.