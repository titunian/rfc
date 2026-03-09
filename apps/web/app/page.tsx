import { CopyCommand } from "@/components/copy-command";
import { AuthBar } from "@/components/auth-bar";

export const dynamic = "force-dynamic";

export default function Home() {
  return (
    <div className="min-h-screen bg-[var(--bg-warm)] flex flex-col">
      {/* Minimal nav */}
      <header className="px-6 py-4 flex items-center justify-between max-w-3xl w-full mx-auto">
        <span className="text-[15px] font-semibold tracking-tight font-sans text-[var(--fg)]">
          rfc
        </span>
        <AuthBar />
      </header>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 -mt-16">
        <div className="text-center max-w-xl">
          {/* Logo mark */}
          <div className="mb-8">
            <h1 className="text-6xl font-bold tracking-tighter font-sans text-[var(--fg)]">
              rfc
            </h1>
          </div>

          {/* Tagline */}
          <p className="text-[19px] text-[var(--fg-secondary)] font-sans leading-relaxed mb-2">
            Publish plans from your terminal.
          </p>
          <p className="text-[19px] text-[var(--muted)] font-sans leading-relaxed mb-12">
            Share a link. Collect inline feedback.
          </p>

          {/* Terminal */}
          <div className="bg-[#0d1117] rounded-2xl p-5 mx-auto max-w-md shadow-[0_4px_24px_rgba(0,0,0,0.12)] text-left">
            <div className="flex items-center gap-1.5 mb-4">
              <div className="w-2.5 h-2.5 rounded-full bg-[#ff5f57]/80" />
              <div className="w-2.5 h-2.5 rounded-full bg-[#febc2e]/80" />
              <div className="w-2.5 h-2.5 rounded-full bg-[#28c840]/80" />
            </div>
            <CopyCommand command="npx rfc-tool push plan.md" />
          </div>

          {/* Flow */}
          <div className="mt-14 flex items-center justify-center gap-2 text-[13px] text-[var(--muted)] font-sans flex-wrap">
            <span className="px-2.5 py-1 rounded-full bg-white border border-[var(--border-light)]">
              Write markdown
            </span>
            <svg
              className="w-3.5 h-3.5 text-[var(--border)] shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
              />
            </svg>
            <span className="px-2.5 py-1 rounded-full bg-white border border-[var(--border-light)]">
              Push
            </span>
            <svg
              className="w-3.5 h-3.5 text-[var(--border)] shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
              />
            </svg>
            <span className="px-2.5 py-1 rounded-full bg-white border border-[var(--border-light)]">
              Share link
            </span>
            <svg
              className="w-3.5 h-3.5 text-[var(--border)] shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
              />
            </svg>
            <span className="px-2.5 py-1 rounded-full bg-white border border-[var(--border-light)]">
              Get feedback
            </span>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-8 text-center">
        <p className="text-[12px] text-[var(--muted)]/60 font-sans">
          Open source
        </p>
      </footer>
    </div>
  );
}
