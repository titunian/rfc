import { useEditorStore } from "../../stores/editor-store";
import { useAppStore } from "../../stores/app-store";

export function Sidebar() {
  const { recentFiles } = useAppStore();
  const { fileName, isDirty } = useEditorStore();

  return (
    <aside className="w-[220px] h-full bg-[var(--bg-sidebar)] border-r border-[var(--border)] flex flex-col select-none">
      {/* Drag region for macOS traffic lights */}
      <div data-tauri-drag-region className="h-[52px] flex items-end px-3 pb-2">
        <span className="text-[11px] uppercase tracking-[0.1em] text-[var(--muted)] font-medium">
          Files
        </span>
      </div>

      {/* Current file */}
      <div className="px-2 mb-2">
        <div className="px-2 py-1.5 rounded-md bg-[var(--accent-light)] text-[13px] font-medium text-[var(--fg)] truncate">
          {isDirty ? `• ${fileName}` : fileName}
        </div>
      </div>

      {/* Recent files */}
      <div className="flex-1 overflow-y-auto px-2">
        {recentFiles.length === 0 ? (
          <p className="text-[12px] text-[var(--muted)] px-2 py-4">
            No recent files. Open a file or create a new one.
          </p>
        ) : (
          <div className="space-y-0.5">
            {recentFiles.map((path) => {
              const name = path.split("/").pop() || path;
              return (
                <button
                  key={path}
                  className="w-full text-left px-2 py-1.5 rounded-md text-[13px] text-[var(--fg-secondary)] hover:bg-[var(--border)] transition-colors truncate"
                  title={path}
                >
                  {name}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Cloud section placeholder */}
      <div className="border-t border-[var(--border)] px-3 py-3">
        <span className="text-[11px] uppercase tracking-[0.1em] text-[var(--muted)] font-medium">
          Cloud
        </span>
        <p className="text-[12px] text-[var(--muted)] mt-2">
          Connect to orfc.dev to sync
        </p>
      </div>
    </aside>
  );
}
