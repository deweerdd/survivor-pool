import { requireUser } from "@/lib/auth-utils";
import NavBar from "@/components/NavBar";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { supabase, user } = await requireUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin, team_name, full_name, avatar_url")
    .eq("id", user.id)
    .single();

  return (
    <div>
      <NavBar
        isAdmin={profile?.is_admin ?? false}
        email={user.email ?? ""}
        teamName={profile?.team_name}
        fullName={profile?.full_name}
        avatarUrl={profile?.avatar_url}
      />
      {children}
    </div>
  );
}
