import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import type { SuggestionProps, SuggestionKeyDownProps } from "@tiptap/suggestion";
import type { SlashCommandItem } from "./SlashCommands";

export interface SlashMenuRef {
  onKeyDown: (args: SuggestionKeyDownProps) => boolean;
}

interface SlashMenuProps extends SuggestionProps<SlashCommandItem> {}

export const SlashMenu = forwardRef<SlashMenuRef, SlashMenuProps>(
  function SlashMenu(props, ref) {
    const items = props.items as SlashCommandItem[];
    const [cursor, setCursor] = useState(0);
    const listRef = useRef<HTMLDivElement>(null);

    // Reset cursor whenever the filtered list changes
    useEffect(() => {
      setCursor(0);
    }, [items]);

    const grouped = useMemo(() => {
      const map: Record<string, SlashCommandItem[]> = {};
      for (const item of items) {
        if (!map[item.group]) map[item.group] = [];
        map[item.group].push(item);
      }
      return map;
    }, [items]);
    const groups = Object.keys(grouped);

    const select = (index: number) => {
      const item = items[index];
      if (item) props.command(item);
    };

    useImperativeHandle(ref, () => ({
      onKeyDown: ({ event }) => {
        if (event.key === "ArrowDown") {
          setCursor((c) => (c + 1) % Math.max(items.length, 1));
          return true;
        }
        if (event.key === "ArrowUp") {
          setCursor((c) => (c - 1 + items.length) % Math.max(items.length, 1));
          return true;
        }
        if (event.key === "Enter") {
          select(cursor);
          return true;
        }
        return false;
      },
    }));

    // Scroll selected item into view
    useEffect(() => {
      const el = listRef.current?.querySelector<HTMLElement>(
        `[data-slash-idx="${cursor}"]`
      );
      el?.scrollIntoView({ block: "nearest" });
    }, [cursor]);

    if (items.length === 0) {
      return (
        <div
          className="anim-fade-scale"
          style={{
            width: 320,
            background: "var(--bg-elevated)",
            border: "1px solid var(--border)",
            borderRadius: 12,
            boxShadow: "var(--shadow-lg)",
            padding: "14px 16px",
            color: "var(--fg-tertiary)",
            fontSize: 12.5,
          }}
        >
          No matching block. Press Esc to dismiss.
        </div>
      );
    }

    return (
      <div
        className="anim-fade-scale"
        style={{
          width: 320,
          background: "var(--bg-elevated)",
          border: "1px solid var(--border)",
          borderRadius: 12,
          boxShadow: "var(--shadow-lg)",
          overflow: "hidden",
          fontFamily: "inherit",
        }}
      >
        <div
          ref={listRef}
          style={{ maxHeight: 320, overflowY: "auto", padding: "4px 0" }}
        >
          {groups.map((group) => (
            <div key={group}>
              <div
                className="px-3 pt-2 pb-1 text-[10px] uppercase tracking-[0.12em] font-semibold"
                style={{ color: "var(--fg-tertiary)" }}
              >
                {group}
              </div>
              {grouped[group].map((item) => {
                const idx = items.indexOf(item);
                const selected = idx === cursor;
                return (
                  <button
                    key={item.title}
                    data-slash-idx={idx}
                    onMouseEnter={() => setCursor(idx)}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      select(idx);
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2 text-left transition-colors"
                    style={{
                      background: selected ? "var(--bg-active)" : "transparent",
                    }}
                  >
                    <span
                      className="flex items-center justify-center shrink-0"
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 8,
                        background: selected
                          ? "var(--accent-soft)"
                          : "var(--bg-sidebar)",
                        color: selected ? "var(--accent)" : "var(--fg-secondary)",
                        border: "1px solid var(--border-subtle)",
                      }}
                    >
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d={item.icon} />
                      </svg>
                    </span>
                    <span className="flex-1 min-w-0">
                      <span
                        className="block text-[12.5px] font-semibold truncate"
                        style={{ color: "var(--fg)" }}
                      >
                        {item.title}
                      </span>
                      <span
                        className="block text-[11px] truncate mt-0.5"
                        style={{ color: "var(--fg-tertiary)" }}
                      >
                        {item.description}
                      </span>
                    </span>
                    {item.shortcut && (
                      <kbd
                        className="font-mono text-[10px] px-1.5 py-0.5 rounded shrink-0"
                        style={{
                          background: "var(--bg-sidebar)",
                          border: "1px solid var(--border-subtle)",
                          color: "var(--fg-tertiary)",
                        }}
                      >
                        {item.shortcut}
                      </kbd>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
        <div
          className="flex items-center justify-between px-3 py-1.5 text-[10px]"
          style={{
            borderTop: "1px solid var(--border-subtle)",
            background: "var(--bg-sidebar)",
            color: "var(--fg-tertiary)",
          }}
        >
          <span>↑↓ navigate · ↵ insert</span>
          <span>esc close</span>
        </div>
      </div>
    );
  }
);
