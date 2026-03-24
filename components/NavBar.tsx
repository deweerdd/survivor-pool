"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import ThemeToggle from "@/components/ThemeToggle";
import UserAvatar from "@/components/UserAvatar";

type Props = {
  isAdmin: boolean;
  email: string;
  teamName?: string | null;
  fullName?: string | null;
  avatarUrl?: string | null;
};

export default function NavBar({ isAdmin, email, teamName, fullName, avatarUrl }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    if (drawerOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [drawerOpen]);

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  function closeDrawer() {
    setDrawerOpen(false);
  }

  const displayLabel = teamName || email;

  const links = [
    { href: "/dashboard", label: "Dashboard", active: pathname === "/dashboard" },
    {
      href: "/dashboard/pools",
      label: "My Pools",
      active: pathname.startsWith("/dashboard/pools"),
    },
    ...(isAdmin ? [{ href: "/admin", label: "Admin", active: pathname.startsWith("/admin") }] : []),
  ];

  return (
    <>
      <nav className="bg-surface border-b border-border px-4 sm:px-6 py-2">
        {/* Desktop */}
        <div className="hidden md:flex items-center justify-between">
          <Link href="/dashboard" className="text-display text-xl tracking-wider">
            <span className="text-primary font-semibold">SURVIVOR</span>
            <span className="text-foreground font-semibold">POOL</span>
          </Link>

          <div className="flex items-center gap-1">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`nav-link ${link.active ? "nav-link-active" : ""}`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <Link href="/profile/edit" className="flex items-center gap-2 hover:opacity-80">
              <UserAvatar avatarUrl={avatarUrl} fullName={fullName || email} size="sm" />
              <span className="text-label">{displayLabel}</span>
            </Link>
            <ThemeToggle />
            <button onClick={handleSignOut} className="btn btn-ghost btn-sm">
              Sign Out
            </button>
          </div>
        </div>

        {/* Mobile */}
        <div className="flex md:hidden items-center justify-between">
          <Link href="/dashboard" className="text-display text-lg tracking-wider">
            <span className="text-primary font-semibold">SURVIVOR</span>
            <span className="text-foreground font-semibold">POOL</span>
          </Link>

          <div className="flex items-center gap-1">
            <ThemeToggle />
            <button
              className="nav-hamburger"
              onClick={() => setDrawerOpen(true)}
              aria-label="Open menu"
            >
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              >
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile overlay */}
      <div
        className={`nav-overlay ${drawerOpen ? "nav-overlay-open" : ""}`}
        onClick={closeDrawer}
      />

      {/* Mobile drawer */}
      <div className={`nav-drawer ${drawerOpen ? "nav-drawer-open" : ""}`}>
        <div className="p-6 flex flex-col gap-4">
          <div className="flex justify-end">
            <button className="nav-hamburger" onClick={closeDrawer} aria-label="Close menu">
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              >
                <line x1="6" y1="6" x2="18" y2="18" />
                <line x1="6" y1="18" x2="18" y2="6" />
              </svg>
            </button>
          </div>

          {/* User info in drawer */}
          <div className="flex items-center gap-3 mb-2">
            <UserAvatar avatarUrl={avatarUrl} fullName={fullName || email} size="md" />
            <div>
              <p className="font-semibold text-sm" style={{ color: "var(--foreground)" }}>
                {displayLabel}
              </p>
              {teamName && (
                <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
                  {email}
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`nav-link text-lg ${link.active ? "nav-link-active" : ""}`}
                onClick={closeDrawer}
              >
                {link.label}
              </Link>
            ))}
            <Link
              href="/profile/edit"
              className={`nav-link text-lg ${pathname.startsWith("/profile") ? "nav-link-active" : ""}`}
              onClick={closeDrawer}
            >
              Edit Profile
            </Link>
          </div>

          <hr className="divider-accent" />

          <button onClick={handleSignOut} className="btn btn-ghost btn-sm self-start">
            Sign Out
          </button>
        </div>
      </div>
    </>
  );
}
