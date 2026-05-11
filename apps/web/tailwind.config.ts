import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        // System-native stack. SF Pro Text on Apple, Segoe UI on
        // Windows, Roboto on Android, system-ui everywhere else.
        // Smaller, sharper, and "this is a tool" — not a web app.
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          '"SF Pro Text"',
          '"Segoe UI"',
          "Roboto",
          "system-ui",
          "sans-serif",
        ],
        // Charter is on every Mac since 10.10; a great editorial
        // serif for headlines that pairs well with the sans stack.
        serif: [
          "Charter",
          '"Iowan Old Style"',
          '"Source Serif Pro"',
          "Georgia",
          "serif",
        ],
        mono: [
          '"SF Mono"',
          "SFMono-Regular",
          "Menlo",
          '"Liberation Mono"',
          "Consolas",
          "ui-monospace",
          "monospace",
        ],
      },
    },
  },
  plugins: [],
};
export default config;
