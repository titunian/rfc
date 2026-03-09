"use client";

import { useEffect, useRef, useState } from "react";

let mermaidInitialized = false;

export function MermaidBlock({ chart }: { chart: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function render() {
      try {
        const mermaid = (await import("mermaid")).default;

        if (!mermaidInitialized) {
          mermaid.initialize({
            startOnLoad: false,
            theme: "neutral",
            fontFamily: "var(--font-inter), system-ui, sans-serif",
            fontSize: 14,
            flowchart: {
              htmlLabels: true,
              curve: "monotoneX",
              padding: 12,
            },
            themeVariables: {
              primaryColor: "#f0f0f0",
              primaryBorderColor: "#d4d4d4",
              primaryTextColor: "#1a1a1a",
              lineColor: "#8a8a8a",
              secondaryColor: "#f8f7f4",
              tertiaryColor: "#fff",
            },
          });
          mermaidInitialized = true;
        }

        const id = `mermaid-${Math.random().toString(36).slice(2, 9)}`;
        const { svg: rendered } = await mermaid.render(id, chart);

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
  }, [chart]);

  if (error) {
    return (
      <div className="mermaid-container !border-red-200 !bg-red-50">
        <div className="text-sm text-red-600 font-sans">
          <p className="font-medium mb-1">Diagram rendering error</p>
          <pre className="text-xs text-red-500 whitespace-pre-wrap !bg-transparent !shadow-none !border-none !p-0 !m-0">
            {error}
          </pre>
        </div>
      </div>
    );
  }

  if (!svg) {
    return (
      <div className="mermaid-container">
        <div className="text-sm text-[var(--muted)] font-sans animate-pulse">
          Rendering diagram…
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
