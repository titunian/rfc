"use client";

import { useSession, signIn, signOut } from "next-auth/react";
import { useState } from "react";

export function AuthBar() {
  const { data: session, status } = useSession();
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  if (status === "loading") return null;

  if (!session) {
    return (
      <button
        onClick={() => signIn("google")}
        className="text-sm px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
      >
        Sign in with Google
      </button>
    );
  }

  const generateKey = async () => {
    setGenerating(true);
    try {
      const res = await fetch("/api/auth/key", { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setApiKey(data.key);
      }
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="flex items-center gap-4">
      {apiKey ? (
        <div className="flex items-center gap-2">
          <code className="text-xs bg-green-50 text-green-800 border border-green-200 px-3 py-1.5 rounded-md font-mono select-all">
            {apiKey}
          </code>
          <button
            onClick={() => {
              navigator.clipboard.writeText(apiKey);
            }}
            className="text-xs text-[var(--muted)] hover:text-[var(--fg)]"
          >
            Copy
          </button>
        </div>
      ) : (
        <button
          onClick={generateKey}
          disabled={generating}
          className="text-sm px-3 py-1.5 border border-[var(--border)] rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          {generating ? "Generating..." : "Generate API Key"}
        </button>
      )}
      <div className="flex items-center gap-2">
        <span className="text-sm text-[var(--muted)]">
          {session.user?.name || session.user?.email}
        </span>
        <button
          onClick={() => signOut()}
          className="text-sm text-[var(--muted)] hover:text-[var(--fg)] transition-colors"
        >
          Sign out
        </button>
      </div>
    </div>
  );
}
