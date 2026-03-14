# Routing Structure Documentation

## Route Map

```
/
├── api/
│   ├── auth/
│   │   ├── [...nextauth]          # NextAuth.js handler
│   │   ├── cli-callback           # CLI authentication callback
│   │   ├── key                    # API key generation
│   │   └── send-code              # Email OTP sending
│   ├── debug                      # Environment debug info
│   ├── migrate-access             # Database migration endpoint
│   ├── notify                     # Email/Slack notifications
│   └── plans/
│       ├── [id]                   # Individual plan operations
│       │   └── comments           # Plan comments
│       └── /                      # Plan listing/creation
├── auth/
│   ├── cli                        # CLI authentication flow
│   └── signin                     # Email OTP sign-in
├── dashboard                      # User dashboard
├── p/[slug]                       # Public plan viewer
└── layout.tsx                     # Root layout
```

## Page Routes

### `/` (Root)
- **URL Pattern**: `/`
- **Renders**: Not shown in provided files (likely home page)
- **Data Needs**: None specified
- **Layout**: Root layout with Inter/Source Serif fonts
- **Middleware/Guards**: None

### `/auth/signin`
- **URL Pattern**: `/auth/signin`
- **Renders**: Email OTP sign-in form
- **Data Needs**: 
  - `callbackUrl` query parameter (optional)
  - User email input
  - OTP code input
- **Layout**: Root layout
- **Middleware/Guards**: Client-side redirect if authenticated
- **Features**: 
  - Two-step authentication (email → OTP)
  - Supports callback URL redirection

### `/auth/cli`
- **URL Pattern**: `/auth/cli?port={port}&state={state}`
- **Renders**: CLI authentication flow interface
- **Data Needs**:
  - `port` query parameter (required)
  - `state` query parameter (required)
  - Session data
- **Layout**: Root layout
- **Middleware/Guards**: 
  - Validates port/state parameters
  - Auto-generates API key if already authenticated
- **Features**:
  - Handles CLI authentication workflow
  - Generates and sends API keys to local CLI

### `/dashboard`
- **URL Pattern**: `/dashboard`
- **Renders**: User's plan dashboard
- **Data Needs**:
  - User session (required)
  - User's plans list from `/api/plans`
- **Layout**: Root layout
- **Middleware/Guards**: 
  - Redirects to sign-in if unauthenticated
  - Client-side session check
- **Features**:
  - Lists user's created plans
  - Shows plan metadata (title, date, comments)

### `/p/[slug]`
- **URL Pattern**: `/p/{slug}`
- **Renders**: Public plan viewer with comments
- **Data Needs**:
  - Plan data by slug
  - User session (for access control)
  - Comments data
- **Layout**: Root layout
- **Middleware/Guards**: 
  - Server-side access control based on plan settings
  - Expiration check
- **Features**:
  - Server-side rendering
  - Dynamic metadata generation
  - Access control (public/authenticated/restricted)
  - Comment system
  - Expiration handling

## API Routes

### Authentication Routes

#### `POST /api/auth/[...nextauth]`
- **Purpose**: NextAuth.js authentication handler
- **Data Needs**: Authentication provider data
- **Guards**: None (public endpoint)

#### `POST /api/auth/send-code`
- **Purpose**: Send email OTP for authentication
- **Data Needs**: `{ email: string }`
- **Guards**: Production database required
- **Features**: Email sending via Resend

#### `POST /api/auth/key`
- **Purpose**: Generate API key for authenticated user
- **Data Needs**: User session
- **Guards**: 
  - `requireSession()`
  - Production database required

#### `POST /api/auth/cli-callback`
- **Purpose**: Generate API key for CLI authentication
- **Data Needs**: User session
- **Guards**: 
  - `requireSession()`
  - Production database required

### Plan Routes

#### `GET /api/plans`
- **Purpose**: List user's plans
- **Data Needs**: User session
- **Guards**: Authentication required in production
- **Returns**: Array of user's plans

#### `POST /api/plans`
- **Purpose**: Create new plan
- **Data Needs**: 
  ```json
  {
    "title": "string",
    "content": "string",
    "accessRule": "public|authenticated|restricted",
    "allowedViewers": "string[]",
    "expiresIn": "string"
  }
  ```
- **Guards**: Authentication required in production
- **Returns**: Created plan with URL

#### `GET /api/plans/[id]`
- **Purpose**: Get specific plan
- **Data Needs**: Plan ID
- **Guards**: Access control based on plan settings
- **Returns**: Plan data

#### `PUT /api/plans/[id]`
- **Purpose**: Update plan
- **Data Needs**: Plan updates, user session
- **Guards**: Authentication required
- **Returns**: Updated plan data

#### `GET /api/plans/[id]/comments`
- **Purpose**: Get plan comments
- **Data Needs**: Plan ID, user session
- **Guards**: Same access control as plan
- **Returns**: Array of comments

#### `POST /api/plans/[id]/comments`
- **Purpose**: Add comment to plan
- **Data Needs**: Comment data, user session
- **Guards**: Same access control as plan
- **Returns**: Created comment

### Utility Routes

#### `GET /api/debug`
- **Purpose**: Environment configuration debug
- **Data Needs**: None
- **Guards**: None
- **Returns**: Environment variable status

#### `POST /api/migrate-access`
- **Purpose**: Database migration for access rules
- **Data Needs**: None
- **Guards**: None (admin endpoint)
- **Returns**: Migration results

#### `POST /api/notify`
- **Purpose**: Send email/Slack notifications
- **Data Needs**: 
  ```json
  {
    "title": "string",
    "url": "string", 
    "emails": "string[]",
    "slackWebhook": "string"
  }
  ```
- **Guards**: `getAuthUser()` required
- **Returns**: Notification results

## Layout Nesting

### Root Layout (`/app/layout.tsx`)
- **Applied to**: All routes
- **Features**:
  - Font loading (Inter, Source Serif 4)
  - CSS variables setup
  - AuthProvider wrapper for NextAuth
  - Highlight.js styles
- **Metadata**: Base URL, title, description

### Page-specific Layouts
- No additional nested layouts found in provided files
- All pages inherit from root layout only

## Middleware & Guards

### Authentication Guards
1. **`requireSession()`**: Server-side session requirement
2. **`getAuthUser()`**: Extract authenticated user from request
3. **Client-side session checks**: Using `useSession()` hook

### Access Control
1. **`checkAccess()`**: Plan-level access control
2. **Production database checks**: `isProductionDB()`
3. **Plan expiration checks**: Server and client-side

### Route-specific Guards
- **API routes**: Most require authentication in production
- **Dashboard**: Client-side redirect if unauthenticated  
- **Plan viewer**: Server-side access control
- **CLI auth**: Parameter validation

## Data Flow Patterns

### Server-Side Rendering
- `/p/[slug]` uses SSR with caching
- Metadata generation for SEO
- Access control at render time

### Client-Side Data Fetching
- Dashboard fetches plans after authentication
- Comments loaded dynamically
- Real-time session management

### Hybrid Approach
- Local development uses JSON file storage
- Production uses PostgreSQL with Drizzle ORM
- Consistent API interface across environments