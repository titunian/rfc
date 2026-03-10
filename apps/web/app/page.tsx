import { CopyCommand } from "@/components/copy-command";
import { AuthBar } from "@/components/auth-bar";

export const dynamic = "force-dynamic";

export default function Home() {
  return (
    <div className="min-h-screen bg-[var(--bg-warm)] flex flex-col">
      {/* Minimal nav */}
      <header className="px-6 py-4 flex items-center justify-between max-w-4xl w-full mx-auto">
        <span className="text-[15px] font-semibold tracking-tight font-sans text-[var(--fg)]">
          orfc
        </span>
        <AuthBar />
      </header>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center px-6 pt-20 pb-16">
        <div className="text-center max-w-2xl">
          <h1 className="text-7xl font-bold tracking-tighter font-sans text-[var(--fg)] mb-6">
            orfc
          </h1>

          <p className="text-[20px] text-[var(--fg-secondary)] font-sans leading-relaxed mb-1">
            Your AI agent writes the plan.
          </p>
          <p className="text-[20px] text-[var(--muted)] font-sans leading-relaxed mb-4">
            Your team reviews it.
          </p>
          <p className="text-[15px] text-[var(--muted)] font-sans leading-relaxed mb-14 max-w-md mx-auto">
            Share any markdown — architecture docs, implementation plans, RFCs
            — and collect inline feedback from your team before you ship.
          </p>

          {/* Install */}
          <div className="mb-4">
            <p className="text-[11px] uppercase tracking-[0.15em] text-[var(--muted)] font-sans font-medium mb-3">
              Install
            </p>
            <div className="bg-[#0d1117] rounded-2xl p-5 mx-auto max-w-md shadow-[0_4px_24px_rgba(0,0,0,0.12)] text-left">
              <div className="flex items-center gap-1.5 mb-3.5">
                <div className="w-2.5 h-2.5 rounded-full bg-[#ff5f57]/80" />
                <div className="w-2.5 h-2.5 rounded-full bg-[#febc2e]/80" />
                <div className="w-2.5 h-2.5 rounded-full bg-[#28c840]/80" />
              </div>
              <CopyCommand command="npm install -g @orfc/cli" />
            </div>
          </div>

          {/* Usage */}
          <div className="mb-16">
            <div className="bg-[#0d1117] rounded-2xl p-5 mx-auto max-w-md shadow-[0_4px_24px_rgba(0,0,0,0.12)] text-left">
              <div className="space-y-1.5 font-mono text-[14px]">
                <div>
                  <span className="text-gray-500 select-none">$ </span>
                  <span className="text-gray-300">orfc login</span>
                </div>
                <div className="text-green-400/70 text-[13px]">
                  ✓ Authenticated
                </div>
                <div className="pt-2">
                  <span className="text-gray-500 select-none">$ </span>
                  <span className="text-gray-300">orfc push plan.md</span>
                </div>
                <div className="text-green-400/70 text-[13px]">
                  ✓ Published → https://orfc.dev/p/xK7mQ2
                </div>
                <div className="pt-2">
                  <span className="text-gray-500 select-none">$ </span>
                  <span className="text-gray-300">orfc pull xK7mQ2</span>
                </div>
                <div className="text-green-400/70 text-[13px]">
                  ✓ 3 comments pulled → feedback.md
                </div>
              </div>
            </div>
          </div>

          {/* Works with */}
          <div className="mb-20">
            <p className="text-[11px] uppercase tracking-[0.15em] text-[var(--muted)] font-sans font-medium mb-2">
              Works with
            </p>
            <p className="text-[13px] text-[var(--muted)] font-sans mb-8">
              Any tool that generates markdown plans
            </p>
            <div className="flex items-center justify-center gap-12">
              {/* Cursor */}
              <a
                href="https://cursor.com"
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col items-center gap-3 group"
              >
                <div className="w-12 h-12 flex items-center justify-center transition-transform group-hover:scale-105">
                  <svg
                    width="48"
                    height="48"
                    viewBox="0 0 512 512"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <rect
                      width="512"
                      height="512"
                      rx="112"
                      fill="#1a1a1a"
                    />
                    <path
                      d="M255.428 423l148.991-83.5L255.428 256l-148.99 83.5 148.99 83.5z"
                      fill="white"
                      opacity="0.55"
                    />
                    <path
                      d="M404.419 339.5v-167L255.428 89v167l148.991 83.5z"
                      fill="white"
                      opacity="0.2"
                    />
                    <path
                      d="M255.428 89l-148.99 83.5v167l148.99-83.5V89z"
                      fill="white"
                      opacity="0.4"
                    />
                    <path
                      d="M404.419 172.5L255.428 423V256l148.991-83.5z"
                      fill="white"
                      opacity="0.8"
                    />
                    <path
                      d="M404.419 172.5L255.428 256l-148.99-83.5h297.981z"
                      fill="white"
                    />
                  </svg>
                </div>
                <span className="text-[13px] text-[var(--muted)] font-sans group-hover:text-[var(--fg)] transition-colors">
                  Cursor
                </span>
              </a>

              {/* Claude Code */}
              <a
                href="https://docs.anthropic.com/en/docs/claude-code"
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col items-center gap-3 group"
              >
                <div className="w-12 h-12 flex items-center justify-center transition-transform group-hover:scale-105">
                  {/* Official Claude icon from Bootstrap Icons */}
                  <svg
                    width="42"
                    height="42"
                    viewBox="0 0 16 16"
                    fill="#1a1a1a"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path d="m3.127 10.604 3.135-1.76.053-.153-.053-.085H6.11l-.525-.032-1.791-.048-1.554-.065-1.505-.08-.38-.081L0 7.832l.036-.234.32-.214.455.04 1.009.069 1.513.105 1.097.064 1.626.17h.259l.036-.105-.089-.065-.068-.064-1.566-1.062-1.695-1.121-.887-.646-.48-.327-.243-.306-.104-.67.435-.48.585.04.15.04.593.456 1.267.981 1.654 1.218.242.202.097-.068.012-.049-.109-.181-.9-1.626-.96-1.655-.428-.686-.113-.411a2 2 0 0 1-.068-.484l.496-.674L4.446 0l.662.089.279.242.411.94.666 1.48 1.033 2.014.302.597.162.553.06.17h.105v-.097l.085-1.134.157-1.392.154-1.792.052-.504.25-.605.497-.327.387.186.319.456-.045.294-.19 1.23-.37 1.93-.243 1.29h.142l.161-.16.654-.868 1.097-1.372.484-.545.565-.601.363-.287h.686l.505.751-.226.775-.707.895-.585.759-.839 1.13-.524.904.048.072.125-.012 1.897-.403 1.024-.186 1.223-.21.553.258.06.263-.218.536-1.307.323-1.533.307-2.284.54-.028.02.032.04 1.029.098.44.024h1.077l2.005.15.525.346.315.424-.053.323-.807.411-3.631-.863-.872-.218h-.12v.073l.726.71 1.331 1.202 1.667 1.55.084.383-.214.302-.226-.032-1.464-1.101-.565-.497-1.28-1.077h-.084v.113l.295.432 1.557 2.34.08.718-.112.234-.404.141-.444-.08-.911-1.28-.94-1.44-.759-1.291-.093.053-.448 4.821-.21.246-.484.186-.403-.307-.214-.496.214-.98.258-1.28.21-1.016.19-1.263.112-.42-.008-.028-.092.012-.953 1.307-1.448 1.957-1.146 1.227-.274.109-.477-.247.045-.44.266-.39 1.586-2.018.956-1.25.617-.723-.004-.105h-.036l-4.212 2.736-.75.096-.324-.302.04-.496.154-.162 1.267-.871z" />
                  </svg>
                </div>
                <span className="text-[13px] text-[var(--muted)] font-sans group-hover:text-[var(--fg)] transition-colors">
                  Claude Code
                </span>
              </a>

              {/* Windsurf */}
              <a
                href="https://windsurf.com"
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col items-center gap-3 group"
              >
                <div className="w-12 h-12 flex items-center justify-center transition-transform group-hover:scale-105">
                  {/* Official Windsurf symbol */}
                  <svg
                    width="42"
                    height="42"
                    viewBox="0 0 1024 1024"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M897.246 286.869H889.819C850.735 286.808 819.017 318.46 819.017 357.539V515.589C819.017 547.15 792.93 572.716 761.882 572.716C743.436 572.716 725.02 563.433 714.093 547.85L552.673 317.304C539.28 298.16 517.486 286.747 493.895 286.747C457.094 286.747 423.976 318.034 423.976 356.657V515.619C423.976 547.181 398.103 572.746 366.842 572.746C348.335 572.746 329.949 563.463 319.021 547.881L138.395 289.882C134.316 284.038 125.154 286.93 125.154 294.052V431.892C125.154 438.862 127.285 445.619 131.272 451.34L309.037 705.2C319.539 720.204 335.033 731.344 352.9 735.392C397.616 745.557 438.77 711.135 438.77 667.278V508.406C438.77 476.845 464.339 451.279 495.904 451.279H495.995C515.02 451.279 532.857 460.562 543.785 476.145L705.235 706.661C718.659 725.835 739.327 737.218 763.983 737.218C801.606 737.218 833.841 705.9 833.841 667.308V508.376C833.841 476.815 859.41 451.249 890.975 451.249H897.276C901.233 451.249 904.43 448.053 904.43 444.097V294.021C904.43 290.065 901.233 286.869 897.276 286.869H897.246Z"
                      fill="#1a1a1a"
                    />
                  </svg>
                </div>
                <span className="text-[13px] text-[var(--muted)] font-sans group-hover:text-[var(--fg)] transition-colors">
                  Windsurf
                </span>
              </a>

              {/* Any Terminal */}
              <div className="flex flex-col items-center gap-3">
                <div className="w-12 h-12 flex items-center justify-center">
                  <svg
                    width="40"
                    height="40"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#1a1a1a"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="4 17 10 11 4 5" />
                    <line x1="12" y1="19" x2="20" y2="19" />
                  </svg>
                </div>
                <span className="text-[13px] text-[var(--muted)] font-sans">
                  Any terminal
                </span>
              </div>
            </div>
          </div>

          {/* How it works */}
          <div className="max-w-lg mx-auto">
            <p className="text-[11px] uppercase tracking-[0.15em] text-[var(--muted)] font-sans font-medium mb-8">
              How it works
            </p>
            <div className="grid grid-cols-3 gap-8 text-left">
              <div>
                <div className="text-[32px] font-bold text-[var(--border)] font-sans mb-2 leading-none">
                  1
                </div>
                <p className="text-[14px] text-[var(--fg-secondary)] font-sans leading-relaxed">
                  Your agent generates a plan. Or write one yourself.
                </p>
              </div>
              <div>
                <div className="text-[32px] font-bold text-[var(--border)] font-sans mb-2 leading-none">
                  2
                </div>
                <p className="text-[14px] text-[var(--fg-secondary)] font-sans leading-relaxed">
                  Push it. Share the link with your team for review.
                </p>
              </div>
              <div>
                <div className="text-[32px] font-bold text-[var(--border)] font-sans mb-2 leading-none">
                  3
                </div>
                <p className="text-[14px] text-[var(--fg-secondary)] font-sans leading-relaxed">
                  Pull feedback. Let your agent iterate. Ship with confidence.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-8 text-center border-t border-[var(--border-light)]">
        <p className="text-[12px] text-[var(--muted)] font-sans">
          Open source · Works with any tool that has a terminal
        </p>
      </footer>
    </div>
  );
}
