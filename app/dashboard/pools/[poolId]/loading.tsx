export default function PoolLoading() {
  return (
    <main className="px-4 py-6 sm:p-8 max-w-2xl mx-auto space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="h-10 w-64 bg-muted rounded animate-pulse" />
        <div className="h-10 w-36 bg-muted rounded animate-pulse" />
      </div>
      <div className="card p-0 overflow-hidden">
        <div className="px-5 pt-4 pb-3 border-b border-border flex gap-4">
          <div className="h-4 w-12 bg-muted rounded animate-pulse" />
          <div className="h-4 w-24 bg-muted rounded animate-pulse flex-1" />
          <div className="h-4 w-16 bg-muted rounded animate-pulse" />
        </div>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="px-5 py-3 border-b border-border flex items-center gap-4">
            <div className="h-5 w-8 bg-muted rounded animate-pulse" />
            <div className="h-5 w-32 bg-muted rounded animate-pulse flex-1" />
            <div className="h-5 w-12 bg-muted rounded animate-pulse" />
          </div>
        ))}
      </div>
    </main>
  );
}
