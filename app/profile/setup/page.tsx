import { requireUser } from "@/lib/auth-utils";
import { redirect } from "next/navigation";
import ProfileSetupForm from "@/components/ProfileSetupForm";

export default async function ProfileSetupPage() {
  const { supabase, user } = await requireUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, profile_complete")
    .eq("id", user.id)
    .single();

  // Already completed — go to dashboard
  if (profile?.profile_complete) redirect("/dashboard");

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h1>Set Up Your Profile</h1>
        {profile?.full_name && (
          <p style={{ color: "var(--muted-foreground)" }}>
            Welcome, <strong style={{ color: "var(--foreground)" }}>{profile.full_name}</strong>!
          </p>
        )}
        <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
          Choose a team name and avatar to get started.
        </p>
      </div>
      <div className="card-torch">
        <ProfileSetupForm mode="setup" />
      </div>
    </div>
  );
}
