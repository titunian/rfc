import type { Metadata } from "next";
import { AuthProvider } from "@/components/session-provider";
import "highlight.js/styles/github-dark.css";
import "./globals.css";

// Intentionally no Google Fonts. System stacks (SF Pro Text on Apple,
// Segoe UI on Windows, system-ui elsewhere) signal "this is a tool,
// not a web app" — and small UI sizes render sharper than Inter
// imported over the wire. See globals.css for the full stack.

export const metadata: Metadata = {
  metadataBase: new URL("https://www.orfc.dev"),
  title: "orfc — open request for comments",
  description: "Publish markdown plans, get feedback from your team.",
};

// Applied before hydration to avoid FOUC when the user prefers dark mode.
const themeBootstrap = `
(function () {
  try {
    var stored = localStorage.getItem('orfc-theme');
    var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    var theme = stored || (prefersDark ? 'dark' : 'light');
    if (theme === 'dark') document.documentElement.classList.add('dark');
  } catch (e) {}
})();
`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootstrap }} />
      </head>
      <body className="antialiased font-sans">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
