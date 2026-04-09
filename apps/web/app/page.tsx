import { CopyCommand } from "@/components/copy-command";
import { CopyBlock } from "@/components/copy-block";
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
        <div className="flex items-center gap-4">
          <a
            href="/self-host"
            className="text-[13px] text-[var(--muted)] hover:text-[var(--fg)] transition-colors font-sans"
          >
            Self-host
          </a>
          <a
            href="https://github.com/titunian/rfc"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[var(--muted)] hover:text-[var(--fg)] transition-colors"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
            </svg>
          </a>
          <AuthBar />
        </div>
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
            Your team reviews it. You iterate.
          </p>
          <p className="text-[15px] text-[var(--muted)] font-sans leading-relaxed mb-14 max-w-md mx-auto">
            Share any markdown — architecture docs, implementation plans, RFCs
            — collect inline feedback, edit in-browser, and track every revision with built-in version history.
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
                <div className="pt-2">
                  <span className="text-gray-500 select-none">$ </span>
                  <span className="text-gray-300">orfc edit xK7mQ2</span>
                </div>
                <div className="text-green-400/70 text-[13px]">
                  ✓ Updated → https://orfc.dev/p/xK7mQ2 (v2)
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
                <div className="w-12 h-12 flex items-center justify-center transition-transform group-hover:scale-105 text-[var(--fg)]">
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
                      fill="currentColor"
                    />
                    <path
                      d="M255.428 423l148.991-83.5L255.428 256l-148.99 83.5 148.99 83.5z"
                      fill="var(--bg)"
                      opacity="0.55"
                    />
                    <path
                      d="M404.419 339.5v-167L255.428 89v167l148.991 83.5z"
                      fill="var(--bg)"
                      opacity="0.2"
                    />
                    <path
                      d="M255.428 89l-148.99 83.5v167l148.99-83.5V89z"
                      fill="var(--bg)"
                      opacity="0.4"
                    />
                    <path
                      d="M404.419 172.5L255.428 423V256l148.991-83.5z"
                      fill="var(--bg)"
                      opacity="0.8"
                    />
                    <path
                      d="M404.419 172.5L255.428 256l-148.99-83.5h297.981z"
                      fill="var(--bg)"
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
                <div className="w-12 h-12 flex items-center justify-center transition-transform group-hover:scale-105 text-[var(--fg)]">
                  {/* Official Claude icon from Bootstrap Icons */}
                  <svg
                    width="42"
                    height="42"
                    viewBox="0 0 16 16"
                    fill="currentColor"
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
                <div className="w-12 h-12 flex items-center justify-center transition-transform group-hover:scale-105 text-[var(--fg)]">
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
                      fill="currentColor"
                    />
                  </svg>
                </div>
                <span className="text-[13px] text-[var(--muted)] font-sans group-hover:text-[var(--fg)] transition-colors">
                  Windsurf
                </span>
              </a>

              {/* Any Terminal */}
              <div className="flex flex-col items-center gap-3">
                <div className="w-12 h-12 flex items-center justify-center text-[var(--fg)]">
                  <svg
                    width="40"
                    height="40"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
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

        {/* Documentation */}
        <div id="docs" className="w-full max-w-2xl mx-auto px-6 pb-24 pt-8">
          <p className="text-[11px] uppercase tracking-[0.15em] text-[var(--muted)] font-sans font-medium mb-10 text-center">
            Documentation
          </p>

          <div className="space-y-12 text-left">
            {/* Getting started */}
            <section>
              <h2 className="text-[18px] font-semibold text-[var(--fg)] font-sans mb-3 tracking-tight">
                Getting started
              </h2>
              <p className="text-[14px] text-[var(--fg-secondary)] font-sans leading-relaxed mb-4">
                Install the CLI globally, then authenticate once with your email.
              </p>
              <div className="bg-[#0d1117] rounded-xl p-4 font-mono text-[13px] text-gray-300 space-y-1.5 mb-2">
                <div><span className="text-gray-500 select-none">$ </span>npm install -g @orfc/cli</div>
                <div><span className="text-gray-500 select-none">$ </span>orfc login</div>
                <div className="text-green-400/70">✓ Authenticated as you@company.com</div>
              </div>
              <p className="text-[13px] text-[var(--muted)] font-sans leading-relaxed">
                Your API key is saved to <code className="text-[12px] bg-[var(--code-inline-bg)] px-1.5 py-0.5 rounded border border-[var(--border-light)]">~/.orfc/config.json</code>. You only need to log in once.
              </p>
            </section>

            {/* Publishing */}
            <section>
              <h2 className="text-[18px] font-semibold text-[var(--fg)] font-sans mb-3 tracking-tight">
                Publishing a plan
              </h2>
              <p className="text-[14px] text-[var(--fg-secondary)] font-sans leading-relaxed mb-4">
                Push any markdown file to get a shareable link. The title is auto-detected from the first <code className="text-[12px] bg-[var(--code-inline-bg)] px-1.5 py-0.5 rounded border border-[var(--border-light)]"># heading</code>.
              </p>
              <div className="bg-[#0d1117] rounded-xl p-4 font-mono text-[13px] text-gray-300 space-y-1.5 mb-4">
                <div><span className="text-gray-500 select-none">$ </span>orfc push plan.md</div>
                <div className="text-green-400/70">✓ Published → https://orfc.dev/p/xK7mQ2</div>
                <div className="text-gray-500 text-[12px]"># link copied to clipboard, browser opens automatically</div>
              </div>
              <p className="text-[14px] text-[var(--fg-secondary)] font-sans leading-relaxed mb-3">
                You can also pipe from stdin, set a custom title, or update an existing plan:
              </p>
              <div className="bg-[#0d1117] rounded-xl p-4 font-mono text-[13px] text-gray-300 space-y-1.5">
                <div><span className="text-gray-500 select-none">$ </span>cat plan.md | orfc push</div>
                <div><span className="text-gray-500 select-none">$ </span>orfc push plan.md --title &quot;Q2 Architecture&quot;</div>
                <div><span className="text-gray-500 select-none">$ </span>orfc push plan.md --update xK7mQ2 <span className="text-gray-500"># update existing</span></div>
                <div><span className="text-gray-500 select-none">$ </span>orfc push plan.md --expires 7d <span className="text-gray-500"># auto-expire in 7 days</span></div>
              </div>
            </section>

            {/* Access control */}
            <section>
              <h2 className="text-[18px] font-semibold text-[var(--fg)] font-sans mb-3 tracking-tight">
                Access control
              </h2>
              <p className="text-[14px] text-[var(--fg-secondary)] font-sans leading-relaxed mb-4">
                By default, plans require sign-in to view. You can make them public or restrict to specific people.
              </p>
              <div className="space-y-4">
                <div className="border border-[var(--border-light)] rounded-xl p-4">
                  <div className="text-[13px] font-medium text-[var(--fg)] font-sans mb-1">
                    Authenticated <span className="text-[12px] text-[var(--muted)] font-normal ml-1">(default)</span>
                  </div>
                  <p className="text-[13px] text-[var(--muted)] font-sans leading-relaxed mb-2">
                    Anyone with a valid email sign-in can view the plan.
                  </p>
                  <div className="bg-[#0d1117] rounded-lg p-3 font-mono text-[12px] text-gray-400">
                    $ orfc push plan.md
                  </div>
                </div>

                <div className="border border-[var(--border-light)] rounded-xl p-4">
                  <div className="text-[13px] font-medium text-[var(--fg)] font-sans mb-1">
                    Public
                  </div>
                  <p className="text-[13px] text-[var(--muted)] font-sans leading-relaxed mb-2">
                    Anyone with the link can view, no sign-in required.
                  </p>
                  <div className="bg-[#0d1117] rounded-lg p-3 font-mono text-[12px] text-gray-400">
                    $ orfc push plan.md --access anyone
                  </div>
                </div>

                <div className="border border-[var(--border-light)] rounded-xl p-4">
                  <div className="text-[13px] font-medium text-[var(--fg)] font-sans mb-1">
                    Domain-restricted
                  </div>
                  <p className="text-[13px] text-[var(--muted)] font-sans leading-relaxed mb-2">
                    Only people with matching email domains can view. The author always has access.
                  </p>
                  <div className="bg-[#0d1117] rounded-lg p-3 font-mono text-[12px] text-gray-400 space-y-1">
                    <div>$ orfc push plan.md --viewers &quot;@company.com&quot;</div>
                    <div>$ orfc push plan.md --viewers &quot;alice@co.com,bob@co.com&quot;</div>
                  </div>
                </div>
              </div>
            </section>

            {/* Notifications */}
            <section>
              <h2 className="text-[18px] font-semibold text-[var(--fg)] font-sans mb-3 tracking-tight">
                Notifying reviewers
              </h2>
              <p className="text-[14px] text-[var(--fg-secondary)] font-sans leading-relaxed mb-4">
                Send an email to reviewers when you publish, so they know to review.
              </p>
              <div className="bg-[#0d1117] rounded-xl p-4 font-mono text-[13px] text-gray-300 space-y-1.5">
                <div><span className="text-gray-500 select-none">$ </span>orfc push plan.md --to reviewer@company.com</div>
                <div><span className="text-gray-500 select-none">$ </span>orfc push plan.md --to &quot;alice@co.com,bob@co.com&quot;</div>
              </div>
            </section>

            {/* Reviewing comments */}
            <section>
              <h2 className="text-[18px] font-semibold text-[var(--fg)] font-sans mb-3 tracking-tight">
                Reviewing feedback
              </h2>
              <p className="text-[14px] text-[var(--fg-secondary)] font-sans leading-relaxed mb-4">
                Reviewers open the link in their browser, highlight text, and leave inline comments. You can pull those comments back into your markdown.
              </p>
              <div className="bg-[#0d1117] rounded-xl p-4 font-mono text-[13px] text-gray-300 space-y-1.5 mb-4">
                <div><span className="text-gray-500 select-none">$ </span>orfc pull xK7mQ2</div>
                <div className="text-gray-400 text-[12px]">{`<!-- [COMMENT by reviewer@co.com]`}</div>
                <div className="text-gray-400 text-[12px]">{`On: "the specific text they highlighted"`}</div>
                <div className="text-gray-400 text-[12px]">{`> Their feedback here`}</div>
                <div className="text-gray-400 text-[12px]">{`-->`}</div>
              </div>
              <p className="text-[14px] text-[var(--fg-secondary)] font-sans leading-relaxed mb-3">
                Pipe to a file for easy revision:
              </p>
              <div className="bg-[#0d1117] rounded-xl p-4 font-mono text-[13px] text-gray-300 space-y-1.5">
                <div><span className="text-gray-500 select-none">$ </span>orfc pull xK7mQ2 &gt; feedback.md</div>
                <div><span className="text-gray-500 select-none">$ </span>orfc comments xK7mQ2 <span className="text-gray-500"># view comments in terminal</span></div>
              </div>
            </section>

            {/* Managing plans */}
            <section>
              <h2 className="text-[18px] font-semibold text-[var(--fg)] font-sans mb-3 tracking-tight">
                Managing plans
              </h2>
              <div className="bg-[#0d1117] rounded-xl p-4 font-mono text-[13px] text-gray-300 space-y-1.5">
                <div><span className="text-gray-500 select-none">$ </span>orfc list <span className="text-gray-500"># list all your published plans</span></div>
                <div><span className="text-gray-500 select-none">$ </span>orfc open xK7mQ2 <span className="text-gray-500"># open in browser</span></div>
                <div><span className="text-gray-500 select-none">$ </span>orfc delete xK7mQ2 <span className="text-gray-500"># permanently delete</span></div>
              </div>
            </section>

            {/* Editing & Version History */}
            <section>
              <h2 className="text-[18px] font-semibold text-[var(--fg)] font-sans mb-3 tracking-tight">
                Editing & version history
              </h2>
              <p className="text-[14px] text-[var(--fg-secondary)] font-sans leading-relaxed mb-4">
                Edit plans directly in the browser or from your terminal. Every update automatically preserves the previous version.
              </p>
              <div className="space-y-4">
                <div className="border border-[var(--border-light)] rounded-xl p-4">
                  <div className="text-[13px] font-medium text-[var(--fg)] font-sans mb-1">
                    Web editing
                  </div>
                  <p className="text-[13px] text-[var(--muted)] font-sans leading-relaxed">
                    Plan authors see an Edit button on their documents. Click to switch to a markdown editor with live preview. Cmd+S to save.
                  </p>
                </div>
                <div className="border border-[var(--border-light)] rounded-xl p-4">
                  <div className="text-[13px] font-medium text-[var(--fg)] font-sans mb-1">
                    CLI editing
                  </div>
                  <p className="text-[13px] text-[var(--muted)] font-sans leading-relaxed mb-2">
                    Pull, edit in your terminal editor, and push back in one command.
                  </p>
                  <div className="bg-[#0d1117] rounded-lg p-3 font-mono text-[12px] text-gray-400">
                    $ orfc edit xK7mQ2 <span className="text-gray-500"># opens in $EDITOR</span>
                  </div>
                </div>
                <div className="border border-[var(--border-light)] rounded-xl p-4">
                  <div className="text-[13px] font-medium text-[var(--fg)] font-sans mb-1">
                    Version history
                  </div>
                  <p className="text-[13px] text-[var(--muted)] font-sans leading-relaxed">
                    Click History on any plan to see all previous versions with diffs. Every update — from the web, CLI, or an AI agent — is tracked.
                  </p>
                </div>
              </div>
            </section>

            {/* AI Agent workflow */}
            <section>
              <h2 className="text-[18px] font-semibold text-[var(--fg)] font-sans mb-3 tracking-tight">
                AI agent workflow
              </h2>
              <p className="text-[14px] text-[var(--fg-secondary)] font-sans leading-relaxed mb-4">
                AI agents (Cursor, Claude Code, Windsurf) can use orfc to share implementation plans for human review before executing. This is the typical flow:
              </p>
              <div className="space-y-3">
                <div className="flex gap-3 items-start">
                  <span className="text-[12px] font-mono text-[var(--muted)] bg-[var(--border-light)] rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0 mt-0.5">1</span>
                  <p className="text-[14px] text-[var(--fg-secondary)] font-sans leading-relaxed">
                    Agent generates a markdown plan for the implementation
                  </p>
                </div>
                <div className="flex gap-3 items-start">
                  <span className="text-[12px] font-mono text-[var(--muted)] bg-[var(--border-light)] rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0 mt-0.5">2</span>
                  <div>
                    <p className="text-[14px] text-[var(--fg-secondary)] font-sans leading-relaxed mb-1.5">
                      Agent publishes and notifies the reviewer
                    </p>
                    <div className="bg-[#0d1117] rounded-lg p-3 font-mono text-[12px] text-gray-400">
                      orfc push plan.md --viewers &quot;@company.com&quot; --to you@company.com
                    </div>
                  </div>
                </div>
                <div className="flex gap-3 items-start">
                  <span className="text-[12px] font-mono text-[var(--muted)] bg-[var(--border-light)] rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0 mt-0.5">3</span>
                  <p className="text-[14px] text-[var(--fg-secondary)] font-sans leading-relaxed">
                    Human reviews on orfc.dev, leaves inline comments on specific sections
                  </p>
                </div>
                <div className="flex gap-3 items-start">
                  <span className="text-[12px] font-mono text-[var(--muted)] bg-[var(--border-light)] rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0 mt-0.5">4</span>
                  <div>
                    <p className="text-[14px] text-[var(--fg-secondary)] font-sans leading-relaxed mb-1.5">
                      Agent pulls feedback and reads inline comments
                    </p>
                    <div className="bg-[#0d1117] rounded-lg p-3 font-mono text-[12px] text-gray-400">
                      orfc pull xK7mQ2 &gt; feedback.md
                    </div>
                  </div>
                </div>
                <div className="flex gap-3 items-start">
                  <span className="text-[12px] font-mono text-[var(--muted)] bg-[var(--border-light)] rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0 mt-0.5">5</span>
                  <p className="text-[14px] text-[var(--fg-secondary)] font-sans leading-relaxed">
                    Agent addresses each comment, revises the plan, and re-publishes
                  </p>
                </div>
                <div className="flex gap-3 items-start">
                  <span className="text-[12px] font-mono text-[var(--muted)] bg-[var(--border-light)] rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0 mt-0.5">6</span>
                  <div>
                    <p className="text-[14px] text-[var(--fg-secondary)] font-sans leading-relaxed mb-1.5">
                      Agent updates the existing plan with revisions
                    </p>
                    <div className="bg-[#0d1117] rounded-lg p-3 font-mono text-[12px] text-gray-400">
                      orfc push plan.md --update xK7mQ2
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Copy-paste prompt for agents */}
            <section>
              <h2 className="text-[18px] font-semibold text-[var(--fg)] font-sans mb-3 tracking-tight">
                Agent prompt
              </h2>
              <p className="text-[14px] text-[var(--fg-secondary)] font-sans leading-relaxed mb-4">
                Copy this prompt into Cursor rules, Claude Code <code className="text-[12px] bg-[var(--code-inline-bg)] px-1.5 py-0.5 rounded border border-[var(--border-light)]">CLAUDE.md</code>, or any AI agent&apos;s system instructions to enable the orfc workflow.
              </p>
              <CopyBlock
                label="Copy agent prompt"
                content={`## orfc — plan review workflow

Before implementing any non-trivial task, publish your plan for human review using orfc.

### Setup (one-time)
npm install -g @orfc/cli
orfc login

### Workflow
1. Write your implementation plan as a markdown file (plan.md)
2. Publish it for review:
   orfc push plan.md --viewers "@company.com" --to reviewer@company.com
3. Wait for the reviewer to leave inline comments on orfc.dev
4. Pull the feedback:
   orfc pull <slug> > feedback.md
5. Read the comments, address each one, revise your plan
6. Re-publish the updated plan:
   orfc push plan.md --update <slug>
7. Repeat until approved, then implement

### Key flags
--access anyone          # make public (no sign-in required)
--viewers "@domain.com"  # restrict to a domain
--to "a@co.com,b@co.com" # email reviewers
--update <slug>          # update existing plan
--title "My Plan"        # custom title

### Commands
orfc push <file>    # publish a plan
orfc pull <slug>    # pull plan with inline comments
orfc edit <slug>    # pull, edit in $EDITOR, push back
orfc comments <slug> # view comments
orfc list           # list your plans
orfc --help         # full usage

### Version history
Every --update automatically preserves the previous version.
Reviewers can view all past versions and diffs on the web.`}
              />
            </section>

            {/* Configuration */}
            <section>
              <h2 className="text-[18px] font-semibold text-[var(--fg)] font-sans mb-3 tracking-tight">
                Configuration
              </h2>
              <p className="text-[14px] text-[var(--fg-secondary)] font-sans leading-relaxed mb-4">
                Config is stored at <code className="text-[12px] bg-[var(--code-inline-bg)] px-1.5 py-0.5 rounded border border-[var(--border-light)]">~/.orfc/config.json</code>. Set defaults so you don't have to repeat flags.
              </p>
              <div className="bg-[#0d1117] rounded-xl p-4 font-mono text-[13px] text-gray-300 space-y-1.5">
                <div><span className="text-gray-500 select-none">$ </span>orfc config show</div>
                <div><span className="text-gray-500 select-none">$ </span>orfc config set defaultAccess anyone</div>
                <div><span className="text-gray-500 select-none">$ </span>orfc config set defaultExpiry 7d</div>
                <div><span className="text-gray-500 select-none">$ </span>orfc config set slackWebhook https://hooks.slack.com/...</div>
              </div>
            </section>

            {/* CLI Reference */}
            <section>
              <h2 className="text-[18px] font-semibold text-[var(--fg)] font-sans mb-3 tracking-tight">
                CLI reference
              </h2>
              <div className="border border-[var(--border-light)] rounded-xl overflow-hidden">
                <table className="w-full text-[13px] font-sans">
                  <thead>
                    <tr className="border-b border-[var(--border-light)]">
                      <th className="text-left p-3 text-[11px] uppercase tracking-wider text-[var(--muted)] font-medium bg-[var(--bg-warm)]">Command</th>
                      <th className="text-left p-3 text-[11px] uppercase tracking-wider text-[var(--muted)] font-medium bg-[var(--bg-warm)]">Description</th>
                    </tr>
                  </thead>
                  <tbody className="text-[var(--fg-secondary)]">
                    <tr className="border-b border-[var(--border-light)]">
                      <td className="p-3 font-mono text-[12px]">orfc login</td>
                      <td className="p-3">Authenticate via browser</td>
                    </tr>
                    <tr className="border-b border-[var(--border-light)]">
                      <td className="p-3 font-mono text-[12px]">orfc push &lt;file&gt;</td>
                      <td className="p-3">Publish a markdown file</td>
                    </tr>
                    <tr className="border-b border-[var(--border-light)]">
                      <td className="p-3 font-mono text-[12px]">orfc pull &lt;slug&gt;</td>
                      <td className="p-3">Pull plan with inline comments</td>
                    </tr>
                    <tr className="border-b border-[var(--border-light)]">
                      <td className="p-3 font-mono text-[12px]">orfc comments &lt;slug&gt;</td>
                      <td className="p-3">View comments in terminal</td>
                    </tr>
                    <tr className="border-b border-[var(--border-light)]">
                      <td className="p-3 font-mono text-[12px]">orfc list</td>
                      <td className="p-3">List all your plans</td>
                    </tr>
                    <tr className="border-b border-[var(--border-light)]">
                      <td className="p-3 font-mono text-[12px]">orfc open &lt;slug&gt;</td>
                      <td className="p-3">Open plan in browser</td>
                    </tr>
                    <tr className="border-b border-[var(--border-light)]">
                      <td className="p-3 font-mono text-[12px]">orfc edit &lt;slug&gt;</td>
                      <td className="p-3">Pull, edit in $EDITOR, push back</td>
                    </tr>
                    <tr className="border-b border-[var(--border-light)]">
                      <td className="p-3 font-mono text-[12px]">orfc delete &lt;slug&gt;</td>
                      <td className="p-3">Delete a plan permanently</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-mono text-[12px]">orfc config &lt;action&gt;</td>
                      <td className="p-3">View or modify config</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>
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
