# orfc desktop — context for the next session

This document is the **handoff brief** for anyone (or any next AI assistant) picking up the orfc desktop app. It captures _why_ things are the way they are, the decisions made, the bugs we hit and how we fixed them, and what's still outstanding.

If you're continuing work on this app, **read this first**. Don't re-derive the painful bits from scratch.

---

## What this app is

**orfc desktop** is a native macOS markdown editor (Tauri 2 + React + Tiptap) that's the GUI companion to the existing `@orfc/cli` package. Same `~/.orfc/config.json`, same API, same product surface — but a Notion-quality editing experience for writers and AI agents who want the cloud-sync ergonomics of orfc without leaving the keyboard.

The web app at `apps/web` is the canonical "viewer" — published plans live on `orfc.dev/p/<slug>`. The desktop is the **authoring side** of the same system.

### Product principles

1. **Mac-native first.** SF Pro / SF Mono everywhere. No web fonts. Floating-card panel layout with rounded corners and a hairline shell color. Traffic lights overlay the content (no native title bar).
2. **Keyboard-first.** Every action has a shortcut. ⌘K opens a Raycast-style command palette. `/` opens a Notion-style slash menu. The mouse exists but isn't required.
3. **Less Notion, more terminal/CLI DNA.** Vim-style status line, monospace metadata (slugs, paths, timestamps, counts), terminal glyphs (`●` / `○`) for sync state, terse verbs.
4. **Cloud sync is one explicit action — `Publish`.** Drafts stay local; the user pushes when they're ready. The app shares `~/.orfc/config.json` with the CLI, so logging in via either tool authenticates both.

---

## Architecture at a glance

```
apps/desktop/
├── index.html                       # entry; loads main.tsx
├── package.json                     # Tiptap v3 + marked + turndown + Tauri 2
├── vite.config.ts                   # /api proxy to orfc.dev + @orfc/api alias
├── tailwind.config.js               # CSS-var color extends
├── tsconfig.json                    # bundler resolution
├── src-tauri/                       # Rust side
│   ├── Cargo.toml                   # tauri 2 + plugin-fs/dialog/shell
│   ├── tauri.conf.json              # window cfg, file associations, capabilities
│   ├── capabilities/default.json    # plugin permissions (Tauri 2 v2 style)
│   └── src/lib.rs                   # entry; OS file-open events → JS
└── src/
    ├── main.tsx                     # ReactDOM root + ErrorBoundary
    ├── App.tsx                      # Layout + global keybindings + version banner
    ├── stores/
    │   ├── app-store.ts             # sidebar/focus/theme/palette/right-panel state
    │   ├── editor-store.ts          # filePath/fileName/content/syncState/planId/preview
    │   ├── auth-store.ts            # apiUrl/apiKey/email + ApiClient instance
    │   └── cloud-store.ts           # plans/comments/versions + publish/updateAccess
    ├── lib/
    │   ├── orfc-config.ts           # read/write ~/.orfc/config.json via plugin-fs
    │   └── file-ops.ts              # open/save/saveAs via plugin-dialog + plugin-fs
    ├── styles/
    │   ├── globals.css              # CSS vars (light + dark), shell/panel system
    │   └── editor.css               # prose typography (SF Pro everywhere)
    └── components/
        ├── ErrorBoundary.tsx        # catches render errors so you see the stack
        ├── sidebar/Sidebar.tsx      # unified docs list (recent + cloud)
        ├── toolbar/Toolbar.tsx      # (mostly) empty drag region — title is in editor
        ├── status-bar/StatusBar.tsx # vim-mode-line: [+] modified · slug · 1234w
        ├── editor/
        │   ├── Editor.tsx           # Tiptap useEditor + sync effects + reconciler
        │   ├── EditorActions.tsx    # sticky top-right rail: Publish/Focus/Comments/History/Open
        │   ├── CommentHighlights.ts # ProseMirror decoration plugin for comment anchors
        │   ├── SlashCommands.ts     # Tiptap extension wrapping @tiptap/suggestion
        │   └── SlashMenu.tsx        # React popup rendered by SlashCommands
        ├── auth-modal/AuthModal.tsx # (currently disabled; see "outstanding")
        ├── publish-dialog/PublishDialog.tsx
        ├── command-palette/CommandPalette.tsx
        └── right-panel/
            ├── CommentsDrawer.tsx   # threads + composer + scroll-to via custom event
            └── VersionHistoryDrawer.tsx  # list-only; preview shows in main editor
```

