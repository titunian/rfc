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

  // If already signed in, skip OTP and jump to key generation
  useEffect(() => {
    if (
      status === "authenticated" &&
      session?.user?.email &&
      step === "email"
    ) {
      generateAndSendKey();
    }
  }, [status, session, step, generateAndSendKey]);

  // Missing params — page was opened directly
  if (!port || !state) {
    return (
      <div className="w-full max-w-sm px-6 text-center">
        <h1 className="text-2xl font-bold tracking-tight mb-2">orfc</h1>
        <p className="text-sm text-[var(--muted)]">
          This page should be opened by the CLI.
        </p>
        <p className="text-sm text-[var(--muted)] mt-2">
          Run <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs font-mono">orfc login</code> in
          your terminal to authenticate.
        </p>
      </div>
    );
  }

  // Generating key / sending to CLI
  if (step === "generating") {
    return (
      <div className="w-full max-w-sm px-6 text-center">
        <h1 className="text-2xl font-bold tracking-tight mb-2">orfc</h1>
        <p className="text-sm text-[var(--muted)]">Setting up your CLI...</p>
        <div className="mt-4 animate-pulse text-[var(--muted)]">●●●</div>
      </div>
    );
  }

  // Done!
  if (step === "done") {
    return (
      <div className="w-full max-w-sm px-6 text-center">
        <h1 className="text-2xl font-bold tracking-tight mb-2">orfc</h1>
        <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-sm font-medium text-green-800">
            ✓ Authenticated!
          </p>
          <p className="text-sm text-green-700 mt-1">
            You can close this tab and return to your terminal.
          </p>
        </div>
      </div>
    );
  }

  // Error state
  if (step === "error") {
    return (
      <div className="w-full max-w-sm px-6 text-center">
        <h1 className="text-2xl font-bold tracking-tight mb-2">orfc</h1>
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-700">{error}</p>
        </div>
        <button
          onClick={() => {
            setStep("email");
            setError("");
          }}
          className="mt-4 text-sm text-[var(--muted)] hover:text-[var(--fg)] transition-colors"
        >
          Try again
        </button>
      </div>
    );
  }

  // Sign-in form (same pattern as /auth/signin)
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
      // Signed in — generate key and send to CLI
      await generateAndSendKey();
    } else {
      setError("Invalid or expired code");
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-sm px-6">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold tracking-tight">orfc</h1>
        <p className="text-sm text-[var(--muted)] mt-1">
          Sign in to authenticate your CLI
        </p>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}

      {step === "email" && status !== "loading" ? (
        <div>
          <label className="block text-sm font-medium mb-2">
            Email address
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.com"
            className="w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
            onKeyDown={(e) => e.key === "Enter" && email && sendCode()}
            autoFocus
          />
          <button
            onClick={sendCode}
            disabled={!email || loading}
            className="w-full mt-3 py-2 bg-gray-900 text-white text-sm rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? "Sending..." : "Send sign-in code"}
          </button>
        </div>
      ) : step === "code" ? (
        <div>
          <p className="text-sm text-[var(--muted)] mb-4">
            We sent a 6-digit code to <strong>{email}</strong>
          </p>
          <label className="block text-sm font-medium mb-2">
            Verification code
          </label>
          <input
            type="text"
            value={code}
            onChange={(e) =>
              setCode(e.target.value.replace(/\D/g, "").slice(0, 6))
            }
            placeholder="123456"
            className="w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm text-center tracking-[0.3em] font-mono text-lg focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
            onKeyDown={(e) =>
              e.key === "Enter" && code.length === 6 && verifyCode()
            }
            autoFocus
          />
          <button
            onClick={verifyCode}
            disabled={code.length !== 6 || loading}
            className="w-full mt-3 py-2 bg-gray-900 text-white text-sm rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? "Verifying..." : "Sign in"}
          </button>
          <button
            onClick={() => {
              setStep("email");
              setCode("");
              setError("");
            }}
            className="w-full mt-2 py-2 text-sm text-[var(--muted)] hover:text-[var(--fg)] transition-colors"
          >
            Use a different email
          </button>
        </div>
      ) : (
        <div className="text-center text-sm text-[var(--muted)]">
          Loading...
        </div>
      )}
    </div>
  );
}

export default function CliAuthPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <Suspense
        fallback={
          <div className="text-[var(--muted)]">Loading...</div>
        }
      >
        <CliAuthFlow />
      </Suspense>
    </div>
  );
}
