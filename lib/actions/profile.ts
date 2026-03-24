"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { BUILT_IN_AVATARS } from "@/lib/avatars";

const TEAM_NAME_MIN = 2;
const TEAM_NAME_MAX = 30;
const BIO_MAX = 140;

/**
 * Strips angle brackets entirely — team names and bios have no legitimate use
 * for < or >, and this is more robust than regex-based tag stripping which can
 * miss malformed tags like `<img onerror=...>` or unclosed `<script`.
 */
function sanitizeText(str: string): string {
  return str.replace(/[<>]/g, "").trim();
}

export async function saveProfile(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // --- Validate team_name ---
  const rawTeamName = formData.get("team_name");
  if (typeof rawTeamName !== "string" || !rawTeamName.trim()) {
    return { error: "Team name is required." };
  }
  const teamName = sanitizeText(rawTeamName).slice(0, TEAM_NAME_MAX);
  if (teamName.length < TEAM_NAME_MIN) {
    return { error: `Team name must be at least ${TEAM_NAME_MIN} characters.` };
  }

  // --- Validate bio ---
  const rawBio = formData.get("bio");
  const bio = typeof rawBio === "string" ? sanitizeText(rawBio).slice(0, BIO_MAX) : null;

  // --- Validate favorite_season ---
  const rawSeason = formData.get("favorite_season");
  const favoriteSeason =
    typeof rawSeason === "string" && rawSeason.trim() ? rawSeason.trim() : null;

  // --- Email notifications ---
  const emailNotifications = formData.get("email_notifications") === "on";

  // --- Handle avatar ---
  let avatarUrl: string | null = null;
  const builtInAvatar = formData.get("built_in_avatar");

  if (typeof builtInAvatar === "string" && builtInAvatar) {
    // Validate it's an actual built-in avatar path
    const valid = BUILT_IN_AVATARS.some((a) => a.path === builtInAvatar);
    if (valid) {
      avatarUrl = builtInAvatar;
    }
  }

  // --- Fetch current profile for full_name fallback ---
  const { data: currentProfile } = await supabase
    .from("profiles")
    .select("full_name, avatar_url")
    .eq("id", user.id)
    .single();

  // Keep existing avatar if none selected
  if (!avatarUrl && currentProfile?.avatar_url) {
    avatarUrl = currentProfile.avatar_url;
  }

  // For email/password users with no Google name, use team_name as full_name
  const fullName = currentProfile?.full_name || teamName;

  // --- Update profile ---
  const { error: updateError } = await supabase
    .from("profiles")
    .update({
      team_name: teamName,
      display_name: teamName,
      full_name: fullName,
      avatar_url: avatarUrl,
      bio: bio || null,
      favorite_season: favoriteSeason,
      email_notifications: emailNotifications,
      profile_complete: true,
    })
    .eq("id", user.id);

  if (updateError) {
    return { error: "Failed to save profile. Please try again." };
  }

  redirect("/dashboard");
}
