import { useEffect, useMemo, useRef, useState } from "react";
import { useAppStore } from "../../stores/app-store";
import { useEditorStore } from "../../stores/editor-store";
import { useAuthStore } from "../../stores/auth-store";
import { useCloudStore } from "../../stores/cloud-store";
import { open as openShell } from "@tauri-apps/plugin-shell";
import { createNewFile, createNewFileFromTemplate } from "../../lib/file-ops";

type Command = {
  id: string;
  label: string;
  hint?: string;
  group: "Document" | "View" | "Cloud" | "Workflow";
  shortcut?: string;
  icon?: React.ReactNode;
  run: () => void;
};

function Icon({ path }: { path: string }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={path} />
    </svg>
  );
}

export function CommandPalette() {
  const {
    commandPaletteOpen,
    closeCommandPalette,
    toggleSidebar,
    toggleFocusMode,
    toggleTheme,
    theme,
    openAuthModal,
    openPublishDialog,
    openSettings,
    toggleRightPanel,
  } = useAppStore();
  const { content, planId, planUrl, planSlug, detachCloud } =
    useEditorStore();
  const { status: authStatus, signOut: doSignOut, email, client } =
    useAuthStore();
  const [query, setQuery] = useState("");
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Reset state when opened
  useEffect(() => {
    if (commandPaletteOpen) {
      setQuery("");
      setCursor(0);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [commandPaletteOpen]);

  const commands: Command[] = useMemo(() => {
    const list: Command[] = [
      {
        id: "new",
        label: "New document",
        hint: "Create a new .md file on disk",
        group: "Document",
        shortcut: "⌘N",
        icon: <Icon path="M12 5v14M5 12h14" />,
        run: () => void createNewFile(),
      },
      {
        id: "new-from-template",
        label: "New from template",
        hint: "Create an RFC with Overview / Details / Open Questions",
        group: "Document",
        icon: <Icon path="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M16 13H8M16 17H8M10 9H8" />,
        run: () => void createNewFileFromTemplate(),
      },
      {
        id: "open",
        label: "Open file…",
        hint: "Pick a markdown file from disk",
        group: "Document",
        shortcut: "⌘O",
        icon: (
          <Icon path="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
        ),
        run: () => window.dispatchEvent(new CustomEvent("orfc:open")),
      },
      {
        id: "save",
        label: "Save to disk",
        hint: "Write this document to a .md file",
        group: "Document",
        shortcut: "⌘S",
        icon: (
          <Icon path="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2zM17 21v-8H7v8M7 3v5h8" />
        ),
        run: () => window.dispatchEvent(new CustomEvent("orfc:save")),
      },
      {
        id: "word-count",
        label: `Word count: ${content.split(/\s+/).filter(Boolean).length}`,
        hint: "Current document statistics",
        group: "Document",
        icon: <Icon path="M4 6h16M4 12h16M4 18h12" />,
        run: () => {
          /* no-op info row */
        },
      },
      {
        id: "publish",
        label: planId ? "Publish update" : "Publish to orfc.dev",
        hint: planId
          ? "Push a new version"
          : "Create a shareable URL for this draft",
        group: "Cloud",
        shortcut: "⌘P",
        icon: (
          <Icon path="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" />
        ),
        run: () => {
          if (authStatus !== "signed-in") openAuthModal();
          else openPublishDialog();
        },
      },
    ];

    // Cloud-plan-scoped commands
    if (planId) {
      list.push(
        {
          id: "pull-latest",
          label: "Pull latest from cloud",
          hint: "Fetch the newest version from orfc.dev",
          group: "Cloud",
          shortcut: "⌘⇧R",
          icon: (
            <Icon path="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
          ),
          run: () => {
            void useCloudStore.getState().pullLatest(planId);
          },
        },
        {
          id: "comments",
          label: "Show comments",
          hint: "Open the comments panel",
          group: "Cloud",
          shortcut: "⌘⇧C",
          icon: (
            <Icon path="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          ),
          run: () => toggleRightPanel("comments"),
        },
        {
          id: "history",
          label: "Show version history",
          hint: "Browse past versions",
          group: "Cloud",
          shortcut: "⌘⇧H",
          icon: <Icon path="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" />,
          run: () => toggleRightPanel("history"),
        },
        {
          id: "settings",
          label: "Document settings",
          hint: "Manage permissions and access",
          group: "Cloud",
          shortcut: "⌘,",
          icon: (
            <Icon path="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z" />
          ),
          run: () => openSettings(),
        }
      );
      if (planUrl) {
        list.push(
          {
            id: "open-in-browser",
            label: "Open in browser",
            hint: planUrl,
            group: "Cloud",
            icon: (
              <Icon path="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14 21 3" />
            ),
            run: () => {
              void openShell(planUrl);
            },
          },
          {
            id: "copy-link",
            label: "Copy link",
            hint: planSlug ? `orfc.dev/p/${planSlug}` : planUrl,
            group: "Cloud",
            icon: (
              <Icon path="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
            ),
            run: () => {
              navigator.clipboard.writeText(planUrl).catch(() => {});
            },
          },
          {
            id: "delete-plan",
            label: "Delete from cloud",
            hint: "Permanently delete this published plan",
            group: "Cloud",
            icon: (
              <Icon path="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6h14z" />
            ),
            run: async () => {
              if (!client || !planId) return;
              const ok = window.confirm(
                "Delete this plan from orfc.dev? This cannot be undone."
              );
              if (!ok) return;
              try {
                await client.deletePlan(planId);
                detachCloud();
                void useCloudStore.getState().fetchPlans();
              } catch (e) {
                console.error("delete failed", e);
              }
            },
          }
        );
      }

      // Workflow status commands
      list.push(
        {
          id: "status-review",
          label: "Set status: Review",
          hint: "Move this plan to review",
          group: "Workflow",
          icon: <Icon path="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" />,
          run: () => void useCloudStore.getState().updateStatus(planId, "review"),
        },
        {
          id: "status-approved",
          label: "Set status: Approved",
          hint: "Mark this plan as approved",
          group: "Workflow",
          icon: <Icon path="M9 12l2 2 4-4m6 2a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" />,
          run: () => void useCloudStore.getState().updateStatus(planId, "approved"),
        },
        {
          id: "status-executing",
          label: "Set status: Executing",
          hint: "Mark this plan as in execution",
          group: "Workflow",
          icon: <Icon path="M13 10V3L4 14h7v7l9-11h-7z" />,
          run: () => void useCloudStore.getState().updateStatus(planId, "executing"),
        },
        {
          id: "status-done",
          label: "Set status: Done",
          hint: "Mark this plan as complete",
          group: "Workflow",
          icon: <Icon path="M20 6L9 17l-5-5" />,
          run: () => void useCloudStore.getState().updateStatus(planId, "done"),
        }
      );
    }

    // Auth
    if (authStatus !== "signed-in") {
      list.push({
        id: "signin",
        label: "Sign in to orfc.dev",
        hint: "Connect your account",
        group: "Cloud",
        icon: <Icon path="M10 17l5-5-5-5M15 12H3M21 19V5a2 2 0 0 0-2-2h-4" />,
        run: () => openAuthModal(),
      });
    } else {
      list.push({
        id: "signout",
        label: `Sign out ${email ? `(${email})` : ""}`.trim(),
        hint: "Remove stored API key",
        group: "Cloud",
        icon: <Icon path="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />,
        run: () => void doSignOut(),
      });
    }

    // View
    list.push(
      {
        id: "focus",
        label: "Toggle focus mode",
        hint: "Distraction-free writing",
        group: "View",
        shortcut: "⌘⇧F",
        icon: (
          <Icon path="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
        ),
        run: () => toggleFocusMode(),
      },
      {
        id: "sidebar",
        label: "Toggle sidebar",
        hint: "Show or hide the document list",
        group: "View",
        shortcut: "⌘\\",
        icon: <Icon path="M3 4h18v16H3zM9 4v16" />,
        run: () => toggleSidebar(),
      },
      {
        id: "theme",
        label: theme === "dark" ? "Switch to light mode" : "Switch to dark mode",
        hint: "Change appearance",
        group: "View",
        shortcut: "⌘⇧L",
        icon:
          theme === "dark" ? (
            <Icon path="M12 3v2.25M18.364 5.636l-1.591 1.591M21 12h-2.25M18.364 18.364l-1.591-1.591M12 18.75V21M7.227 16.773l-1.591 1.591M5.25 12H3M7.227 7.227 5.636 5.636M15.75 12a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0z" />
          ) : (
            <Icon path="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
          ),
        run: () => toggleTheme(),
      }
    );

    return list;
  }, [
    content,
    planId,
    planUrl,
    planSlug,
    detachCloud,
    client,
    authStatus,
    email,
    openAuthModal,
    openPublishDialog,
    openSettings,
    toggleRightPanel,
    toggleFocusMode,
    toggleSidebar,
    toggleTheme,
    doSignOut,
    theme,
  ]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return commands;
    return commands.filter(
      (c) =>
        c.label.toLowerCase().includes(q) ||
        c.group.toLowerCase().includes(q) ||
        c.hint?.toLowerCase().includes(q)
    );
  }, [commands, query]);

  // Keep cursor in bounds when filter changes
  useEffect(() => {
    if (cursor >= filtered.length) setCursor(0);
  }, [filtered.length, cursor]);

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setCursor((c) => (c + 1) % Math.max(filtered.length, 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setCursor((c) => (c - 1 + filtered.length) % Math.max(filtered.length, 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const cmd = filtered[cursor];
      if (cmd) {
        cmd.run();
        if (cmd.id !== "word-count") closeCommandPalette();
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      closeCommandPalette();
    }
  };

  // Scroll selected item into view
  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>(
      `[data-cmd-idx="${cursor}"]`
    );
    el?.scrollIntoView({ block: "nearest" });
  }, [cursor]);

  if (!commandPaletteOpen) return null;

  // Group filtered results
  const grouped: Record<string, Command[]> = {};
  filtered.forEach((c) => {
    if (!grouped[c.group]) grouped[c.group] = [];
    grouped[c.group].push(c);
  });
  const groups = Object.keys(grouped);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center"
      style={{
        paddingTop: "16vh",
        background: "var(--overlay)",
        backdropFilter: "blur(6px)",
        WebkitBackdropFilter: "blur(6px)",
      }}
      onClick={closeCommandPalette}
    >
      <div
        className="anim-fade-scale"
        style={{
          width: 560,
          maxWidth: "calc(100vw - 48px)",
          background: "var(--bg-elevated)",
          border: "1px solid var(--border)",
          borderRadius: 12,
          boxShadow: "var(--shadow-lg)",
          overflow: "hidden",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search */}
        <div
          className="flex items-center gap-2.5 px-4"
          style={{
            borderBottom: "1px solid var(--border-subtle)",
            height: 48,
          }}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ color: "var(--muted)", flexShrink: 0 }}
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Type a command or search…"
            className="flex-1 bg-transparent outline-none text-[14px] placeholder:font-normal"
            style={{
              color: "var(--fg)",
            }}
          />
          <kbd
            className="font-mono text-[10px] px-1.5 py-0.5 rounded"
            style={{
              background: "var(--bg-sidebar)",
              border: "1px solid var(--border-subtle)",
              color: "var(--fg-tertiary)",
            }}
          >
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div
          ref={listRef}
          className="py-1.5"
          style={{ maxHeight: 420, overflowY: "auto" }}
        >
          {filtered.length === 0 ? (
            <div
              className="px-4 py-8 text-center text-[13px]"
              style={{ color: "var(--fg-tertiary)" }}
            >
              No matching commands
            </div>
          ) : (
            groups.map((group) => {
              return (
                <div key={group} className="pt-1 pb-1">
                  <div
                    className="px-4 pt-1 pb-1 text-[10px] uppercase tracking-[0.12em] font-semibold"
                    style={{ color: "var(--fg-tertiary)" }}
                  >
                    {group}
                  </div>
                  {grouped[group].map((cmd) => {
                    const idx = filtered.indexOf(cmd);
                    const selected = idx === cursor;
                    return (
                      <button
                        key={cmd.id}
                        data-cmd-idx={idx}
                        onMouseEnter={() => setCursor(idx)}
                        onClick={() => {
                          cmd.run();
                          if (cmd.id !== "word-count") closeCommandPalette();
                        }}
                        className="w-full flex items-center gap-3 px-4 py-2 text-left transition-colors"
                        style={{
                          background: selected ? "var(--bg-active)" : "transparent",
                          color: "var(--fg)",
                        }}
                      >
                        <span
                          className="flex items-center justify-center shrink-0"
                          style={{
                            width: 22,
                            height: 22,
                            borderRadius: 5,
                            background: selected
                              ? "var(--accent-soft)"
                              : "var(--bg-sidebar)",
                            color: selected ? "var(--accent)" : "var(--fg-secondary)",
                          }}
                        >
                          {cmd.icon}
                        </span>
                        <span className="flex-1 min-w-0">
                          <span
                            className="block text-[13px] font-medium truncate"
                            style={{ color: "var(--fg)" }}
                          >
                            {cmd.label}
                          </span>
                          {cmd.hint && (
                            <span
                              className="block text-[11.5px] truncate mt-0.5"
                              style={{ color: "var(--fg-tertiary)" }}
                            >
                              {cmd.hint}
                            </span>
                          )}
                        </span>
                        {cmd.shortcut && (
                          <kbd
                            className="font-mono text-[10px] px-1.5 py-0.5 rounded shrink-0"
                            style={{
                              background: "var(--bg-sidebar)",
                              border: "1px solid var(--border-subtle)",
                              color: "var(--fg-tertiary)",
                            }}
                          >
                            {cmd.shortcut}
                          </kbd>
                        )}
                      </button>
                    );
                  })}
                </div>
              );
            })
          )}
        </div>

        {/* Footer hint */}
        <div
          className="flex items-center justify-between px-4 py-2 text-[10.5px]"
          style={{
            borderTop: "1px solid var(--border-subtle)",
            background: "var(--bg-sidebar)",
            color: "var(--fg-tertiary)",
          }}
        >
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <Kbd>↑</Kbd>
              <Kbd>↓</Kbd> navigate
            </span>
            <span className="flex items-center gap-1">
              <Kbd>↵</Kbd> run
            </span>
          </div>
          <span>orfc · command palette</span>
        </div>
      </div>
    </div>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd
      className="font-mono text-[10px] rounded"
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        minWidth: 16,
        height: 16,
        padding: "0 4px",
        background: "var(--bg)",
        border: "1px solid var(--border-subtle)",
        color: "var(--fg-secondary)",
      }}
    >
      {children}
    </kbd>
  );
}
