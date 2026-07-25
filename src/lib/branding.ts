export const DEFAULT_BRAND_COLOR = "#5e926c";
export const DEFAULT_BUTTON_RADIUS = "soft" as const;
export const DEFAULT_PUBLIC_THEME = "light" as const;

export const BRAND_BUTTON_RADII = ["soft", "square"] as const;
export type BrandButtonRadius = (typeof BRAND_BUTTON_RADII)[number];

export const PUBLIC_THEMES = ["light", "dark"] as const;
export type PublicTheme = (typeof PUBLIC_THEMES)[number];

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

export function isBrandButtonRadius(
  value: string | null | undefined,
): value is BrandButtonRadius {
  return (
    typeof value === "string" &&
    (BRAND_BUTTON_RADII as readonly string[]).includes(value)
  );
}

export function resolveButtonRadius(
  value: string | null | undefined,
): BrandButtonRadius {
  return isBrandButtonRadius(value) ? value : DEFAULT_BUTTON_RADIUS;
}

/** Tailwind radius class for public brand CTAs. */
export function buttonRadiusClass(radius: BrandButtonRadius): string {
  return radius === "square" ? "rounded-md" : "rounded-xl";
}

export function isPublicTheme(
  value: string | null | undefined,
): value is PublicTheme {
  return (
    typeof value === "string" &&
    (PUBLIC_THEMES as readonly string[]).includes(value)
  );
}

export function resolvePublicTheme(
  value: string | null | undefined,
): PublicTheme {
  return isPublicTheme(value) ? value : DEFAULT_PUBLIC_THEME;
}

export function normalizeHexColor(
  value: string | null | undefined,
  fallback = DEFAULT_BRAND_COLOR,
): string {
  const raw = (value ?? "").trim();
  return HEX_COLOR.test(raw) ? raw.toLowerCase() : fallback;
}

/** Accent falls back to the primary brand color when unset. */
export function resolveAccentColor(
  brandColor: string | null | undefined,
  brandAccent: string | null | undefined,
): string {
  const primary = normalizeHexColor(brandColor);
  const raw = (brandAccent ?? "").trim();
  if (HEX_COLOR.test(raw)) return raw.toLowerCase();
  return primary;
}

export function clampText(
  value: unknown,
  max: number,
): string | null {
  const text = String(value ?? "").trim();
  if (!text) return null;
  return text.slice(0, max);
}

/** Allow only absolute http(s) URLs for thank-you CTAs. */
export function sanitizeHttpUrl(value: unknown): string | null {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  try {
    const url = new URL(raw);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.toString();
  } catch {
    return null;
  }
}

export function formatThankYouMessage(
  message: string | null | undefined,
  businessName: string,
  fallback: string,
): string {
  const raw = (message ?? "").trim();
  const base = raw || fallback;
  return base.replaceAll("{nom}", businessName);
}

export const PUBLIC_HEADER_STYLES = ["logo", "logo_name", "banner"] as const;
export type PublicHeaderStyle = (typeof PUBLIC_HEADER_STYLES)[number];
export const DEFAULT_PUBLIC_HEADER_STYLE: PublicHeaderStyle = "logo_name";

export function resolvePublicHeaderStyle(
  value: string | null | undefined,
): PublicHeaderStyle {
  return typeof value === "string" &&
    (PUBLIC_HEADER_STYLES as readonly string[]).includes(value)
    ? (value as PublicHeaderStyle)
    : DEFAULT_PUBLIC_HEADER_STYLE;
}

export const SUPPORTED_LOCALES = ["fr", "nl", "en", "de"] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];
export const DEFAULT_ENABLED_LOCALES: SupportedLocale[] = ["fr"];

export function resolveEnabledLocales(
  value: string[] | null | undefined,
): SupportedLocale[] {
  if (!Array.isArray(value) || value.length === 0) {
    return [...DEFAULT_ENABLED_LOCALES];
  }
  const picked = value.filter((code): code is SupportedLocale =>
    (SUPPORTED_LOCALES as readonly string[]).includes(code),
  );
  return picked.length > 0 ? picked : [...DEFAULT_ENABLED_LOCALES];
}

/** Form toggles send "1" / "0" via hidden inputs. */
export function formFlag(value: FormDataEntryValue | null, fallback = true): boolean {
  if (value == null || value === "") return fallback;
  return String(value) === "1" || String(value).toLowerCase() === "true";
}

/** Hostname-only custom domain (no protocol/path). */
export function sanitizeCustomDomain(value: unknown): string | null {
  const raw = String(value ?? "").trim().toLowerCase();
  if (!raw) return null;
  const withoutProtocol = raw.replace(/^https?:\/\//, "").split("/")[0] ?? "";
  const host = withoutProtocol.replace(/\.$/, "");
  if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/.test(host)) {
    return null;
  }
  return host;
}
