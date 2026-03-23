export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen" style={{ backgroundColor: "var(--background)" }}>
      {/* Minimal header — just the logo */}
      <header className="flex justify-center py-6">
        <span
          className="text-display text-2xl font-semibold tracking-widest"
          style={{ color: "var(--primary)" }}
        >
          Survivor Pool
        </span>
      </header>
      <main className="max-w-lg mx-auto px-4 pb-12">{children}</main>
    </div>
  );
}
