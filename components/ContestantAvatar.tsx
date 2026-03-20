type Props = {
  imgUrl?: string | null;
  name: string;
  size?: number;
};

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase();
}

export default function ContestantAvatar({ imgUrl, name, size = 32 }: Props) {
  if (imgUrl) {
    return (
      <img
        src={imgUrl}
        alt={name}
        width={size}
        height={size}
        className="rounded-full object-cover shrink-0"
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <div
      className="rounded-full bg-gray-300 text-gray-700 flex items-center justify-center font-semibold text-xs shrink-0"
      style={{ width: size, height: size }}
    >
      {getInitials(name)}
    </div>
  );
}
