import {
  googleFontsStylesheetUrl,
  resolveBrandFont,
} from "@/lib/brand-fonts";

/** Server-safe Google Fonts link for public brand surfaces. */
export function BrandFontLink({
  fontId,
}: {
  fontId?: string | null;
}) {
  const font = resolveBrandFont(fontId);
  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link
        rel="preconnect"
        href="https://fonts.gstatic.com"
        crossOrigin="anonymous"
      />
      <link rel="stylesheet" href={googleFontsStylesheetUrl(font)} />
    </>
  );
}
