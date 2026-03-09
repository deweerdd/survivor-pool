// Server component — top navigation bar
import Link from "next/link";
import { getProfile } from "@/lib/db/profiles";
import { SignOutButton } from "./sign-out-button";

export async function NavBar({ userId }: { userId: string }) {
  const profile = await getProfile(userId);

  return (
    <nav className="bg-white border-b border-gray-200 px-4">
      <div className="max-w-5xl mx-auto flex items-center justify-between h-14">
        <Link href="/dashboard" className="font-bold text-lg text-emerald-700">
          Survivor Pool
        </Link>

        <div className="flex items-center gap-4">
          {profile?.is_super_admin && (
            <Link
              href="/super-admin"
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              Admin
            </Link>
          )}
          <span className="text-sm text-gray-600">
            {profile?.display_name ?? "Player"}
          </span>
          <SignOutButton />
        </div>
      </div>
    </nav>
  );
}
