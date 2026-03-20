import Link from "next/link";

export default function PoolNotFound() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
      <h2 className="text-xl font-semibold text-gray-900">Pool not found</h2>
      <p className="text-sm text-gray-500">This pool doesn&#39;t exist or may have been removed.</p>
      <Link
        href="/dashboard/pools"
        className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
      >
        Back to pools
      </Link>
    </div>
  );
}
