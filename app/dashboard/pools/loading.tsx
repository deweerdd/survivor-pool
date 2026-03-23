export default function PoolsLoading() {
  return (
    <main className="px-4 py-6 sm:p-8 max-w-2xl mx-auto space-y-6">
      <div className="h-10 w-48 bg-muted rounded animate-pulse" />
      <div className="card space-y-4">
        <div className="h-5 w-32 bg-muted rounded animate-pulse" />
        <div className="h-16 bg-muted rounded animate-pulse" />
      </div>
      <div className="card space-y-4">
        <div className="h-5 w-40 bg-muted rounded animate-pulse" />
        <div className="h-16 bg-muted rounded animate-pulse" />
      </div>
      <div className="card space-y-4">
        <div className="h-5 w-36 bg-muted rounded animate-pulse" />
        <div className="h-10 bg-muted rounded animate-pulse" />
      </div>
    </main>
  );
}
