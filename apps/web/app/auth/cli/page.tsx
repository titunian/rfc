"use client";

import { signIn, useSession } from "next-auth/react";
import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";

function CliAuthFlow() {
  const { data: session, status } = useSession();
  const searchParams = useSearchParams();
  const port = searchParams.get("port");
  const state = searchParams.get("state");

  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<
    "email" | "code" | "generating" | "done" | "error"
  >("email");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const generateAndSendKey = useCallback(async () => {
    if (!port || !state) return;
    setStep("generating");
    setError("");
    try {
      const res = await fetch("/api/auth/cli-callback", { method: "POST" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to generate API key");
      }
      const { key, email: userEmail } = await res.json();

      const callbackRes = await fetch(
        `http://localhost:${port}/callback`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key, email: userEmail, state }),
        }
      );

      if (!callbackRes.ok) {
        throw new Error("Failed to send credentials to CLI");
      }

      setStep("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed");
      setStep("error");
    }
  }, [port, state]);

  useEffect(() => {
    if (
      status === "authenticated" &&
      session?.user?.email &&
      step === "email"
    ) {
      generateAndSendKey();
    }
  }, [status, session, step, generateAndSendKey]);

  if (!port || !state) {
    return (
      <div className="w-full max-w-sm px-6 text-center">
        <h1 className="text-2xl font-bold tracking-tight mb-2" style={{ color: "var(--fg)" }}>orfc</h1>
        <p className="text-[13px]" style={{ color: "var(--muted)" }}>
          This page should be opened by the CLI.
        </p>
        <p className="text-[13px] mt-2" style={{ color: "var(--muted)" }}>
          Run{" "}
          <code
            className="px-1.5 py-0.5 rounded text-[12px] font-mono"
            style={{ background: "var(--code-inline-bg)", border: "1px solid var(--border-light)" }}
          >
            orfc login
          </code>{" "}
          in your terminal to authenticate.
        </p>
      </div>
    );
  }

  if (step === "generating") {
    return (
      <div className="w-full max-w-sm px-6 text-center">
        <h1 className="text-2xl font-bold tracking-tight mb-2" style={{ color: "var(--fg)" }}>orfc</h1>
        <p className="text-[13px]" style={{ color: "var(--muted)" }}>Setting up your CLI...</p>
        <div className="mt-4 animate-pulse" style={{ color: "var(--muted)" }}>●●●</div>
      </div>
    );
  }

  if (step === "done") {
    return (
      <div className="w-full max-w-sm px-6 text-center">
        <h1 className="text-2xl font-bold tracking-tight mb-2" style={{ color: "var(--fg)" }}>orfc</h1>
        <div
          className="mt-4 p-4 rounded-lg"
          style={{
            background: "rgba(22, 163, 74, 0.08)",
            border: "1px solid rgba(22, 163, 74, 0.2)",
          }}
        >
          <p className="text-[13px] font-medium" style={{ color: "var(--fg)" }}>
            ✓ Authenticated!
          </p>
          <p className="text-[13px] mt-1" style={{ color: "var(--fg-secondary)" }}>
            You can close this tab and return to your terminal.
          </p>
        </div>
      </div>
    );
  }

  if (step === "error") {
    return (
      <div className="w-full max-w-sm px-6 text-center">
        <h1 className="text-2xl font-bold tracking-tight mb-2" style={{ color: "var(--fg)" }}>orfc</h1>
        <div
          className="mt-4 p-4 rounded-lg"
          style={{
            background: "rgba(220, 38, 38, 0.08)",
            border: "1px solid rgba(220, 38, 38, 0.2)",
            color: "#dc2626",
          }}
        >
          <p className="text-[13px]">{error}</p>
        </div>
        <button
          onClick={() => { setStep("email"); setError(""); }}
          className="mt-4 text-[13px] transition-colors"
          style={{ color: "var(--muted)" }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "var(--fg)")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "var(--muted)")}
        >
          Try again
        </button>
      </div>
    );
  }

  const sendCode = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/send-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (res.ok) {
        setStep("code");
      } else {
        const data = await res.json();
        setError(data.error || "Failed to send code");
      }
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  };

  const verifyCode = async () => {
    setLoading(true);
    setError("");
    const result = await signIn("email-otp", {
      email,
      code,
      redirect: false,
    });
    if (result?.ok) {
      await generateAndSendKey();
    } else {
      setError("Invalid or expired code");
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-sm px-6">
      <div className="text-center mb-8">
        <div className="flex items-center justify-center gap-2.5 mb-3">
          <span
            className="inline-flex items-center justify-center h-8 w-8 rounded-[9px] text-[14px] font-bold shadow-sm"
            style={{ background: "var(--fg)", color: "var(--bg)" }}
          >
            o
          </span>
          <span className="text-[22px] font-bold tracking-tight" style={{ color: "var(--fg)" }}>
            orfc
          </span>
        </div>
        <p className="text-[13px]" style={{ color: "var(--muted)" }}>
          Sign in to authenticate your CLI
        </p>
      </div>

      {error && (
        <div
          className="mb-4 p-3 rounded-lg text-[13px]"
          style={{
            background: "rgba(220, 38, 38, 0.08)",
            border: "1px solid rgba(220, 38, 38, 0.2)",
            color: "#dc2626",
          }}
        >
          {error}
        </div>
      )}

      {step === "email" && status !== "loading" ? (
        <div>
          <label className="block text-[12px] font-medium mb-2" style={{ color: "var(--fg-secondary)" }}>
            Email address
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.com"
            className="w-full px-3 py-2.5 rounded-lg text-[14px] outline-none transition-shadow"
            style={{
              background: "var(--bg)",
              border: "1px solid var(--border)",
              color: "var(--fg)",
            }}
            onFocus={(e) => (e.currentTarget.style.boxShadow = "0 0 0 3px var(--accent-light)")}
            onBlur={(e) => (e.currentTarget.style.boxShadow = "none")}
            onKeyDown={(e) => e.key === "Enter" && email && sendCode()}
            autoFocus
          />
          <button
            onClick={sendCode}
            disabled={!email || loading}
            className="w-full mt-3 py-2.5 text-[13px] font-medium rounded-lg transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ background: "var(--fg)", color: "var(--bg)" }}
          >
            {loading ? "Sending..." : "Send sign-in code"}
          </button>
        </div>
      ) : step === "code" ? (
        <div>
          <p className="text-[13px] mb-4" style={{ color: "var(--muted)" }}>
            We sent a 6-digit code to <strong style={{ color: "var(--fg)" }}>{email}</strong>
          </p>
          <label className="block text-[12px] font-medium mb-2" style={{ color: "var(--fg-secondary)" }}>
            Verification code
          </label>
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            placeholder="123456"
            className="w-full px-3 py-2.5 rounded-lg text-center tracking-[0.3em] font-mono text-lg outline-none transition-shadow"
            style={{
              background: "var(--bg)",
              border: "1px solid var(--border)",
              color: "var(--fg)",
            }}
            onFocus={(e) => (e.currentTarget.style.boxShadow = "0 0 0 3px var(--accent-light)")}
            onBlur={(e) => (e.currentTarget.style.boxShadow = "none")}
            onKeyDown={(e) => e.key === "Enter" && code.length === 6 && verifyCode()}
            autoFocus
          />
          <button
            onClick={verifyCode}
            disabled={code.length !== 6 || loading}
            className="w-full mt-3 py-2.5 text-[13px] font-medium rounded-lg transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ background: "var(--fg)", color: "var(--bg)" }}
          >
            {loading ? "Verifying..." : "Sign in"}
          </button>
          <button
            onClick={() => { setStep("email"); setCode(""); setError(""); }}
            className="w-full mt-2 py-2 text-[13px] transition-colors"
            style={{ color: "var(--muted)" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "var(--fg)")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "var(--muted)")}
          >
            Use a different email
          </button>
        </div>
      ) : (
        <div className="text-center text-[13px]" style={{ color: "var(--muted)" }}>
          Loading...
        </div>
      )}
    </div>
  );
}

export default function CliAuthPage() {
  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ background: "var(--bg-warm)" }}
    >
      <Suspense fallback={<div style={{ color: "var(--muted)" }}>Loading...</div>}>
        <CliAuthFlow />
      </Suspense>
    </div>
  );
}
