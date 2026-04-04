import { getInitials } from "@/lib/profile-utils";

type Props = {
  imgUrl?: string | null;
  name: string;
  size?: number;
};

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
      className="rounded-full bg-muted text-muted-foreground flex items-center justify-center font-semibold text-xs shrink-0"
      style={{ width: size, height: size }}
    >
      {getInitials(name)}
    </div>
  );
}
