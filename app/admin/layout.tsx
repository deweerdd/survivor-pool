import { requireUser } from "@/lib/auth-utils";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { supabase, user } = await requireUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!profile?.is_admin) redirect("/dashboard");

  return (
    <div>
      <nav className="border-b border-border bg-surface px-3 sm:px-6 py-2 flex flex-wrap gap-1 sm:gap-2">
        <Link href="/admin" className="nav-link text-sm">
          Admin Home
        </Link>
        <Link href="/admin/seasons" className="nav-link text-sm">
          Seasons
        </Link>
        <Link href="/admin/contestants" className="nav-link text-sm">
          Contestants
        </Link>
        <Link href="/admin/episodes" className="nav-link text-sm">
          Episodes
        </Link>
      </nav>
      <main className="px-3 py-6 sm:p-6">{children}</main>
    </div>
  );
}
