import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!profile?.is_admin) redirect("/dashboard");

  return (
    <div>
      <nav className="border-b px-6 py-3 flex gap-6 text-sm font-medium">
        <Link href="/admin" className="hover:underline">
          Admin Home
        </Link>
        <Link href="/admin/seasons" className="hover:underline">
          Seasons
        </Link>
        <Link href="/admin/contestants" className="hover:underline">
          Contestants
        </Link>
        <Link href="/admin/episodes" className="hover:underline">
          Episodes
        </Link>
      </nav>
      <main className="p-6">{children}</main>
    </div>
  );
}