---

## Stores (Zustand) — the brain

### `editor-store.ts` — the document state

Fields you need to know:

- `content` / `savedContent` / `cloudSavedContent` — three baselines.
  - `content` = what's in the editor right now
  - `savedContent` = the disk version (matched after save-to-disk)
  - `cloudSavedContent` = the cloud version (matched after publish)
- `isDirty` — `content !== savedContent`
- `syncState` — derived: `local-only` | `disk` | `synced` | `dirty` | `conflict`
- `planId` / `planSlug` / `planUrl` / `planVersion` — set by `attachCloud`
- `previewVersion` — when non-null, the editor is read-only and shows this past version

Key actions:

- **`setTitle(title)`** — called by the editor on every onUpdate. Reads the first `<h1>` of the document and sets `fileName`. The title is the source of truth, the toolbar/sidebar are just consumers.
- **`reconcileSyncedContent(canonicalMd)`** — **CRITICAL DON'T DELETE.** Called by the editor right after an external content load (cloud pull, file open). It captures the markdown the editor _currently_ outputs and treats _that_ as the canonical synced form. Without this, the markdown round-trip noise (Tiptap HTML → turndown → md) would always look like a dirty edit and the Publish button would be permanently visible. See "Cloud sync false-dirty" below for the full story.
- **`attachCloud({...})`** — sets all the cloud fields, marks `synced`, clears preview.
- **`setPreviewVersion(...)`** / **`restorePreviewVersion()`** — version history flow.

### `auth-store.ts`

Just a thin store around an `ApiClient` instance. `hydrate()` reads `~/.orfc/config.json` (the same file the CLI uses) on app boot. `signOut()` clears it. `signIn()` is **temporarily a stub that throws** — see "outstanding".

`buildClient(config)`: in dev (`window.location.hostname === "localhost"`) the client is constructed with an empty base URL so `fetch("/api/plans/...")` hits the local Vite dev server, which proxies to `https://www.orfc.dev`. In a production build it uses `config.apiUrl` directly. **This is how we sidestep CORS.**

### `cloud-store.ts`

Fetches and caches plans, comments, versions. Has `publish`, `updateAccess`, `addComment`, `resolveComment`, `fetchPlan`, etc. Calls into `useAuthStore.getState().client`. Optimistic updates for comment resolve with rollback on failure.

### `app-store.ts`

UI state only: `sidebarOpen`, `focusMode`, `commandPaletteOpen`, `authModalOpen`, `publishDialogOpen`, `rightPanel: "none" | "comments" | "history"`, `theme`, `recentFiles`. Theme persists to localStorage as `orfc-desktop-theme` and is read at boot by the inline script in `index.html` (no FOUC).

---

## Editor (Tiptap v3)

The editor is the heaviest piece. Read **`apps/desktop/src/components/editor/Editor.tsx`** end-to-end before changing anything in there.

### Extensions loaded

