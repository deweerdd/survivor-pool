import Link from "next/link";

export default function PoolNotFound() {
  return (
    <div className="flex items-center justify-center py-24 px-4">
      <div className="card-torch max-w-md mx-auto text-center">
        <h2>Pool Not Found</h2>
        <p className="text-muted-foreground mt-2 mb-6">
          This pool doesn&apos;t exist or may have been removed.
        </p>
        <Link href="/dashboard/pools" className="btn btn-primary">
          Back to pools
        </Link>
      </div>
    </div>
  );
}
