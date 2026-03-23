"use client";

export default function DashboardError({ reset }: { reset: () => void }) {
  return (
    <div className="flex items-center justify-center py-24 px-4">
      <div className="card-torch max-w-md mx-auto text-center">
        <h2>Something Went Wrong</h2>
        <p className="text-muted-foreground mt-2 mb-6">An unexpected error occurred.</p>
        <button onClick={reset} className="btn btn-primary">
          Try again
        </button>
      </div>
    </div>
  );
}
