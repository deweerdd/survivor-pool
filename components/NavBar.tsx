"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function NavBar({ isAdmin, email }: { isAdmin: boolean; email: string }) {
  const router = useRouter();
  const supabase = createClient();

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <nav className="border-b px-3 sm:px-6 py-3 flex items-center justify-between text-sm font-medium">
      <div className="flex items-center gap-3 sm:gap-6">
        <Link href="/dashboard" className="text-base font-bold">
          Survivor Pool
        </Link>
        <Link href="/dashboard" className="hover:underline">
          Dashboard
        </Link>
        <Link href="/dashboard/pools" className="hover:underline">
          My Pools
        </Link>
      </div>
      <div className="flex items-center gap-2 sm:gap-4">
        {isAdmin && (
          <Link href="/admin" className="hover:underline">
            Admin
          </Link>
        )}
        <span className="hidden sm:inline text-gray-500">{email}</span>
        <button onClick={handleSignOut} className="text-red-600 hover:underline cursor-pointer">
          Sign Out
        </button>
      </div>
    </nav>
  );
}
