"use client";

import { useState, useEffect } from "react";

type VersionSummary = {
  id: string;
  version: number;
  title: string | null;
  authorEmail: string | null;
  createdAt: string;
};

type DiffLine = {
  type: "add" | "remove" | "same";
  content: string;
};

export function VersionHistory({
  planId,
  currentVersion,
  onClose,
}: {
  planId: string;
  currentVersion?: number;
  onClose: () => void;
}) {
  const [versions, setVersions] = useState<VersionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVersion, setSelectedVersion] = useState<string | null>(null);
  const [versionContent, setVersionContent] = useState<string | null>(null);
  const [diff, setDiff] = useState<DiffLine[] | null>(null);
  const [viewMode, setViewMode] = useState<"content" | "diff">("diff");
  const [liveCurrentVersion, setLiveCurrentVersion] = useState(currentVersion);

  useEffect(() => {
    async function fetchVersions() {
      const res = await fetch(`/api/plans/${planId}/versions`);
      if (res.ok) {
        const data = await res.json();
        setVersions(data.versions);
        setLiveCurrentVersion(data.currentVersion);
      }
      setLoading(false);
    }
    fetchVersions();
  }, [planId]);

  const handleSelectVersion = async (versionId: string) => {
    setSelectedVersion(versionId);
    setVersionContent(null);
    setDiff(null);

    if (viewMode === "content") {
      const res = await fetch(`/api/plans/${planId}/versions/${versionId}`);
      if (res.ok) {
        const data = await res.json();
        setVersionContent(data.content);
      }
    } else {
      const res = await fetch(
        `/api/plans/${planId}/diff?from=${versionId}&to=current`
      );
      if (res.ok) {
        const data = await res.json();
        setDiff(data.diff);
      }
    }
  };

  const switchViewMode = async (mode: "content" | "diff") => {
    setViewMode(mode);
    if (!selectedVersion) return;

    setVersionContent(null);
    setDiff(null);

    if (mode === "content") {
      const res = await fetch(
        `/api/plans/${planId}/versions/${selectedVersion}`
      );
      if (res.ok) {
        const data = await res.json();
        setVersionContent(data.content);
      }
    } else {
      const res = await fetch(
        `/api/plans/${planId}/diff?from=${selectedVersion}&to=current`
      );
      if (res.ok) {
        const data = await res.json();
        setDiff(data.diff);
      }
    }
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  return (
    <div className="w-[340px] shrink-0 border-l border-[var(--border-light)] bg-white h-[calc(100vh-53px)] sticky top-[53px] flex flex-col">
      {/* Header */}
      <div className="px-4 py-3 border-b border-[var(--border-light)] flex items-center justify-between">
        <h3 className="text-[13px] font-semibold font-sans text-[var(--fg)]">
          Version History
        </h3>
        <button
          onClick={onClose}
          className="text-[var(--muted)] hover:text-[var(--fg)] transition-colors"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>

      {loading ? (
        <div className="p-4 text-[13px] text-[var(--muted)] font-sans animate-pulse">
          Loading…
        </div>
      ) : versions.length === 0 ? (
        <div className="p-4 text-[13px] text-[var(--muted)] font-sans">
          No previous versions yet.
          {liveCurrentVersion && liveCurrentVersion > 1
            ? ""
            : " Versions are created when the document is updated."}
        </div>
      ) : (
        <>
          {/* Version list */}
          <div className="flex-1 overflow-y-auto">
            {/* Current version indicator */}
            <div className="px-4 py-2 border-b border-[var(--border-light)]">
              <div className="text-[12px] font-sans text-[var(--fg-secondary)] font-medium">
                Current — v{liveCurrentVersion}
              </div>
            </div>

            {versions.map((v) => (
              <button
                key={v.id}
                onClick={() => handleSelectVersion(v.id)}
                className={`w-full text-left px-4 py-3 border-b border-[var(--border-light)] hover:bg-gray-50 transition-colors ${
                  selectedVersion === v.id ? "bg-blue-50" : ""
                }`}
              >
                <div className="text-[13px] font-sans font-medium text-[var(--fg)]">
                  v{v.version}
                  {v.title && (
                    <span className="font-normal text-[var(--muted)] ml-1.5">
                      — {v.title}
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-[var(--muted)] font-sans mt-0.5">
                  {formatDate(v.createdAt)}
                  {v.authorEmail && ` · ${v.authorEmail}`}
                </div>
              </button>
            ))}
          </div>

          {/* Selected version content/diff */}
          {selectedVersion && (
            <div className="border-t border-[var(--border-light)] flex-1 overflow-y-auto min-h-[200px] max-h-[50vh]">
              {/* Toggle tabs */}
              <div className="flex border-b border-[var(--border-light)] sticky top-0 bg-white">
                <button
                  onClick={() => switchViewMode("diff")}
                  className={`flex-1 text-[12px] font-sans py-2 transition-colors ${
                    viewMode === "diff"
                      ? "text-[var(--fg)] font-medium border-b-2 border-[var(--fg)]"
                      : "text-[var(--muted)] hover:text-[var(--fg)]"
                  }`}
                >
                  Diff
                </button>
                <button
                  onClick={() => switchViewMode("content")}
                  className={`flex-1 text-[12px] font-sans py-2 transition-colors ${
                    viewMode === "content"
                      ? "text-[var(--fg)] font-medium border-b-2 border-[var(--fg)]"
                      : "text-[var(--muted)] hover:text-[var(--fg)]"
                  }`}
                >
                  Source
                </button>
              </div>

              <div className="p-3">
                {viewMode === "diff" && diff && (
                  <pre className="text-[11px] font-mono leading-relaxed whitespace-pre-wrap break-words">
                    {diff.map((line, i) => (
                      <div
                        key={i}
                        className={`px-1 ${
                          line.type === "add"
                            ? "bg-green-50 text-green-800"
                            : line.type === "remove"
                            ? "bg-red-50 text-red-800"
                            : "text-[var(--muted)]"
                        }`}
                      >
                        <span className="select-none opacity-50 mr-1">
                          {line.type === "add"
                            ? "+"
                            : line.type === "remove"
                            ? "-"
                            : " "}
                        </span>
                        {line.content}
                      </div>
                    ))}
                  </pre>
                )}
                {viewMode === "diff" && !diff && (
                  <div className="text-[12px] text-[var(--muted)] font-sans animate-pulse">
                    Loading diff…
                  </div>
                )}
                {viewMode === "content" && versionContent !== null && (
                  <pre className="text-[11px] font-mono leading-relaxed whitespace-pre-wrap break-words text-[var(--fg)]">
                    {versionContent}
                  </pre>
                )}
                {viewMode === "content" && versionContent === null && (
                  <div className="text-[12px] text-[var(--muted)] font-sans animate-pulse">
                    Loading…
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
