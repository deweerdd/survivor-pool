"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

type Mode = "sign-in" | "sign-up";

export default function LoginForm({ signInWithGoogle }: { signInWithGoogle: () => Promise<void> }) {
  const [mode, setMode] = useState<Mode>("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [confirmationSent, setConfirmationSent] = useState(false);
  const router = useRouter();

  const supabase = createClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (mode === "sign-up") {
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        });
        if (signUpError) {
          setError(signUpError.message);
        } else {
          setConfirmationSent(true);
        }
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) {
          setError(signInError.message);
        } else {
          router.push("/dashboard");
          router.refresh();
        }
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (confirmationSent) {
    return (
      <div className="card-torch text-center space-y-4 max-w-md mx-auto">
        <div className="flex justify-center">
          <svg
            width="48"
            height="48"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--secondary)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
            <polyline points="22,6 12,13 2,6" />
          </svg>
        </div>
        <h3>Check Your Email</h3>
        <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
          We sent a confirmation link to{" "}
          <strong style={{ color: "var(--foreground)" }}>{email}</strong>. Click the link to
          activate your account.
        </p>
        <button
          onClick={() => {
            setConfirmationSent(false);
            setMode("sign-in");
          }}
          className="btn btn-ghost btn-sm"
        >
          Back to Sign In
        </button>
      </div>
    );
  }

  return (
    <div className="card-torch max-w-md mx-auto space-y-6">
      {/* Mode toggle */}
      <div className="flex rounded-sm overflow-hidden border border-border">
        <button
          type="button"
          onClick={() => {
            setMode("sign-in");
            setError(null);
          }}
          className={`flex-1 py-2 text-sm font-semibold text-display tracking-wider uppercase transition-colors ${
            mode === "sign-in"
              ? "bg-primary text-primary-foreground"
              : "bg-surface text-muted-foreground hover:text-foreground"
          }`}
        >
          Sign In
        </button>
        <button
          type="button"
          onClick={() => {
            setMode("sign-up");
            setError(null);
          }}
          className={`flex-1 py-2 text-sm font-semibold text-display tracking-wider uppercase transition-colors ${
            mode === "sign-up"
              ? "bg-primary text-primary-foreground"
              : "bg-surface text-muted-foreground hover:text-foreground"
          }`}
        >
          Create Account
        </button>
      </div>

      {/* Email/password form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="text-label block mb-1.5">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            placeholder="you@example.com"
            className="input"
          />
        </div>
        <div>
          <label htmlFor="password" className="text-label block mb-1.5">
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            autoComplete={mode === "sign-up" ? "new-password" : "current-password"}
            placeholder={mode === "sign-up" ? "Min. 8 characters" : "Your password"}
            className="input"
          />
        </div>

        {error && <div className="callout callout-danger text-sm">{error}</div>}

        <button type="submit" disabled={loading} className="btn btn-torch w-full py-3">
          {loading ? "Please wait..." : mode === "sign-up" ? "Create Account" : "Sign In"}
        </button>
      </form>

      {/* Divider */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-border" />
        <span
          className="text-xs uppercase tracking-widest"
          style={{ color: "var(--muted-foreground)" }}
        >
          or continue with
        </span>
        <div className="flex-1 h-px bg-border" />
      </div>

      {/* Google OAuth */}
      <form action={signInWithGoogle}>
        <button type="submit" className="btn btn-outline w-full py-3 gap-3">
          <svg width="18" height="18" viewBox="0 0 24 24">
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A10.96 10.96 0 0 0 1 12c0 1.77.42 3.45 1.18 4.93l3.66-2.84z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              fill="#EA4335"
            />
          </svg>
          Google
        </button>
      </form>
    </div>
  );
}
