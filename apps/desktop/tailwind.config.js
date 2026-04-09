/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "Inter",
          "Inter Variable",
          "-apple-system",
          "BlinkMacSystemFont",
          "Helvetica Neue",
          "system-ui",
          "sans-serif",
        ],
        serif: [
          "Source Serif 4",
          "Source Serif Pro",
          "Iowan Old Style",
          "Charter",
          "Georgia",
          "serif",
        ],
        mono: [
          "JetBrains Mono",
          "SF Mono",
          "Fira Code",
          "Berkeley Mono",
          "ui-monospace",
          "Menlo",
          "monospace",
        ],
      },
      colors: {
        bg: "var(--bg)",
        sidebar: "var(--bg-sidebar)",
        surface: "var(--bg-surface)",
        elevated: "var(--bg-elevated)",
        fg: {
          DEFAULT: "var(--fg)",
          secondary: "var(--fg-secondary)",
          tertiary: "var(--fg-tertiary)",
          muted: "var(--muted)",
        },
        line: {
          DEFAULT: "var(--border)",
          subtle: "var(--border-subtle)",
          faint: "var(--border-faint)",
        },
        accent: {
          DEFAULT: "var(--accent)",
          soft: "var(--accent-soft)",
        },
        gold: "var(--gold)",
      },
      boxShadow: {
        sm: "var(--shadow-sm)",
        md: "var(--shadow-md)",
        lg: "var(--shadow-lg)",
        glow: "var(--shadow-glow)",
      },
    },
  },
  plugins: [],
};
