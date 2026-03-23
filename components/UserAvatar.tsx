type Props = {
  avatarUrl?: string | null;
  fullName?: string | null;
  size?: "sm" | "md" | "lg";
};

const sizes = { sm: 24, md: 32, lg: 80 } as const;

const fontSizes = { sm: "0.5rem", md: "0.6875rem", lg: "1.5rem" } as const;

/** Deterministic color from a string — gives each user a distinct avatar hue. */
function hashColor(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = ((hash % 360) + 360) % 360;
  return `hsl(${hue}, 55%, 45%)`;
}

function getInitials(name: string | null | undefined): string {
  if (!name) return "??";
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase();
}

export default function UserAvatar({ avatarUrl, fullName, size = "md" }: Props) {
  const px = sizes[size];
  const initials = getInitials(fullName);

  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={fullName ?? "User avatar"}
        width={px}
        height={px}
        className="rounded-full object-cover shrink-0"
        style={{ width: px, height: px }}
      />
    );
  }

  return (
    <div
      className="rounded-full flex items-center justify-center font-bold shrink-0 text-white"
      style={{
        width: px,
        height: px,
        fontSize: fontSizes[size],
        backgroundColor: hashColor(fullName ?? "?"),
      }}
    >
      {initials}
    </div>
  );
}
