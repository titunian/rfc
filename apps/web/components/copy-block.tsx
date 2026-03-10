"use client";

import { useState } from "react";

export function CopyBlock({
  content,
  label,
}: {
  content: string;
  label?: string;
}) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="relative group">
      <div className="bg-[#0d1117] rounded-xl p-5 pr-12 font-mono text-[13px] text-gray-300 leading-relaxed whitespace-pre-wrap max-h-[400px] overflow-y-auto">
        {content}
      </div>
      <button
        onClick={copy}
        className="absolute top-3 right-3 text-gray-500 hover:text-gray-300 transition-colors p-1.5 rounded-lg hover:bg-white/5"
        title={label || "Copy to clipboard"}
      >
        {copied ? (
          <svg
            className="w-4.5 h-4.5 text-green-400"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M4.5 12.75l6 6 9-13.5"
            />
          </svg>
        ) : (
          <svg
            className="w-4.5 h-4.5"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9.75a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184"
            />
          </svg>
        )}
      </button>
    </div>
  );
}
