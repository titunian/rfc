import { CopyCommand } from "@/components/copy-command";

export default function SelfHostPage() {
  return (
    <div className="min-h-screen bg-[var(--bg-warm)] flex flex-col">
      {/* Nav */}
      <header className="px-6 py-4 flex items-center justify-between max-w-4xl w-full mx-auto">
        <a
          href="/"
          className="text-[15px] font-semibold tracking-tight font-sans text-[var(--fg)] hover:text-[var(--fg-secondary)] transition-colors"
        >
          orfc
        </a>
        <a
          href="https://github.com/titunian/rfc"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[var(--muted)] hover:text-[var(--fg)] transition-colors"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
          </svg>
        </a>
      </header>

      <main className="flex-1 flex flex-col items-center px-6 pt-16 pb-24">
        <div className="max-w-2xl w-full">
          {/* Hero */}
          <div className="text-center mb-16">
            <h1 className="text-4xl font-bold tracking-tighter font-sans text-[var(--fg)] mb-4">
              Self-host orfc
            </h1>
            <p className="text-[17px] text-[var(--muted)] font-sans leading-relaxed">
              Your data, your cloud. Run orfc on your own infrastructure with Docker or deploy to Vercel.
            </p>
          </div>

          <div className="space-y-12 text-left">
            {/* Docker Compose */}
            <section>
              <div className="flex items-center gap-3 mb-4">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-[var(--fg)]">
                  <rect x="2" y="2" width="20" height="20" rx="2" />
                  <path d="M9 8h2v2H9zM13 8h2v2h-2zM9 12h2v2H9zM5 12h2v2H5zM13 12h2v2h-2zM17 12h2v2h-2zM9 4h2v2H9z" fill="currentColor" opacity="0.15" stroke="none" />
                </svg>
                <h2 className="text-[22px] font-semibold text-[var(--fg)] font-sans tracking-tight">
                  Docker Compose
                </h2>
              </div>
              <p className="text-[15px] text-[var(--fg-secondary)] font-sans leading-relaxed mb-2">
                Runs anywhere &mdash; AWS, GCP, Azure, DigitalOcean, Hetzner, or your own machine. Includes Postgres out of the box.
              </p>
              <p className="text-[13px] text-[var(--muted)] font-sans leading-relaxed mb-6">
                Requires Docker and Docker Compose. Nothing else.
              </p>

              {/* Steps */}
              <div className="space-y-6">
                <div>
                  <p className="text-[13px] font-medium text-[var(--fg)] font-sans mb-2">
                    1. Clone the repo
                  </p>
                  <div className="bg-[#0d1117] rounded-xl p-4 font-mono text-[13px] text-gray-300 space-y-1.5">
                    <CopyCommand command="git clone https://github.com/titunian/rfc.git && cd rfc" />
                  </div>
                </div>

                <div>
                  <p className="text-[13px] font-medium text-[var(--fg)] font-sans mb-2">
                    2. Create a <code className="text-[12px] bg-[var(--code-inline-bg)] px-1.5 py-0.5 rounded border border-[var(--border-light)]">.env</code> file
                  </p>
                  <div className="bg-[#0d1117] rounded-xl p-4 font-mono text-[13px] text-gray-300 space-y-1.5">
                    <div className="text-gray-500"># Generate secrets</div>
                    <div>NEXTAUTH_SECRET=<span className="text-gray-500">$(openssl rand -base64 32)</span></div>
                    <div>POSTGRES_PASSWORD=<span className="text-gray-500">$(openssl rand -hex 16)</span></div>
                    <div className="pt-2 text-gray-500"># Your domain (use http://localhost:3141 for local)</div>
                    <div>APP_URL=<span className="text-blue-400/70">https://your-domain.com</span></div>
                    <div>NEXTAUTH_URL=<span className="text-blue-400/70">https://your-domain.com</span></div>
                    <div className="pt-2 text-gray-500"># Optional: email notifications via Resend</div>
                    <div>RESEND_API_KEY=</div>
                    <div>RESEND_FROM_EMAIL=<span className="text-gray-500">noreply@your-domain.com</span></div>
                  </div>
                </div>

                <div>
                  <p className="text-[13px] font-medium text-[var(--fg)] font-sans mb-2">
                    3. Start everything
                  </p>
                  <div className="bg-[#0d1117] rounded-xl p-4 font-mono text-[13px] text-gray-300 space-y-1.5">
                    <CopyCommand command="docker compose up -d" />
                    <div className="text-green-400/70 text-[13px] pt-1">
                      ✓ Postgres + orfc running on http://localhost:3141
                    </div>
                  </div>
                </div>
              </div>

              {/* Docker management */}
              <div className="mt-6 border border-[var(--border-light)] rounded-xl p-4">
                <p className="text-[13px] font-medium text-[var(--fg)] font-sans mb-3">
                  Common commands
                </p>
                <div className="bg-[#0d1117] rounded-lg p-4 font-mono text-[13px] text-gray-300 space-y-1.5">
                  <div><span className="text-gray-500">$ </span>docker compose up -d       <span className="text-gray-500"># start</span></div>
                  <div><span className="text-gray-500">$ </span>docker compose down         <span className="text-gray-500"># stop</span></div>
                  <div><span className="text-gray-500">$ </span>docker compose logs -f web  <span className="text-gray-500"># view logs</span></div>
                  <div><span className="text-gray-500">$ </span>docker compose pull &amp;&amp; docker compose up -d  <span className="text-gray-500"># update</span></div>
                </div>
              </div>
            </section>

            {/* Divider */}
            <div className="flex items-center gap-4">
              <div className="flex-1 h-px bg-[var(--border-light)]" />
              <span className="text-[12px] text-[var(--muted)] font-sans font-medium">OR</span>
              <div className="flex-1 h-px bg-[var(--border-light)]" />
            </div>

            {/* Vercel + Neon */}
            <section>
              <div className="flex items-center gap-3 mb-4">
                <svg width="24" height="24" viewBox="0 0 76 65" fill="currentColor" className="text-[var(--fg)]">
                  <path d="M37.5274 0L75.0548 65H0L37.5274 0Z" />
                </svg>
                <h2 className="text-[22px] font-semibold text-[var(--fg)] font-sans tracking-tight">
                  Vercel + Neon
                </h2>
              </div>
              <p className="text-[15px] text-[var(--fg-secondary)] font-sans leading-relaxed mb-2">
                Serverless deployment with managed Postgres. Free tier available on both.
              </p>
              <p className="text-[13px] text-[var(--muted)] font-sans leading-relaxed mb-6">
                No Docker needed. Deploy in under 5 minutes.
              </p>

              <div className="space-y-4">
                <div className="border border-[var(--border-light)] rounded-xl p-4">
                  <div className="flex gap-3 items-start">
                    <span className="text-[13px] font-mono text-[var(--muted)] bg-[var(--border-light)] rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 mt-0.5 font-medium">1</span>
                    <div>
                      <p className="text-[14px] text-[var(--fg)] font-sans font-medium mb-1">Fork the repo</p>
                      <p className="text-[13px] text-[var(--muted)] font-sans">
                        Fork <a href="https://github.com/titunian/rfc" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-[var(--fg)]">titunian/rfc</a> on GitHub
                      </p>
                    </div>
                  </div>
                </div>

                <div className="border border-[var(--border-light)] rounded-xl p-4">
                  <div className="flex gap-3 items-start">
                    <span className="text-[13px] font-mono text-[var(--muted)] bg-[var(--border-light)] rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 mt-0.5 font-medium">2</span>
                    <div>
                      <p className="text-[14px] text-[var(--fg)] font-sans font-medium mb-1">Create a Postgres database</p>
                      <p className="text-[13px] text-[var(--muted)] font-sans">
                        Sign up at <a href="https://neon.tech" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-[var(--fg)]">neon.tech</a> (free) and create a database. Copy the connection string.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="border border-[var(--border-light)] rounded-xl p-4">
                  <div className="flex gap-3 items-start">
                    <span className="text-[13px] font-mono text-[var(--muted)] bg-[var(--border-light)] rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 mt-0.5 font-medium">3</span>
                    <div>
                      <p className="text-[14px] text-[var(--fg)] font-sans font-medium mb-1">Import in Vercel</p>
                      <p className="text-[13px] text-[var(--muted)] font-sans mb-2">
                        Go to <a href="https://vercel.com/new" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-[var(--fg)]">vercel.com/new</a>, import your fork, and set <strong>Root Directory</strong> to <code className="text-[12px] bg-[var(--code-inline-bg)] px-1 py-0.5 rounded">apps/web</code>.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="border border-[var(--border-light)] rounded-xl p-4">
                  <div className="flex gap-3 items-start">
                    <span className="text-[13px] font-mono text-[var(--muted)] bg-[var(--border-light)] rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 mt-0.5 font-medium">4</span>
                    <div className="flex-1">
                      <p className="text-[14px] text-[var(--fg)] font-sans font-medium mb-2">Add environment variables</p>
                      <div className="bg-[#0d1117] rounded-lg p-4 font-mono text-[12px] text-gray-400 space-y-1">
                        <div>DATABASE_URL=<span className="text-blue-400/70">your-neon-connection-string</span></div>
                        <div>NEXTAUTH_SECRET=<span className="text-gray-500">$(openssl rand -base64 32)</span></div>
                        <div>NEXTAUTH_URL=<span className="text-blue-400/70">https://your-domain.com</span></div>
                        <div>APP_URL=<span className="text-blue-400/70">https://your-domain.com</span></div>
                        <div className="pt-1 text-gray-600"># Optional</div>
                        <div>RESEND_API_KEY=<span className="text-gray-500">your-resend-key</span></div>
                        <div>RESEND_FROM_EMAIL=<span className="text-gray-500">noreply@your-domain.com</span></div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="border border-[var(--border-light)] rounded-xl p-4">
                  <div className="flex gap-3 items-start">
                    <span className="text-[13px] font-mono text-[var(--muted)] bg-[var(--border-light)] rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 mt-0.5 font-medium">5</span>
                    <div>
                      <p className="text-[14px] text-[var(--fg)] font-sans font-medium mb-1">Deploy and push schema</p>
                      <p className="text-[13px] text-[var(--muted)] font-sans mb-2">
                        Click Deploy. Then push the database schema:
                      </p>
                      <div className="bg-[#0d1117] rounded-lg p-3">
                        <CopyCommand command="npm run db:push" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Point CLI */}
            <section>
              <h2 className="text-[18px] font-semibold text-[var(--fg)] font-sans mb-3 tracking-tight">
                Point the CLI to your instance
              </h2>
              <p className="text-[14px] text-[var(--fg-secondary)] font-sans leading-relaxed mb-4">
                After deploying, configure the CLI to use your self-hosted instance instead of orfc.dev.
              </p>
              <div className="bg-[#0d1117] rounded-xl p-4 font-mono text-[13px] text-gray-300 space-y-1.5">
                <CopyCommand command="orfc config set apiUrl https://your-domain.com" />
                <div className="pt-1"><span className="text-gray-500 select-none">$ </span>orfc login</div>
                <div className="text-green-400/70">✓ Authenticated against your-domain.com</div>
              </div>
            </section>

            {/* Environment variables reference */}
            <section>
              <h2 className="text-[18px] font-semibold text-[var(--fg)] font-sans mb-3 tracking-tight">
                Environment variables
              </h2>
              <div className="border border-[var(--border-light)] rounded-xl overflow-hidden">
                <table className="w-full text-[13px] font-sans">
                  <thead>
                    <tr className="border-b border-[var(--border-light)]">
                      <th className="text-left p-3 text-[11px] uppercase tracking-wider text-[var(--muted)] font-medium bg-[var(--bg-warm)]">Variable</th>
                      <th className="text-left p-3 text-[11px] uppercase tracking-wider text-[var(--muted)] font-medium bg-[var(--bg-warm)]">Required</th>
                      <th className="text-left p-3 text-[11px] uppercase tracking-wider text-[var(--muted)] font-medium bg-[var(--bg-warm)]">Description</th>
                    </tr>
                  </thead>
                  <tbody className="text-[var(--fg-secondary)]">
                    <tr className="border-b border-[var(--border-light)]">
                      <td className="p-3 font-mono text-[12px]">DATABASE_URL</td>
                      <td className="p-3">Yes*</td>
                      <td className="p-3">Postgres connection string. *Docker Compose sets this automatically.</td>
                    </tr>
                    <tr className="border-b border-[var(--border-light)]">
                      <td className="p-3 font-mono text-[12px]">NEXTAUTH_SECRET</td>
                      <td className="p-3">Yes</td>
                      <td className="p-3">Random string for session encryption. Generate with <code className="text-[11px] bg-[var(--code-inline-bg)] px-1 py-0.5 rounded">openssl rand -base64 32</code></td>
                    </tr>
                    <tr className="border-b border-[var(--border-light)]">
                      <td className="p-3 font-mono text-[12px]">NEXTAUTH_URL</td>
                      <td className="p-3">Yes</td>
                      <td className="p-3">Your public URL (e.g. https://orfc.example.com)</td>
                    </tr>
                    <tr className="border-b border-[var(--border-light)]">
                      <td className="p-3 font-mono text-[12px]">APP_URL</td>
                      <td className="p-3">Yes</td>
                      <td className="p-3">Same as NEXTAUTH_URL. Used for generating links.</td>
                    </tr>
                    <tr className="border-b border-[var(--border-light)]">
                      <td className="p-3 font-mono text-[12px]">RESEND_API_KEY</td>
                      <td className="p-3">No</td>
                      <td className="p-3">Resend API key for email notifications</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-mono text-[12px]">RESEND_FROM_EMAIL</td>
                      <td className="p-3">No</td>
                      <td className="p-3">Sender email for notifications</td>
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
          <a href="/" className="hover:text-[var(--fg)] transition-colors">orfc</a> &middot; Open source &middot; <a href="https://github.com/titunian/rfc" target="_blank" rel="noopener noreferrer" className="hover:text-[var(--fg)] transition-colors">GitHub</a>
        </p>
      </footer>
    </div>
  );
}
