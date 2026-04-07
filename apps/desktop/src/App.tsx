import { useEffect } from "react";
import { Editor } from "./components/editor/Editor";
import { Sidebar } from "./components/sidebar/Sidebar";
import { Toolbar } from "./components/toolbar/Toolbar";
import { useEditorStore } from "./stores/editor-store";
import { useAppStore } from "./stores/app-store";

export function App() {
  const { content, setContent } = useEditorStore();
  const { sidebarOpen, focusMode, theme } = useAppStore();

  // Apply theme
  useEffect(() => {
    const root = document.documentElement;
    if (theme === "system") {
      const dark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      root.classList.toggle("dark", dark);
    } else {
      root.classList.toggle("dark", theme === "dark");
    }
  }, [theme]);

  return (
    <div className={`h-screen flex flex-col ${focusMode ? "focus-mode" : ""}`}>
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        {sidebarOpen && !focusMode && <Sidebar />}

        {/* Main editor area */}
        <div className="flex-1 flex flex-col min-w-0">
          {!focusMode && <Toolbar />}

          <main className="flex-1 overflow-y-auto bg-[var(--bg)]">
            <Editor
              content={content}
              onChange={setContent}
            />
          </main>
        </div>
      </div>
    </div>
  );
}
