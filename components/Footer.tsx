export default function Footer() {
  return (
    <footer className="bg-surface text-muted-foreground">
      <hr className="divider-accent" />
      <div className="px-4 sm:px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm">
        <span className="text-display text-base tracking-wider">
          <span className="text-primary font-semibold">SURVIVOR</span>
          <span className="text-foreground font-semibold">POOL</span>
        </span>
        <div className="text-center sm:text-right text-xs leading-relaxed">
          <p>
            &copy; {new Date().getFullYear()} Survivor Pool. Not affiliated with CBS or Survivor.
          </p>
        </div>
      </div>
    </footer>
  );
}
