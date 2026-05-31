"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { CheckCircle, X } from "lucide-react";

export default function AuthWelcomeBanner() {
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (status !== "authenticated") return;
    const welcome = searchParams.get("welcome") === "1";
    const auth = searchParams.get("auth");
    const isNew =
      session?.user?.isNewUser === true || welcome || auth === "signup";
    if (isNew || welcome || auth === "signup") {
      setVisible(true);
    }
  }, [status, searchParams, session]);

  if (!visible || status !== "authenticated") return null;

  const name = session?.user?.name?.split(" ")[0] ?? "there";

  return (
    <div className="auth-welcome-banner" role="status">
      <CheckCircle size={20} aria-hidden />
      <p>
        {session?.user?.isNewUser
          ? `Welcome, ${name}! Your free account is ready.`
          : `Welcome back, ${name}!`}
      </p>
      <button
        type="button"
        className="auth-welcome-banner__close"
        onClick={() => setVisible(false)}
        aria-label="Dismiss"
      >
        <X size={18} />
      </button>
    </div>
  );
}
