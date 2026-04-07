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

function relativeTime(iso: string): string {
  const now = Date.now();
  const then = new Date(iso).getTime();
  const seconds = Math.floor((now - then) / 1000);

  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
}

function SkeletonList() {
  return (
    <div className="p-3 space-y-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="animate-pulse">
          <div className="flex items-center gap-2 mb-1.5">
            <div className="w-8 h-5 bg-gray-100 rounded-md" />
            <div className="h-3.5 bg-gray-100 rounded w-24" />
          </div>
          <div className="h-3 bg-gray-50 rounded w-32" />
        </div>
      ))}
    </div>
  );
}

function SkeletonDiff() {
  return (
    <div className="p-3 space-y-1 animate-pulse">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div key={i} className="flex gap-2">
          <div className="w-6 h-3.5 bg-gray-50 rounded" />
          <div
            className="h-3.5 rounded"
            style={{
              width: `${40 + Math.random() * 50}%`,
              backgroundColor: i % 3 === 0 ? "#fef2f2" : i % 3 === 1 ? "#f0fdf4" : "#f9fafb",
            }}
          />
        </div>
      ))}
    </div>
  );
}

export function VersionHistory({
  planId,
  currentVersion,
  onClose,
  onVersionChange,
}: {
  planId: string;
  currentVersion?: number;
  onClose: () => void;
  onVersionChange?: (version: number) => void;
}) {
  const [versions, setVersions] = useState<VersionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVersion, setSelectedVersion] = useState<string | null>(null);
  const [versionContent, setVersionContent] = useState<string | null>(null);
  const [diff, setDiff] = useState<DiffLine[] | null>(null);
  const [viewMode, setViewMode] = useState<"content" | "diff">("diff");
  const [liveCurrentVersion, setLiveCurrentVersion] = useState(currentVersion);
  const [loadingContent, setLoadingContent] = useState(false);

  useEffect(() => {
    async function fetchVersions() {
      const res = await fetch(`/api/plans/${planId}/versions`);
      if (res.ok) {
        const data = await res.json();
        setVersions(data.versions);
        setLiveCurrentVersion(data.currentVersion);
        if (data.currentVersion && onVersionChange) {
          onVersionChange(data.currentVersion);
        }
      }
      setLoading(false);
    }
    fetchVersions();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [planId]);

  const handleSelectVersion = async (versionId: string) => {
    setSelectedVersion(versionId);
    setVersionContent(null);
    setDiff(null);
    setLoadingContent(true);

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
    setLoadingContent(false);
  };

  const switchViewMode = async (mode: "content" | "diff") => {
    setViewMode(mode);
    if (!selectedVersion) return;

    setVersionContent(null);
    setDiff(null);
    setLoadingContent(true);

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
    setLoadingContent(false);
  };

  // Compute line numbers for the diff gutter
  const computeDiffLineNumbers = (lines: DiffLine[]) => {
    let oldLine = 1;
    let newLine = 1;
    return lines.map((line) => {
      const result = {
        oldNum: null as number | null,
        newNum: null as number | null,
      };
      if (line.type === "same") {
        result.oldNum = oldLine++;
        result.newNum = newLine++;
      } else if (line.type === "remove") {
        result.oldNum = oldLine++;
      } else if (line.type === "add") {
        result.newNum = newLine++;
      }
      return result;
    });
  };

  return (
    <div className="w-[360px] shrink-0 border-l border-[var(--border-light)] bg-white h-[calc(100vh-53px)] sticky top-[53px] flex flex-col">
      {/* Header */}
      <div className="px-4 py-3 border-b border-[var(--border-light)] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <svg
            className="w-4 h-4 text-[var(--muted)]"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <h3 className="text-[13px] font-semibold font-sans text-[var(--fg)]">
            Version History
          </h3>
        </div>
        <button
          onClick={onClose}
          className="w-6 h-6 flex items-center justify-center rounded-md text-[var(--muted)] hover:text-[var(--fg)] hover:bg-gray-100 transition-colors"
          title="Close"
        >
          <svg
            className="w-3.5 h-3.5"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
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
        <SkeletonList />
      ) : versions.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
          <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center mb-3">
            <svg
              className="w-5 h-5 text-[var(--muted)]"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
              />
            </svg>
          </div>
          <p className="text-[13px] font-sans font-medium text-[var(--fg)] mb-1">
            No previous versions
          </p>
          <p className="text-[12px] text-[var(--muted)] font-sans leading-relaxed">
            {liveCurrentVersion && liveCurrentVersion > 1
              ? "Version history is empty."
              : "Versions are created when the document is updated."}
          </p>
        </div>
      ) : (
        <>
          {/* Version list */}
          <div className="flex-1 overflow-y-auto">
            {/* Current version indicator */}
            <div className="px-4 py-2.5 border-b border-[var(--border-light)] bg-gray-50/50">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center justify-center text-[10px] font-bold font-mono bg-emerald-100 text-emerald-700 rounded px-1.5 py-0.5 leading-none">
                  v{liveCurrentVersion}
                </span>
                <span className="text-[12px] font-sans text-[var(--fg-secondary)] font-medium">
                  Current version
                </span>
              </div>
            </div>

            <div className="py-1">
              {versions.map((v) => (
                <button
                  key={v.id}
                  onClick={() => handleSelectVersion(v.id)}
                  className={`w-full text-left px-4 py-2.5 transition-colors group ${
                    selectedVersion === v.id
                      ? "bg-blue-50/80 border-l-2 border-l-blue-500"
                      : "hover:bg-gray-50/80 border-l-2 border-l-transparent"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-0.5">
                    <span
                      className={`inline-flex items-center justify-center text-[10px] font-bold font-mono rounded px-1.5 py-0.5 leading-none ${
                        selectedVersion === v.id
                          ? "bg-blue-100 text-blue-700"
                          : "bg-gray-100 text-gray-500 group-hover:bg-gray-200 group-hover:text-gray-600"
                      }`}
                    >
                      v{v.version}
                    </span>
                    {v.title && (
                      <span className="text-[12px] font-sans text-[var(--fg)] truncate font-medium">
                        {v.title}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px] text-[var(--muted)] font-sans pl-0.5">
                    <span title={new Date(v.createdAt).toLocaleString()}>
                      {relativeTime(v.createdAt)}
                    </span>
                    {v.authorEmail && (
                      <>
                        <span className="text-gray-300">·</span>
                        <span className="truncate">{v.authorEmail}</span>
                      </>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Selected version content/diff */}
          {selectedVersion && (
            <div className="border-t border-[var(--border-light)] flex-1 overflow-y-auto min-h-[200px] max-h-[50vh]">
              {/* Toggle tabs */}
              <div className="flex border-b border-[var(--border-light)] sticky top-0 bg-white z-10">
                <button
                  onClick={() => switchViewMode("diff")}
                  className={`flex-1 text-[12px] font-sans py-2 transition-colors relative ${
                    viewMode === "diff"
                      ? "text-[var(--fg)] font-medium"
                      : "text-[var(--muted)] hover:text-[var(--fg)]"
                  }`}
                >
                  Diff
                  {viewMode === "diff" && (
                    <span className="absolute bottom-0 left-1/4 right-1/4 h-[2px] bg-[var(--fg)] rounded-full" />
                  )}
                </button>
                <button
                  onClick={() => switchViewMode("content")}
                  className={`flex-1 text-[12px] font-sans py-2 transition-colors relative ${
                    viewMode === "content"
                      ? "text-[var(--fg)] font-medium"
                      : "text-[var(--muted)] hover:text-[var(--fg)]"
                  }`}
                >
                  Source
                  {viewMode === "content" && (
                    <span className="absolute bottom-0 left-1/4 right-1/4 h-[2px] bg-[var(--fg)] rounded-full" />
                  )}
                </button>
              </div>

              {/* Diff view */}
              {viewMode === "diff" && diff && (
                <div className="overflow-x-auto">
                  <table className="w-full text-[11px] font-mono leading-[1.6] border-collapse">
                    <tbody>
                      {(() => {
                        const lineNums = computeDiffLineNumbers(diff);
                        return diff.map((line, i) => (
                          <tr
                            key={i}
                            className={
                              line.type === "add"
                                ? "bg-[#dafbe1]"
                                : line.type === "remove"
                                ? "bg-[#ffebe9]"
                                : ""
                            }
                          >
                            <td
                              className={`select-none text-right px-1.5 w-[1%] whitespace-nowrap ${
                                line.type === "add"
                                  ? "text-emerald-500/60 bg-[#aceebb]/30"
                                  : line.type === "remove"
                                  ? "text-red-400/60 bg-[#ffcecb]/30"
                                  : "text-gray-300 bg-gray-50/50"
                              }`}
                            >
                              {lineNums[i].oldNum ?? ""}
                            </td>
                            <td
                              className={`select-none text-right px-1.5 w-[1%] whitespace-nowrap border-r ${
                                line.type === "add"
                                  ? "text-emerald-500/60 bg-[#aceebb]/30 border-r-emerald-200/50"
                                  : line.type === "remove"
                                  ? "text-red-400/60 bg-[#ffcecb]/30 border-r-red-200/50"
                                  : "text-gray-300 bg-gray-50/50 border-r-gray-100"
                              }`}
                            >
                              {lineNums[i].newNum ?? ""}
                            </td>
                            <td
                              className={`select-none w-[14px] text-center ${
                                line.type === "add"
                                  ? "text-emerald-600"
                                  : line.type === "remove"
                                  ? "text-red-500"
                                  : "text-transparent"
                              }`}
                            >
                              {line.type === "add"
                                ? "+"
                                : line.type === "remove"
                                ? "-"
                                : " "}
                            </td>
                            <td
                              className={`whitespace-pre-wrap break-words pr-3 ${
                                line.type === "add"
                                  ? "text-emerald-900"
                                  : line.type === "remove"
                                  ? "text-red-900"
                                  : "text-[var(--fg-secondary)]"
                              }`}
                            >
                              {line.content}
                            </td>
                          </tr>
                        ));
                      })()}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Diff loading */}
              {viewMode === "diff" && !diff && loadingContent && (
                <SkeletonDiff />
              )}
              {viewMode === "diff" && !diff && !loadingContent && (
                <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
                  <p className="text-[12px] text-[var(--muted)] font-sans">
                    Select a version to see changes
                  </p>
                </div>
              )}

              {/* Source view */}
              {viewMode === "content" && versionContent !== null && (
                <div className="overflow-x-auto">
                  <table className="w-full text-[11px] font-mono leading-[1.6] border-collapse">
                    <tbody>
                      {versionContent.split("\n").map((line, i) => (
                        <tr key={i} className="hover:bg-gray-50/50">
                          <td className="select-none text-right px-1.5 w-[1%] whitespace-nowrap text-gray-300 bg-gray-50/50 border-r border-r-gray-100">
                            {i + 1}
                          </td>
                          <td className="whitespace-pre-wrap break-words pl-3 pr-3 text-[var(--fg)]">
                            {line}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Source loading */}
              {viewMode === "content" && versionContent === null && loadingContent && (
                <SkeletonDiff />
              )}
              {viewMode === "content" && versionContent === null && !loadingContent && (
                <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
                  <p className="text-[12px] text-[var(--muted)] font-sans">
                    Select a version to view source
                  </p>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
