# Frontend Component Documentation

## Component Hierarchy Diagram

```
App
├── AuthProvider (Session Management)
│   └── Page Layouts
│       ├── AuthBar (Navigation)
│       └── PlanView (Document Viewer)
│           ├── CommentSidebar (Comments)
│           ├── SelectionPopover (Comment Creation)
│           ├── MermaidBlock (Diagrams)
│           ├── CopyBlock (Code Blocks)
│           └── CopyCommand (CLI Commands)
```

## Components by Feature Area

### 🔐 Authentication & Session Management

#### **AuthProvider**
- **File**: `components/session-provider.tsx`
- **Renders**: NextAuth SessionProvider wrapper
- **Key Props**: 
  - `children: React.ReactNode` - Child components
- **Used In**: Root app layout
- **State**: None (wrapper component)
- **Purpose**: Provides authentication context to entire app

#### **AuthBar**
- **File**: `components/auth-bar.tsx`
- **Renders**: Authentication status and navigation
  - Sign in button (unauthenticated)
  - User info + navigation links (authenticated)
- **Key Props**: None (uses session hook)
- **Used In**: Page headers/navigation
- **State**: 
  - `session` - Current user session from NextAuth
  - `status` - Loading state ("loading" | "authenticated" | "unauthenticated")
- **Features**:
  - Conditional rendering based on auth state
  - Sign out functionality
  - Dashboard navigation link

### 📄 Document Viewing & Content

#### **PlanView** (Main Document Component)
- **File**: `components/plan-view.tsx`
- **Renders**: Complete document viewing interface with:
  - Markdown content rendering
  - Table of contents
  - Comment system integration
  - Selection handling for comments
- **Key Props**:
  - `plan: Plan` - Document data object
  - `serverAuthed: boolean` - Server-side auth status
- **Used In**: Document pages (`/[slug]`)
- **State Management**:
  - `comments: Comment[]` - All document comments
  - `sidebarOpen: boolean` - Comment sidebar visibility
  - `activeCommentId: string | null` - Currently highlighted comment
  - `selection` - Text selection data for commenting
  - `activeTocId: string | null` - Current table of contents position
- **Features**:
  - Markdown rendering with syntax highlighting
  - Text selection for commenting
  - Table of contents generation and navigation
  - Comment highlighting and interaction
  - Access control (public/private documents)

#### **MermaidBlock**
- **File**: `components/mermaid-block.tsx`
- **Renders**: Interactive Mermaid diagrams
- **Key Props**:
  - `chart: string` - Mermaid diagram syntax
- **Used In**: Markdown content (code blocks with `mermaid` language)
- **State**:
  - `svg: string` - Rendered SVG content
  - `error: string | null` - Rendering error state
- **Features**:
  - Async Mermaid library loading
  - Error handling with user-friendly messages
  - Custom theming for consistency

### 💬 Comment System

#### **CommentSidebar**
- **File**: `components/comment-sidebar.tsx`
- **Renders**: Sidebar with comment list and management
  - Unresolved comments (primary)
  - Resolved comments (collapsible)
  - Empty state
  - Comment count badges
- **Key Props**:
  - `comments: Comment[]` - All comments
  - `activeCommentId: string | null` - Currently selected comment
  - `onCommentClick: (id: string | null) => void` - Comment selection handler
  - `onResolve: (id: string) => void` - Comment resolution handler
- **Used In**: PlanView component
- **State**:
  - `showResolved: boolean` - Toggle for resolved comments visibility
- **Features**:
  - Avatar generation with color coding
  - Comment filtering (resolved/unresolved)
  - User name/email display logic
  - Comment resolution workflow

#### **SelectionPopover**
- **File**: `components/selection-popover.tsx`
- **Renders**: Floating comment creation interface
  - Compact comment button (collapsed)
  - Comment textarea form (expanded)
- **Key Props**:
  - `rect: DOMRect` - Selection position for popover placement
  - `onComment: (text: string) => void` - Comment submission handler
  - `onDismiss: () => void` - Popover dismissal handler
- **Used In**: PlanView component
- **State**:
  - `isExpanded: boolean` - Form expansion state
  - `commentText: string` - Comment input content
- **Features**:
  - Dynamic positioning based on text selection
  - Click-outside dismissal
  - Auto-focus on expansion
  - Form validation

### 🔧 Utility Components

#### **CopyBlock**
- **File**: `components/copy-block.tsx`
- **Renders**: Code block with copy functionality
  - Syntax-highlighted code display
  - Copy button with success feedback
- **Key Props**:
  - `content: string` - Code content to display/copy
  - `label?: string` - Optional button tooltip
- **Used In**: Markdown content (large code blocks)
- **State**:
  - `copied: boolean` - Copy success feedback state
- **Features**:
  - Clipboard API integration
  - Visual feedback (icon change)
  - Scrollable content area
  - Hover interactions

#### **CopyCommand**
- **File**: `components/copy-command.tsx`
- **Renders**: Inline command with copy button
  - Terminal-style command display
  - Compact copy button
- **Key Props**:
  - `command: string` - CLI command to display/copy
- **Used In**: Documentation, setup instructions
- **State**:
  - `copied: boolean` - Copy success feedback state
- **Features**:
  - Terminal prompt styling (`$` prefix)
  - Monospace font
  - Success state indication
  - Compact horizontal layout

## Key Data Types

### **Plan Object**
```typescript
type Plan = {
  id: string;
  slug: string;
  title: string | null;
  content: string;
  authorName: string | null;
  authorEmail: string | null;
  accessRule: string;
  allowedViewers?: string | null;
  createdAt: string;
};
```

### **Comment Object**
```typescript
type Comment = {
  id: string;
  authorName: string;
  authorEmail: string | null;
  content: string;
  anchorText: string | null;
  anchorBlockIndex: number | null;
  anchorOffsetStart: number | null;
  anchorOffsetEnd: number | null;
  resolved: boolean;
  createdAt: string;
};
```

## Component Relationships

1. **AuthProvider** wraps the entire application
2. **AuthBar** appears in page headers, independent of other components
3. **PlanView** is the main document container that orchestrates:
   - **CommentSidebar** for comment management
   - **SelectionPopover** for comment creation
   - **MermaidBlock** for diagram rendering within markdown
4. **CopyBlock** and **CopyCommand** are utility components used within markdown content

The architecture follows a clear separation of concerns with authentication, document viewing, commenting, and utility functions each handled by dedicated components.