# orfc — Architecture

## Overview

**orfc** is a collaborative RFC (Request for Comments) platform that enables teams to create, share, and review technical documents with inline commenting. The platform consists of a Next.js web application and a CLI tool for seamless workflow integration.

**Target Users:** Engineering teams, technical writers, and organizations that need structured document review processes.

**Core Problem Solved:** Eliminates the friction of sharing and collecting feedback on technical documents by providing a unified platform with both web and CLI interfaces, supporting markdown documents with inline comments and review workflows.

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
│       │   ├── commands/     # CLI command implementations
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
- **`/p/[slug]`** - Individual plan/document viewer with comments

### API Routes
- **`/api/auth/*`** - NextAuth endpoints and OTP management
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
- **`copy-block.tsx` / `copy-command.tsx`** - Code copying utilities
- **`session-provider.tsx`** - NextAuth session context wrapper

## Data Flow

### Authentication Flow
1. User enters email → OTP sent via Resend
2. Email verification → JWT session created
3. CLI authentication → API key generated and sent to local CLI server

### Document Management
1. **CLI Push:** `rfc push` → API call to `/api/plans` → Database storage
2. **Web View:** Browser request → `/p/[slug]` → Database query → Rendered document
3. **Comments:** Text selection → Comment creation → Real-time sidebar updates
4. **Notifications:** Review request → Email via Resend + Slack webhook

### Database Operations
- **Production:** PostgreSQL with Drizzle ORM
- **Development:** Local SQLite fallback
- **Migrations:** Drizzle Kit for schema changes

## Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL database (production) or SQLite (development)
- Environment variables configured

### Development Setup

```bash
# Install dependencies
npm install

# Database setup (production)
npm run db:generate
npm run db:push

# Start development servers
npm run dev
```

### Environment Variables
```env
DATABASE_URL=postgresql://...
NEXTAUTH_SECRET=your-secret
NEXTAUTH_URL=http://localhost:3000
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=noreply@yourdomain.com
```

### CLI Usage
```bash
# Install CLI globally
npm install -g @orfc/cli

# Authenticate
rfc login

# Push document
rfc push plan.md

# Pull with comments
rfc pull plan-id
```

The platform supports both authenticated and public document sharing, with configurable access rules and expiration times for enhanced security and collaboration control.