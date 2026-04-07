import { useEditorStore } from "../../stores/editor-store";

export function Toolbar() {
  const { fileName, isDirty } = useEditorStore();

  return (
    <header
      data-tauri-drag-region
      className="h-[52px] flex items-center justify-between px-4 border-b border-[var(--border)] bg-[var(--bg)]"
    >
      {/* Title — shows dirty state */}
      <div data-tauri-drag-region className="flex-1 text-center">
        <span className="text-[13px] font-medium text-[var(--fg-secondary)]">
          {isDirty ? `${fileName} — Edited` : fileName}
        </span>
      </div>

      {/* Sync status placeholder */}
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-[var(--muted)] opacity-30" title="Not synced" />
      </div>
    </header>
  );
}
