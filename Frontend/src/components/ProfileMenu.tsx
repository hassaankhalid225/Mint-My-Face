"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { ChevronDown, LogOut, User } from "lucide-react";

function userInitial(name?: string | null, email?: string | null): string {
  const source = (name || email || "?").trim();
  return source.charAt(0).toUpperCase();
}

export default function ProfileMenu({ compact }: { compact?: boolean }) {
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const name = session?.user?.name ?? session?.user?.email ?? "Account";

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!session?.user) return null;

  return (
    <div className={`profile-menu${compact ? " profile-menu--compact" : ""}`} ref={rootRef}>
      <button
        type="button"
        className="profile-menu__trigger"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="Account menu"
      >
        <span className="profile-menu__avatar" aria-hidden>
          {userInitial(session.user.name, session.user.email)}
        </span>
        {!compact && <span className="profile-menu__name">{name}</span>}
        <ChevronDown
          size={16}
          className={`profile-menu__chevron${open ? " profile-menu__chevron--open" : ""}`}
          aria-hidden
        />
      </button>

      {open && (
        <div className="profile-menu__dropdown" role="menu">
          <Link
            href="/profile"
            className="profile-menu__item"
            role="menuitem"
            onClick={() => setOpen(false)}
          >
            <User size={16} aria-hidden />
            Profile
          </Link>
          <button
            type="button"
            className="profile-menu__item profile-menu__item--danger"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              signOut({ callbackUrl: "/" });
            }}
          >
            <LogOut size={16} aria-hidden />
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