- `StarterKit` (heading levels 1-4, bold, italic, code, lists, blockquote, hr, history)
- `Placeholder` (per-node — empty h1 → `"Untitled"`, empty p → `"/ for blocks · ⌘K for commands"`)
- `Link` (autolink + manual)
- `Typography` (smart quotes, em dashes, ellipsis)
- `TaskList` + `TaskItem` (nested checklists)
- **`CommentHighlights`** — custom extension. Walks the doc, finds each cloud comment's `anchorText`, wraps in an inline `Decoration` with the `comment-highlight` class. Click handler dispatches `orfc:focus-comment` which the CommentsDrawer listens for to scroll + flash the matching card. Updated via `updateCommentHighlights(editor, comments, activeId)` whenever the cloud store's `comments` change.
- **`SlashCommands`** — custom extension wrapping `@tiptap/suggestion`. Triggers on `/`, opens `SlashMenu.tsx` (rendered into `document.body` via `ReactRenderer`). Position is computed from `editor.view.coordsAtPos(range.from)` (NOT `clientRect()` — that returns null on first paint and was the cause of the "menu shows up at top-left" bug). Auto-flips above the cursor when below has no room.

### The big bug we fixed: cloud sync false-dirty

**Symptom:** Open a cloud doc → the Publish button shows immediately, even with no edits. Type a character → still shows. Dirty state was always true.

**Root cause:** A loop:
1. `attachCloud(...)` sets `content`, `savedContent`, `cloudSavedContent` to the original markdown from the API.
2. Editor's external-content sync `useEffect` fires because `content` changed.
3. The editor's current Tiptap-roundtripped markdown differs from the original (whitespace, list bullet style, trailing newline) — so the effect calls `editor.commands.setContent(markdownToHtml(content))`.
4. That triggers Tiptap's `onUpdate`, which calls `turndown(getHTML())` → produces a slightly different markdown.
5. `onChange(md)` → store `setContent(md)` → store's `content` is now the *new* round-tripped form, but `savedContent` is still the original. They differ → `isDirty = true`.
6. Publish button always visible.

Then the SECOND bug stacked on top: when the user typed, the same effect re-fired (because `content` changed), saw the editor's freshly-emitted markdown vs the prop (which equals what onChange just emitted) — they matched, so it bailed... except sometimes it found a tiny normalization diff and reset the editor, eating the user's edit and reconciling to synced.

**Fix (two-part):**

1. **`reconcileSyncedContent(canonicalMd)`** action on the editor store. Right after the external sync effect calls `editor.commands.setContent(...)`, the editor reads back what Tiptap *now* outputs and calls `reconcileSyncedContent` with that string. The action overwrites `content` + `savedContent` + `cloudSavedContent` to all match, and sets `syncState: "synced"`. Future edits dirty against the canonical form, not the original.

2. **`lastEmittedRef`** in Editor.tsx tracks the markdown the editor most recently emitted via `onUpdate`. The external sync effect bails out early if `content === lastEmittedRef.current` — that means the change came from a user edit echoing back through the store, not from outside (`attachCloud` / `setFile`). Without this guard the effect would re-set the editor on every keystroke.

If you ever change the editor's content flow, **preserve both of these**. Test by opening a cloud doc and verifying the Publish button is hidden until you actually type something.

### Other important editor details

- **Title is the first h1.** No separate title input. The first `<h1>` in the document IS the document title. Empty docs are seeded with `<h1></h1><p></p>` so the placeholder can target both nodes.
- **Read-only preview mode:** when `previewVersion` is set, `editor.setEditable(false)` and the content swaps to the preview. `onUpdate` early-returns. `App.tsx` renders a sticky `VersionPreviewBanner` above the editor with **Restore** + **Back to current** buttons.
- **Editor padding-top is 12px** because there's no inline formatting bar anymore. The title sits right at the top of the scroll area. Sticky `EditorActions` overlays it with a gradient fade.

---

## Layout decisions

### Floating panels with hairline shell

The outer body has a `--bg-shell` color that's barely darker than the panel background. Each panel (sidebar, editor, comments drawer, history drawer) is a rounded card (`border-radius: 12px`) with a 1px border and a soft shadow, with 6px gaps between them. The "shell" peeks through the gaps as a hairline.

**This was iterated heavily.** Earlier versions had stronger contrast and the user called it a "black bar at the top". The current values are deliberately subtle:

