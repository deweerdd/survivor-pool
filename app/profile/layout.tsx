import Link from "next/link";

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen" style={{ backgroundColor: "var(--background)" }}>
      <header className="flex items-center justify-between px-4 sm:px-6 py-4">
        <Link href="/dashboard" className="text-display text-xl tracking-wider">
          <span className="text-primary font-semibold">SURVIVOR</span>
          <span className="text-foreground font-semibold">POOL</span>
        </Link>
        <Link href="/dashboard" className="btn btn-ghost btn-sm">
          &larr; Dashboard
        </Link>
      </header>
      <main className="max-w-lg mx-auto px-4 pb-12">{children}</main>
    </div>
  );
}
