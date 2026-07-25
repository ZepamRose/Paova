import { UsersRound } from "lucide-react";

/** Distinct icon for groups — never reuse the waiver/document icon. */
export function GroupIcon({
  className,
  size = 16,
}: {
  className?: string;
  size?: number;
}) {
  return (
    <UsersRound
      size={size}
      strokeWidth={1.85}
      className={className}
      aria-hidden
    />
  );
}
