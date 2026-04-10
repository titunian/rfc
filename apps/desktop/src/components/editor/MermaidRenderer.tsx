import { useEffect, useRef, useState } from "react";
import { useAppStore } from "../../stores/app-store";

let mermaidInitialized: "light" | "dark" | null = null;

export function MermaidRenderer({ code }: { code: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const theme = useAppStore((s) => s.theme);

  useEffect(() => {
    let cancelled = false;

    async function render() {
      try {
        const mermaid = (await import("mermaid")).default;

        // Re-initialize when theme changes.
        if (mermaidInitialized !== theme) {
          mermaid.initialize({
            startOnLoad: false,
            theme: theme === "dark" ? "dark" : "neutral",
            fontFamily:
              "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Helvetica Neue', sans-serif",
            fontSize: 14,
            flowchart: {
              htmlLabels: true,
              curve: "monotoneX",
              padding: 12,
            },
            themeVariables:
              theme === "dark"
                ? {
                    primaryColor: "#2a2a2a",
                    primaryBorderColor: "#444",
                    primaryTextColor: "#e0e0e0",
                    lineColor: "#888",
                    secondaryColor: "#1e1e1e",
                    tertiaryColor: "#333",
                  }
                : {
                    primaryColor: "#f0f0f0",
                    primaryBorderColor: "#d4d4d4",
                    primaryTextColor: "#1a1a1a",
                    lineColor: "#8a8a8a",
                    secondaryColor: "#f8f7f4",
                    tertiaryColor: "#fff",
                  },
          });
          mermaidInitialized = theme;
        }

        const id = `mermaid-${Math.random().toString(36).slice(2, 9)}`;
        const { svg: rendered } = await mermaid.render(id, code);

        if (!cancelled) {
          setSvg(rendered);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Failed to render diagram"
          );
        }
      }
    }

    render();
    return () => {
      cancelled = true;
    };
  }, [code, theme]);

  if (error) {
    return (
      <div className="mermaid-container mermaid-error">
        <div style={{ fontSize: "13px", color: "var(--danger, #dc2626)" }}>
          <p style={{ fontWeight: 600, marginBottom: "4px" }}>
            Diagram rendering error
          </p>
          <pre
            style={{
              fontSize: "12px",
              whiteSpace: "pre-wrap",
              margin: 0,
              background: "none",
              border: "none",
              padding: 0,
              color: "var(--danger, #dc2626)",
              opacity: 0.8,
            }}
          >
            {error}
          </pre>
        </div>
      </div>
    );
  }

  if (!svg) {
    return (
      <div className="mermaid-container">
        <div
          style={{
            fontSize: "13px",
            color: "var(--muted)",
            fontFamily: "-apple-system, sans-serif",
          }}
        >
          Rendering diagram...
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="mermaid-container"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
