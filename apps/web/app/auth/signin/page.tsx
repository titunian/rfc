"use client";

import { signIn } from "next-auth/react";
import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";

function SignInForm() {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"email" | "code">("email");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/";

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
      window.location.href = callbackUrl;
    } else {
      setError("Invalid or expired code");
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-sm px-6">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold tracking-tight">orfc</h1>
        <p className="text-sm text-[var(--muted)] mt-1">Sign in to continue</p>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}

      {step === "email" ? (
        <div>
          <label className="block text-sm font-medium mb-2">Email address</label>
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
      ) : (
        <div>
          <p className="text-sm text-[var(--muted)] mb-4">
            We sent a 6-digit code to <strong>{email}</strong>
          </p>
          <label className="block text-sm font-medium mb-2">Verification code</label>
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            placeholder="123456"
            className="w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm text-center tracking-[0.3em] font-mono text-lg focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
            onKeyDown={(e) => e.key === "Enter" && code.length === 6 && verifyCode()}
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
            onClick={() => { setStep("email"); setCode(""); setError(""); }}
            className="w-full mt-2 py-2 text-sm text-[var(--muted)] hover:text-[var(--fg)] transition-colors"
          >
            Use a different email
          </button>
        </div>
      )}

      <div className="mt-6 text-center">
        <a href="/" className="text-xs text-[var(--muted)] hover:text-[var(--fg)]">
          ← Back to home
        </a>
      </div>
    </div>
  );
}

export default function SignInPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <Suspense fallback={<div className="text-[var(--muted)]">Loading...</div>}>
        <SignInForm />
      </Suspense>
    </div>
  );
}
