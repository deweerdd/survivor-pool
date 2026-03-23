"use client";

import { useRef, useState, useActionState } from "react";
import { saveProfile } from "@/lib/actions/profile";
import { BUILT_IN_AVATARS } from "@/lib/avatars";
import ThemeToggle from "@/components/ThemeToggle";

type Props = {
  mode: "setup" | "edit";
  defaults?: {
    teamName?: string | null;
    avatarUrl?: string | null;
    bio?: string | null;
    favoriteSeason?: string | null;
    emailNotifications?: boolean;
  };
};

type State = { error: string | null };

async function formAction(_prev: State, formData: FormData): Promise<State> {
  const result = await saveProfile(formData);
  // If saveProfile returns, it means there was an error (otherwise it redirects)
  return { error: result?.error ?? null };
}

export default function ProfileSetupForm({ mode, defaults }: Props) {
  const [state, dispatch, isPending] = useActionState(formAction, { error: null });

  const [selectedBuiltIn, setSelectedBuiltIn] = useState<string>(
    defaults?.avatarUrl && BUILT_IN_AVATARS.some((a) => a.path === defaults.avatarUrl)
      ? defaults.avatarUrl
      : ""
  );
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);
  const [bio, setBio] = useState(defaults?.bio ?? "");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isCustomUpload =
    defaults?.avatarUrl && !BUILT_IN_AVATARS.some((a) => a.path === defaults.avatarUrl);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedBuiltIn("");
      setUploadPreview(URL.createObjectURL(file));
    }
  }

  function selectBuiltIn(path: string) {
    setSelectedBuiltIn(path);
    setUploadPreview(null);
    // Clear the file input
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  return (
    <form action={dispatch} className="space-y-8">
      {/* Team Name */}
      <div>
        <label htmlFor="team_name" className="text-label block mb-1.5">
          Team Name <span style={{ color: "var(--destructive)" }}>*</span>
        </label>
        <input
          id="team_name"
          name="team_name"
          type="text"
          required
          minLength={2}
          maxLength={30}
          defaultValue={defaults?.teamName ?? ""}
          placeholder="e.g. Tribal Council Terrors"
          className="input"
        />
        <p className="text-xs mt-1" style={{ color: "var(--muted-foreground)" }}>
          This is how you appear on leaderboards (2–30 characters).
        </p>
      </div>

      {/* Avatar Selection */}
      <div>
        <span className="text-label block mb-3">Choose Your Avatar</span>

        {/* Built-in avatars grid */}
        <div className="grid grid-cols-4 gap-3 mb-4">
          {BUILT_IN_AVATARS.map((avatar) => (
            <button
              key={avatar.id}
              type="button"
              onClick={() => selectBuiltIn(avatar.path)}
              className="p-2 rounded-lg border-2 transition-all hover:scale-105"
              style={{
                borderColor: selectedBuiltIn === avatar.path ? "var(--primary)" : "var(--border)",
                backgroundColor:
                  selectedBuiltIn === avatar.path ? "var(--surface-raised)" : "var(--surface)",
                boxShadow:
                  selectedBuiltIn === avatar.path
                    ? "0 0 12px color-mix(in srgb, var(--ember) 30%, transparent)"
                    : "none",
              }}
              title={avatar.label}
            >
              <img
                src={avatar.path}
                alt={avatar.label}
                width={48}
                height={48}
                className="mx-auto"
              />
            </button>
          ))}
        </div>

        {/* Upload option */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="btn btn-outline btn-sm"
          >
            Upload Photo
          </button>
          {(uploadPreview || (isCustomUpload && !selectedBuiltIn)) && (
            <img
              src={uploadPreview ?? defaults?.avatarUrl ?? ""}
              alt="Preview"
              width={40}
              height={40}
              className="rounded-full object-cover"
              style={{ width: 40, height: 40 }}
            />
          )}
          {uploadPreview && (
            <span className="text-xs" style={{ color: "var(--secondary)" }}>
              Ready to upload
            </span>
          )}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          name="avatar_file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleFileChange}
          className="hidden"
        />
        {/* Hidden field for selected built-in avatar */}
        <input type="hidden" name="built_in_avatar" value={selectedBuiltIn} />
      </div>

      {/* Bio */}
      <div>
        <label htmlFor="bio" className="text-label block mb-1.5">
          Bio / Tagline
        </label>
        <textarea
          id="bio"
          name="bio"
          maxLength={140}
          rows={2}
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          placeholder="The tribe has spoken... in my favor"
          className="input resize-none"
        />
        <p className="text-xs mt-1" style={{ color: "var(--muted-foreground)" }}>
          {bio.length}/140
        </p>
      </div>

      {/* Favorite Season */}
      <div>
        <label htmlFor="favorite_season" className="text-label block mb-1.5">
          Favorite Survivor Season
        </label>
        <input
          id="favorite_season"
          name="favorite_season"
          type="text"
          maxLength={60}
          defaultValue={defaults?.favoriteSeason ?? ""}
          placeholder="e.g. Heroes vs. Villains"
          className="input"
        />
      </div>

      {/* Email Notifications */}
      <div className="flex items-center justify-between">
        <div>
          <span className="text-label block">Email Notifications</span>
          <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
            Get episode reminders and deadline alerts
          </p>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            name="email_notifications"
            defaultChecked={defaults?.emailNotifications ?? true}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-muted rounded-full peer-checked:bg-primary transition-colors peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-ring after:content-[''] after:absolute after:top-0.5 after:start-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full" />
        </label>
      </div>

      {/* Theme Toggle */}
      <div className="flex items-center justify-between">
        <div>
          <span className="text-label block">Theme</span>
          <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
            Light or dark mode
          </p>
        </div>
        <ThemeToggle />
      </div>

      {/* Error */}
      {state.error && <div className="callout callout-danger text-sm">{state.error}</div>}

      {/* Submit */}
      <button type="submit" disabled={isPending} className="btn btn-torch w-full py-3">
        {isPending ? "Saving..." : mode === "setup" ? "Complete Setup" : "Save Changes"}
      </button>
    </form>
  );
}
