"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { Loader } from "lucide-react";

type AuthMode = "login" | "signup";

type GoogleAuthButtonProps = {
  mode: AuthMode;
  callbackUrl: string;
  variant?: "primary" | "secondary";
};

function buildCallbackUrl(base: string, mode: AuthMode, isNewHint?: boolean): string {
  const url = new URL(base, window.location.origin);
  url.searchParams.set("auth", mode);
  if (mode === "signup") url.searchParams.set("welcome", "1");
  if (isNewHint) url.searchParams.set("welcome", "1");
  return url.pathname + url.search;
}

export default function GoogleAuthButton({
  mode,
  callbackUrl,
  variant = "primary",
}: GoogleAuthButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const label =
    mode === "login" ? "Continue with Google" : "Sign up with Google";

  const handleClick = async () => {
    setLoading(true);
    setError(null);
    try {
      const target = buildCallbackUrl(callbackUrl, mode);
      await signIn("google", {
        callbackUrl: target,
        redirect: true,
      });
    } catch {
      setError("Could not start Google sign-in. Check your .env keys.");
      setLoading(false);
    }
  };

  const btnClass =
    variant === "primary"
      ? "btn btn-primary auth-card__google-btn"
      : "btn btn-secondary auth-card__google-btn auth-card__google-btn--outline";

  return (
    <div className="google-auth-btn-wrap">
      <button
        type="button"
        className={btnClass}
        onClick={handleClick}
        disabled={loading}
        aria-busy={loading}
      >
        {loading ? (
          <Loader size={18} style={{ animation: "editor-spin 1s linear infinite" }} />
        ) : (
          <GoogleIcon colored={variant === "secondary"} />
        )}
        {loading ? "Connecting…" : label}
      </button>
      {error && <p className="auth-card__error">{error}</p>}
    </div>
  );
}

function GoogleIcon({ colored }: { colored?: boolean }) {
  const fill = colored ? undefined : "#fff";
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
      <path
        fill={fill ?? "#4285F4"}
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
      />
      <path
        fill={fill ?? "#34A853"}
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill={fill ?? "#FBBC05"}
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
      />
      <path
        fill={fill ?? "#EA4335"}
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}
