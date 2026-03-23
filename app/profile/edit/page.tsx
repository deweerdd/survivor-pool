import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import ProfileSetupForm from "@/components/ProfileSetupForm";

export default async function ProfileEditPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("team_name, avatar_url, bio, favorite_season, email_notifications")
    .eq("id", user.id)
    .single();

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h1>Edit Profile</h1>
        <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
          Update your team name, avatar, and preferences.
        </p>
      </div>
      <div className="card-torch">
        <ProfileSetupForm
          mode="edit"
          defaults={{
            teamName: profile?.team_name,
            avatarUrl: profile?.avatar_url,
            bio: profile?.bio,
            favoriteSeason: profile?.favorite_season,
            emailNotifications: profile?.email_notifications ?? true,
          }}
        />
      </div>
    </div>
  );
}
