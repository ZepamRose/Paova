/**
 * Curated brand typography for public pages, previews, and PDFs.
 * Keep this list short — only professional, highly legible sans fonts.
 */

export const BRAND_FONT_IDS = [
  "inter",
  "plus-jakarta-sans",
  "manrope",
  "dm-sans",
  "instrument-sans",
  "source-sans-3",
  "ibm-plex-sans",
  "nunito-sans",
] as const;

export type BrandFontId = (typeof BRAND_FONT_IDS)[number];

export type BrandFont = {
  id: BrandFontId;
  label: string;
  /** CSS font-family value */
  family: string;
  /** Google Fonts CSS2 family query (weights 400–700) */
  google: string;
  /** Filename under src/assets/fonts/ for PDF embedding (regular) */
  pdfFile: string;
};

export const BRAND_FONTS: readonly BrandFont[] = [
  {
    id: "inter",
    label: "Inter",
    family: "Inter, ui-sans-serif, system-ui, sans-serif",
    google: "Inter:wght@400;500;600;700",
    pdfFile: "Inter-Regular.ttf",
  },
  {
    id: "plus-jakarta-sans",
    label: "Plus Jakarta Sans",
    family: '"Plus Jakarta Sans", ui-sans-serif, system-ui, sans-serif',
    google: "Plus+Jakarta+Sans:wght@400;500;600;700",
    pdfFile: "PlusJakartaSans-Regular.ttf",
  },
  {
    id: "manrope",
    label: "Manrope",
    family: "Manrope, ui-sans-serif, system-ui, sans-serif",
    google: "Manrope:wght@400;500;600;700",
    pdfFile: "Manrope-Regular.ttf",
  },
  {
    id: "dm-sans",
    label: "DM Sans",
    family: '"DM Sans", ui-sans-serif, system-ui, sans-serif',
    google: "DM+Sans:wght@400;500;600;700",
    pdfFile: "DMSans-Regular.ttf",
  },
  {
    id: "instrument-sans",
    label: "Instrument Sans",
    family: '"Instrument Sans", ui-sans-serif, system-ui, sans-serif',
    google: "Instrument+Sans:wght@400;500;600;700",
    pdfFile: "InstrumentSans-Regular.ttf",
  },
  {
    id: "source-sans-3",
    label: "Source Sans 3",
    family: '"Source Sans 3", ui-sans-serif, system-ui, sans-serif',
    google: "Source+Sans+3:wght@400;500;600;700",
    pdfFile: "SourceSans3-Regular.ttf",
  },
  {
    id: "ibm-plex-sans",
    label: "IBM Plex Sans",
    family: '"IBM Plex Sans", ui-sans-serif, system-ui, sans-serif',
    google: "IBM+Plex+Sans:wght@400;500;600;700",
    pdfFile: "IBMPlexSans-Regular.ttf",
  },
  {
    id: "nunito-sans",
    label: "Nunito Sans",
    family: '"Nunito Sans", ui-sans-serif, system-ui, sans-serif',
    google: "Nunito+Sans:wght@400;500;600;700",
    pdfFile: "Inter-Regular.ttf", // Nunito TTF unavailable locally — Inter fallback for PDF
  },
] as const;

export const DEFAULT_BRAND_FONT: BrandFontId = "inter";

export function isBrandFontId(value: string): value is BrandFontId {
  return (BRAND_FONT_IDS as readonly string[]).includes(value);
}

export function resolveBrandFont(
  value: string | null | undefined,
): BrandFont {
  const id = value && isBrandFontId(value) ? value : DEFAULT_BRAND_FONT;
  return BRAND_FONTS.find((f) => f.id === id) ?? BRAND_FONTS[0];
}

export function googleFontsStylesheetUrl(font: BrandFont): string {
  return `https://fonts.googleapis.com/css2?family=${font.google}&display=swap`;
}
