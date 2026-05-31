"use client";

import { useEffect, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Loader } from "lucide-react";

const REMEMBER_EMAIL_KEY = "mmf_remember_email";

export default function EmailLoginForm({ callbackUrl }: { callbackUrl: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(REMEMBER_EMAIL_KEY);
      if (saved) setEmail(saved);
    } catch {
      /* ignore */
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const result = await signIn("credentials", {
      email: email.trim(),
      password,
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      setError("Invalid email or password.");
      return;
    }

    try {
      if (remember) localStorage.setItem(REMEMBER_EMAIL_KEY, email.trim());
      else localStorage.removeItem(REMEMBER_EMAIL_KEY);
    } catch {
      /* ignore */
    }

    router.push(callbackUrl);
    router.refresh();
  };

  return (
    <form className="auth-email-form" onSubmit={handleSubmit}>
      <label className="auth-field">
        <span>Email</span>
        <input
          type="email"
          name="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
        />
      </label>
      <label className="auth-field">
        <span>Password</span>
        <input
          type="password"
          name="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Your password"
        />
      </label>
      <label className="auth-field auth-field--checkbox">
        <input
          type="checkbox"
          checked={remember}
          onChange={(e) => setRemember(e.target.checked)}
        />
        <span>Remember me on this device</span>
      </label>
      {error && (
        <p className="auth-card__error" role="alert">
          {error}
        </p>
      )}
      <button type="submit" className="btn btn-primary auth-card__google-btn" disabled={loading}>
        {loading ? (
          <>
            <Loader size={18} style={{ animation: "editor-spin 1s linear infinite" }} />
            Signing in…
          </>
        ) : (
          "Log in with email"
        )}
      </button>
    </form>
  );
}
