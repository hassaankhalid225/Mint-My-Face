"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft, ArrowRight } from "lucide-react";
import SiteLogo from "@/components/SiteLogo";
import ProfileMenu from "@/components/ProfileMenu";
import { useSession } from "next-auth/react";

type SiteNavProps = {
  priorityLogo?: boolean;
  variant?: "default" | "editor";
};

export default function SiteNav({ priorityLogo, variant }: SiteNavProps) {
  const pathname = usePathname();
  const isEditorPage = variant === "editor" || pathname === "/editor";
  const onLoginOrSignup = pathname === "/login" || pathname === "/signup";
  const { status } = useSession();
  const isAuthed = status === "authenticated";

  const guestAuth = onLoginOrSignup ? null : (
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

  const authBlock = isAuthed ? <ProfileMenu compact={isEditorPage} /> : guestAuth;

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
          <div className="top-nav__actions">{authBlock}</div>
        </div>
      </div>
    </nav>
  );
}