```
:root              { --bg-shell: #f3f0e7; --bg: #fdfcf9; --bg-sidebar: #f8f6ef; }
html.dark          { --bg-shell: #0e0e10; --bg: #16161a; --bg-sidebar: #1a1a1e; }
```

The gap between panels is 6px, the top drag spacer is 6px, and the panel radius is 12px. Don't bump the shell saturation without testing in dark mode.

### Title bar — fully overlay

`tauri.conf.json`:
```json
"titleBarStyle": "Overlay",
"hiddenTitle": true,
"trafficLightPosition": { "x": 16, "y": 16 }
```

The native macOS title bar is gone. Traffic lights overlay the top-left of the window. Each panel has a small drag region at the top so you can grab the window from anywhere along the top edge. The sidebar's brand row has `pl-[68px]` to clear the lights.

**This caused weeks (well, hours) of debugging.** Earlier we had this enabled, then disabled because clicks weren't working — that turned out to be unrelated (it was actually a `tokio` direct dep + `tauri-plugin-http` runtime conflict in Rust that was blocking the main event loop). After we fixed the Rust side, we re-enabled Overlay safely.

### Right drawer — responsive

In `App.tsx`:
- **Window width ≥ 1200px**: comments / version-history drawer is an inline floating card column.
- **Window width < 1200px**: it becomes a modal slide-over from the right with a dimmed backdrop.

---

## Cloud + auth

### How auth currently works

The desktop **shares the CLI's config file** at `~/.orfc/config.json`. On boot, `auth-store.hydrate()` reads it via `tauri-plugin-fs` (`BaseDirectory.Home`). If `apiKey` is present, the store enters `signed-in` state and the rest of the app can hit cloud APIs.

**To sign in: run `orfc login` in your terminal.** The CLI does the OAuth-device-style flow with a localhost callback server, opens the browser, and writes the key to the shared config. The desktop picks it up on next boot (or you can restart the app).

### Why in-app sign-in is currently disabled

