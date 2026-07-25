function initialsFor(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

/**
 * Visual identity anchor for the dashboard header — the business's own logo
 * when set, otherwise initials on its brand color. Falls back to the app
 * brand color so it never renders as a plain, unbranded gray box.
 */
export function BusinessAvatar({
  name,
  logoUrl,
  brandColor,
  size = 44,
  className = "",
}: {
  name: string;
  logoUrl?: string | null;
  brandColor?: string | null;
  size?: number;
  className?: string;
}) {
  if (logoUrl) {
    return (
      <img
        src={logoUrl}
        alt=""
        width={size}
        height={size}
        className={`shrink-0 rounded-2xl object-cover shadow-[var(--elev-1)] ring-1 ring-[color-mix(in_srgb,var(--color-border)_70%,transparent)] ${className}`}
        style={{ width: size, height: size }}
      />
    );
  }

  const color = brandColor || "var(--color-brand)";

  return (
    <span
      aria-hidden
      className={`inline-flex shrink-0 items-center justify-center rounded-2xl text-[15px] font-semibold tracking-tight shadow-[var(--elev-1)] ring-1 ring-black/[0.03] dark:ring-white/[0.06] ${className}`}
      style={{
        width: size,
        height: size,
        backgroundColor: `color-mix(in srgb, ${color} 16%, var(--color-surface))`,
        color,
      }}
    >
      {initialsFor(name)}
    </span>
  );
}
