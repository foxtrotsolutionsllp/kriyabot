"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { LogoutButton } from "@/components/LogoutButton";
import { ProfileAvatar } from "@/components/ProfileAvatar";

export function AccountMenu({ name, email, avatar }: { name?: string; email?: string; avatar?: string | null }) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const closeOutside = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false); };
    const closeEscape = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    document.addEventListener("pointerdown", closeOutside);
    document.addEventListener("keydown", closeEscape);
    return () => { document.removeEventListener("pointerdown", closeOutside); document.removeEventListener("keydown", closeEscape); };
  }, []);
  return <div className="account-menu-wrap" ref={root}>
    <button className={`account-trigger ${open ? "account-trigger-open" : ""}`} type="button" aria-label="Open account menu" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen(value => !value)}>
      <ProfileAvatar value={avatar} name={name} className="topbar-avatar" /><span className="account-trigger-caret">⌄</span>
    </button>
    {open && <div className="account-menu" role="menu">
      <div className="account-menu-person"><ProfileAvatar value={avatar} name={name} className="account-menu-avatar" /><span><b>{name ?? "Kriyabot user"}</b><small>{email ?? "Workspace member"}</small></span></div>
      <Link href="/app/profile" role="menuitem" onClick={() => setOpen(false)}><span>◉</span> Profile & preferences <i>›</i></Link>
      <div className="account-menu-divider" />
      <div className="account-menu-signout"><LogoutButton /></div>
    </div>}
  </div>;
}
