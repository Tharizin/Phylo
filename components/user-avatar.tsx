import { cn } from "@/lib/utils";

function initialsFromUsername(username: string): string {
  const parts = username.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return username.slice(0, 2).toUpperCase();
}

function hueFromString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 360;
  return h;
}

export function UserAvatar({
  username,
  avatarUrl,
  size = "md",
  className,
}: {
  username: string;
  avatarUrl?: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const sizeClass = size === "sm" ? "h-8 w-8 text-xs" : size === "lg" ? "h-14 w-14 text-lg" : "h-10 w-10 text-sm";

  if (avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={avatarUrl}
        alt={`${username} avatar`}
        className={cn("shrink-0 rounded-full object-cover ring-2 ring-border/60", sizeClass, className)}
      />
    );
  }

  const hue = hueFromString(username);
  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full font-semibold text-white ring-2 ring-border/40",
        sizeClass,
        className
      )}
      style={{ backgroundColor: `hsl(${hue} 45% 42%)` }}
      aria-hidden
    >
      {initialsFromUsername(username)}
    </div>
  );
}