We had a working in-app login that called a Rust `login_flow` command (mirroring the CLI's localhost-callback approach via `tiny_http`). It needed a `tokio` direct dependency for `spawn_blocking`. **That tokio dependency conflicted with Tauri 2's internal tokio runtime and broke the main event loop** — the entire window stopped receiving clicks and keyboard input. Took a while to bisect.

The fix was to **rip out** `tauri-plugin-http`, `tiny_http`, and direct `tokio` from `Cargo.toml`, and revert `lib.rs` to just the three core plugins (`fs`, `dialog`, `shell`). The `signIn()` action in `auth-store.ts` now throws an error telling the user to run `orfc login`.

**To re-add in-app login**, you need to do the listener in a way that doesn't pull in a second tokio runtime. Options:
1. Use `std::net::TcpListener` + a hand-rolled HTTP parser in a `std::thread`, with a `std::sync::mpsc` channel to send the result back. No tokio.
2. Use Tauri's own async runtime via `tauri::async_runtime::spawn` — it's the same tokio runtime Tauri uses internally, no conflict.
3. Open a separate Tauri webview that loads `orfc.dev/auth/cli-callback` and listen for a `postMessage` event from inside it.

### CORS workaround

Tauri 2's webview runs at a custom origin (`tauri://localhost` or similar), so `fetch("https://www.orfc.dev/api/...")` hits CORS. The fix lives in `vite.config.ts`:

```ts
server: {
  proxy: {
    "/api": {
      target: "https://www.orfc.dev",
      changeOrigin: true,
      secure: true,
    },
  },
}
```

And in `auth-store.ts → buildClient`:

```ts
const isDev = typeof window !== "undefined" && window.location.hostname === "localhost";
const base = isDev ? "" : config.apiUrl;
return new ApiClient({ apiUrl: base, apiKey: config.apiKey });
```

In dev, `@orfc/api`'s client makes relative `/api/*` requests that Vite proxies to orfc.dev. **In production builds this proxy doesn't exist** and the app will need a different CORS strategy. Options:
1. Add CORS headers to the orfc.dev API routes (`Access-Control-Allow-Origin: tauri://localhost`).
2. Use `tauri-plugin-http` for fetches (but watch for the tokio conflict — see above).
3. Bundle requests through a Rust command that proxies via reqwest.

This is **a known gap before shipping a `.app` to users**.

### `@orfc/api` package gotcha

The shared `@orfc/api` package is built as **CommonJS** because the CLI consumes it as a Node module. Vite/Rollup can't statically analyze CJS exports for ESM tree-shaking, so importing `ApiClient` from `@orfc/api/dist/index.js` fails with `"ApiClient" is not exported`.

**Fix:** there's a browser entry at `packages/api/src/browser.ts` that re-exports `ApiClient` + types **without** the Node-only `config.ts` (which uses `fs`, `os`, `path`). The desktop's `vite.config.ts` aliases `@orfc/api` to that file:

```ts
"@orfc/api": path.resolve(__dirname, "../../packages/api/src/browser.ts"),
```

If you ever rebuild `@orfc/api` to ESM dual-export, you can drop this alias. Until then, **don't import `loadConfig`/`saveConfig`/etc. from `@orfc/api` in the desktop app** — they live in the omitted `config.ts`. Use `apps/desktop/src/lib/orfc-config.ts` instead, which uses `tauri-plugin-fs` to read the same file.

---

## Markdown round-tripping

We use **`marked`** for markdown → HTML and **`turndown` + `turndown-plugin-gfm`** for HTML → markdown.

`marked` is in GFM mode by default — tables, strikethrough, task lists, autolinks. `turndown` needs the GFM plugin for tables/strikethrough; we add a custom rule for task lists to preserve `- [ ]` / `- [x]` syntax.

The round-trip is **lossy in whitespace and trivia** but should preserve all semantic content. If a user types `- foo` and saves, on reload it round-trips through Tiptap and might come back as `- foo` with slightly different surrounding newlines. That's why `reconcileSyncedContent` exists — see above.

---

## Keyboard shortcuts (global, registered in `App.tsx`)

| Combo | Action |
|---|---|
| `⌘K` | Command palette |
| `⌘N` | New document |
| `⌘O` | Open file from disk |
| `⌘S` / `⌘⇧S` | Save / Save As |
| `⌘P` | Publish (or open auth modal if not signed in) |
| `⌘\` | Toggle sidebar |
| `⌘⇧F` | Toggle focus mode |
| `⌘⇧L` | Toggle theme |
| `⌘⇧C` | Comments drawer (only if cloud-synced) |
| `⌘⇧H` | Version history drawer (only if cloud-synced) |
| `Esc` | Exit focus mode |

Editor-scoped (registered in `Editor.tsx` — only fire when editor has focus):

| Combo | Action |
|---|---|
| `⌘1` / `⌘2` / `⌘3` / `⌘4` | Heading levels |
| `⌘0` | Paragraph |
| `⌘;` | Code block |
| `⌘⇧7` / `⌘⇧8` / `⌘⇧9` | Numbered / Bullet / Task list |
| `⌘⇧.` | Blockquote |
| `⌘B` / `⌘I` / `⌘⇧S` | Bold / Italic / Strike (from StarterKit) |
| `/` | Slash command menu |

---

## Dev workflow

Run from repo root:

```bash
npm run tauri dev --workspace @orfc/desktop
```

That spawns Vite (port 1420) + cargo + the Tauri window. Hot-reload works for JS/CSS. Rust changes require restart.

**If a previous run left a zombie**: `lsof -ti:1420 | xargs kill -9 ; pkill -f orfc-desktop`. Vite refusing to start on port 1420 is the symptom.

For raw Vite (no Tauri window — useful for debugging in Chrome DevTools):

```bash
npm run dev --workspace @orfc/desktop
# then open http://localhost:1420 in Safari/Chrome
```

This was how we bisected the "blank screen / nothing clickable" bug — running in a real browser confirmed React was fine and the issue was in Tauri.

To open DevTools inside the Tauri window, press **⌘⌥I** (the `devtools` Tauri feature is enabled in `Cargo.toml`).

---

## Outstanding work

1. **In-app sign-in** — currently a stub. See the auth section above for the path forward (use `tauri::async_runtime` instead of a direct tokio dep, or open a sub-webview).
2. **Production CORS strategy** — the Vite proxy only works in dev. Pick one of the three options in the auth section before `tauri build`.
3. **Document settings panel** — editing access rules / allowed-viewers / deletion AFTER publishing isn't surfaced anywhere except the publish dialog (which is one-shot). Should be a settings modal accessible via the command palette + a gear icon in `EditorActions`. The cloud store already has `updateAccess(planId, ...)` and the API client supports it — just need the UI.
4. **Selection-based formatting bubble** — we removed Tiptap's `BubbleMenu` because of a tippy.js / WebKit interaction. A manually-positioned floating toolbar that appears on text selection would round out the formatting story. The slash menu only handles new blocks, not transforming existing selections.
5. **Pull-from-cloud refresh** — when a cloud doc is open and the cloud version moves ahead (someone else published a new version), the local doc has no way to know. The editor store has a `conflict` syncState slot ready but the detection logic isn't wired. Could poll versions periodically or add a manual "Pull latest" command.
6. **File association in production** — `tauri.conf.json` declares the `.md` association under `bundle.fileAssociations`, and `lib.rs` listens for `RunEvent::Opened { urls }` to forward to JS. **This only works after `tauri build` and installing the `.app`** — Finder needs the bundle in `/Applications`. In dev mode the only way to open a file is `⌘O`.
7. **Bundle size** — the JS bundle is ~660 KB minified (200 KB gzipped). Mostly Tiptap and prosemirror. Code-splitting via `import()` would help. Not urgent.

---

## Things that bit us — don't repeat

- **`titleBarStyle: "Overlay"` is fine.** The earlier "clicks don't work" issue with this enabled was actually a tokio runtime conflict in Rust, not a webview issue. Keep Overlay on.
- **Don't add `tokio` as a direct dep in `apps/desktop/src-tauri/Cargo.toml`.** Tauri ships its own. Use `tauri::async_runtime` if you need async helpers.
- **Don't add `tauri-plugin-http` lightly.** It worked for fetches but the plugin's Rust side seemed to interact badly with our event loop. The Vite dev proxy handles dev; pick a different prod CORS path.
- **Don't drop `reconcileSyncedContent` or `lastEmittedRef`** in the Editor — see the cloud-sync false-dirty section. There's a test you should add for this if you ever set up a test runner: open a cloud doc, assert Publish is hidden, type one char, assert Publish appears.
- **Don't use Tiptap's `BubbleMenu`** — the tippy.js dependency caused click-event swallowing in Tauri's WebKit. Build a custom selection toolbar with manual positioning if you want one.
- **`@orfc/api` is CJS.** Use the `browser.ts` alias in `vite.config.ts`. Don't import Node-only helpers into the desktop.
- **`apps/desktop/src-tauri/icons/` must exist** before `cargo run`. If they're missing, `tauri::generate_context!()` panics with "failed to open icon". Generate with `npx tauri icon ../web/app/icon.svg` from `apps/desktop/`.
- **Always restart Tauri dev fully when `tauri.conf.json` or any Rust file changes.** HMR won't pick up Rust-side changes.

---

## One-line recap

This is a Tauri 2 + Tiptap v3 markdown editor that shares auth and cloud state with the orfc CLI, with a Notion-style slash-menu and a Mac-native floating-card UI, where the document title is the first h1, the publish button only appears when there are real local changes, and the right drawers responsively become modal overlays on narrow windows.
