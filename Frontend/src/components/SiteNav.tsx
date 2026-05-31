"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import SiteLogo from "@/components/SiteLogo";

type SiteNavProps = {
  priorityLogo?: boolean;
  variant?: "default" | "editor" | "auth";
};

function userInitial(name?: string | null, email?: string | null): string {
  const source = (name || email || "?").trim();
  return source.charAt(0).toUpperCase();
}

export default function SiteNav({ priorityLogo, variant }: SiteNavProps) {
  const pathname = usePathname();
  const isAuthPage =
    variant === "auth" || pathname === "/login" || pathname === "/signup";
  const isEditorPage = variant === "editor" || pathname === "/editor";
  const { data: session, status } = useSession();
  const isAuthed = status === "authenticated" && !!session?.user;
  const displayName = session?.user?.name ?? session?.user?.email ?? "";

  const authBlock = isAuthed ? (
    <div className="top-nav__identity">
      <span className="top-nav__avatar" aria-hidden>
        {userInitial(session?.user?.name, session?.user?.email)}
      </span>
      <span className="top-nav__user" title={session?.user?.email ?? undefined}>
        {displayName}
      </span>
      <button
        type="button"
        className="btn btn-tertiary top-nav__btn"
        onClick={() => signOut({ callbackUrl: "/" })}
      >
        Sign out
      </button>
    </div>
  ) : (
    <div className="top-nav__auth-guest">
      <Link href="/login" className="top-nav__link">
        Log in
      </Link>
      <Link href="/signup" className="btn btn-primary top-nav__btn">
        Sign up
        <ArrowRight size={16} aria-hidden />
      </Link>
    </div>
  );

  if (isAuthPage) {
    return (
      <nav className="top-nav top-nav--auth-minimal" aria-label="Authentication">
        <div className="container-main top-nav__inner top-nav__inner--auth-minimal">
          <SiteLogo size="md" priority={priorityLogo} />
          <Link href="/" className="top-nav__link">
            Home
          </Link>
        </div>
      </nav>
    );
  }

  if (isEditorPage) {
    return (
      <nav className="top-nav top-nav--editor" aria-label="Editor navigation">
        <div className="container-main top-nav__inner top-nav__inner--editor">
          <div className="top-nav__editor-left">
            <Link href="/" className="editor-back-link">
              <ArrowLeft size={18} aria-hidden />
              <span>Home</span>
            </Link>
          </div>

          <div className="top-nav__editor-center">
            <span className="editor-badge">Editor studio</span>
          </div>

          <div className="top-nav__editor-right">
            <Link href="/pricing" className="top-nav__link top-nav__link--compact">
              Pricing
            </Link>
            {authBlock}
          </div>
        </div>
      </nav>
    );
  }

  return (
    <nav className="top-nav top-nav--splash" aria-label="Main navigation">
      <div className="container-main top-nav__inner">
        <div className="top-nav__brand">
          <SiteLogo size="md" priority={priorityLogo} />
        </div>
        <div className="top-nav__right">
          <div className="top-nav__links">
            <Link href="/pricing" className="top-nav__link">
              Pricing
            </Link>
            <Link href="/editor" className="top-nav__link">
              Editor
            </Link>
          </div>
          <div className="top-nav__actions">
            {authBlock}
            {isAuthed && (
              <Link href="/editor" className="btn btn-secondary top-nav__btn top-nav__btn--cta">
                Start creating
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
