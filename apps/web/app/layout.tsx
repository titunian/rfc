import type { Metadata } from "next";
import { AuthProvider } from "@/components/session-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: "rfc — Request for Comments",
  description: "Publish markdown plans, get feedback from your team.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
