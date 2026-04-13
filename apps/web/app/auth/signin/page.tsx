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
        <div className="flex items-center justify-center gap-2.5 mb-3">
          <span
            className="inline-flex items-center justify-center h-8 w-8 rounded-[9px] text-[14px] font-bold shadow-sm"
            style={{ background: "var(--fg)", color: "var(--bg)" }}
          >
            o
          </span>
          <span
            className="text-[22px] font-bold tracking-tight"
            style={{ color: "var(--fg)" }}
          >
            orfc
          </span>
        </div>
        <p className="text-[13px]" style={{ color: "var(--muted)" }}>
          Sign in to continue
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

      {step === "email" ? (
        <div>
          <label
            className="block text-[12px] font-medium mb-2"
            style={{ color: "var(--fg-secondary)" }}
          >
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
            style={{
              background: "var(--fg)",
              color: "var(--bg)",
            }}
          >
            {loading ? "Sending..." : "Send sign-in code"}
          </button>
        </div>
      ) : (
        <div>
          <p className="text-[13px] mb-4" style={{ color: "var(--muted)" }}>
            We sent a 6-digit code to{" "}
            <strong style={{ color: "var(--fg)" }}>{email}</strong>
          </p>
          <label
            className="block text-[12px] font-medium mb-2"
            style={{ color: "var(--fg-secondary)" }}
          >
            Verification code
          </label>
          <input
            type="text"
            value={code}
            onChange={(e) =>
              setCode(e.target.value.replace(/\D/g, "").slice(0, 6))
            }
            placeholder="123456"
            className="w-full px-3 py-2.5 rounded-lg text-center tracking-[0.3em] font-mono text-lg outline-none transition-shadow"
            style={{
              background: "var(--bg)",
              border: "1px solid var(--border)",
              color: "var(--fg)",
            }}
            onFocus={(e) => (e.currentTarget.style.boxShadow = "0 0 0 3px var(--accent-light)")}
            onBlur={(e) => (e.currentTarget.style.boxShadow = "none")}
            onKeyDown={(e) =>
              e.key === "Enter" && code.length === 6 && verifyCode()
            }
            autoFocus
          />
          <button
            onClick={verifyCode}
            disabled={code.length !== 6 || loading}
            className="w-full mt-3 py-2.5 text-[13px] font-medium rounded-lg transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              background: "var(--fg)",
              color: "var(--bg)",
            }}
          >
            {loading ? "Verifying..." : "Sign in"}
          </button>
          <button
            onClick={() => {
              setStep("email");
              setCode("");
              setError("");
            }}
            className="w-full mt-2 py-2 text-[13px] transition-colors"
            style={{ color: "var(--muted)" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "var(--fg)")}
            onMouseLeave={(e) =>
              (e.currentTarget.style.color = "var(--muted)")
            }
          >
            Use a different email
          </button>
        </div>
      )}

      <div className="mt-6 text-center">
        <a
          href="/"
          className="text-[12px] transition-colors"
          style={{ color: "var(--muted)" }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "var(--fg)")}
          onMouseLeave={(e) =>
            (e.currentTarget.style.color = "var(--muted)")
          }
        >
          ← Back to home
        </a>
      </div>
    </div>
  );
}

export default function SignInPage() {
  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ background: "var(--bg-warm)" }}
    >
      <Suspense
        fallback={
          <div style={{ color: "var(--muted)" }}>Loading...</div>
        }
      >
        <SignInForm />
      </Suspense>
    </div>
  );
}
