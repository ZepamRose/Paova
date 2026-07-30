/**
 * Email UX System — the shared shell every Paova email is built from.
 *
 * Emails are not web pages. Three constraints drive every decision here:
 *
 *  1. Outlook on Windows renders with Word, which ignores `max-width`, `display`
 *     and most of the box model on non-table elements. Layout is therefore
 *     tables, and the CTA puts its padding on a `<td>` rather than on the link.
 *  2. Gmail strips `<head>` styles in some contexts, so everything that matters
 *     is inlined. The `<style>` block only carries progressive enhancement.
 *  3. Apple Mail and Outlook.com re-colour emails in dark mode. Declaring the
 *     scheme and painting every cell explicitly keeps that predictable.
 *
 * Blocks return both HTML and plain text so the two versions can never drift:
 * one call site, one source of truth, two renderings.
 *
 * Adding an email:
 *
 *   const { html, text } = renderEmail({
 *     title: "…",              // <title> + fallback preview line
 *     preheader: "…",          // what the inbox shows next to the subject
 *     businessName, brandColor, logoUrl,
 *     blocks: [heading("…"), paragraph(html, text), button({…}), hint(…)],
 *     footerNote,              // tenant's own mention, optional
 *   });
 *
 * Then pass both to sendEmail. `paragraph` and `hint` take HTML *and* text
 * because only the caller knows which interpolations are markup and which are
 * user data — escape the latter with `escapeHtml`.
 */

/** A content block: its HTML and its plain-text equivalent. */
export type EmailBlock = { html: string; text: string };

export type RenderedEmail = { html: string; text: string };

// ---------------------------------------------------------------- tokens
const CONTENT_WIDTH = 560;

const T = {
  canvas: "#f1f3f5",
  surface: "#ffffff",
  text: "#1f2937",
  muted: "#5b6472",
  faint: "#8a929e",
  border: "#e4e7ec",
  onAccent: "#ffffff",
  /** Paova's own tone, used only in the footer signature. */
  paova: "#3f6b52",
} as const;

/**
 * Georgia stands in for Newsreader: no webfont survives Outlook, and Georgia is
 * the one serif present on Windows, macOS and iOS. It carries the identity's
 * editorial register without a network request.
 */
const SERIF = "Georgia, 'Times New Roman', Times, serif";
const SANS =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// ------------------------------------------------------- colour safety
function channel(v: number): number {
  const s = v / 255;
  return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}

function luminance(hex: string): number {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

/** Contrast ratio against white. */
export function contrastOnWhite(hex: string): number {
  return 1.05 / (luminance(hex) + 0.05);
}

/**
 * Tenants pick their own brand colour, and nothing stops them picking a pale
 * one. That colour ends up as heading text on white and as a button behind
 * white text, so an unchecked value can make a tenant's own email unreadable.
 *
 * Darkening in sRGB keeps the hue recognisable while lifting contrast to the
 * WCAG AA threshold. The tenant still sees their colour; they just always see
 * their text too.
 */
export function accessibleAccent(hex: string, minRatio = 4.5): string {
  if (!/^#[0-9a-fA-F]{6}$/.test(hex)) return "#1f2937";
  let r = parseInt(hex.slice(1, 3), 16);
  let g = parseInt(hex.slice(3, 5), 16);
  let b = parseInt(hex.slice(5, 7), 16);
  const toHex = () =>
    "#" +
    [r, g, b]
      .map((v) => Math.round(v).toString(16).padStart(2, "0"))
      .join("");

  // 40 steps of 4% is enough to take any colour to black-ish; the loop exits
  // as soon as the threshold is met, so a compliant colour is returned as-is.
  for (let i = 0; i < 40; i += 1) {
    if (contrastOnWhite(toHex()) >= minRatio) break;
    r *= 0.96;
    g *= 0.96;
    b *= 0.96;
  }
  return toHex();
}

// ------------------------------------------------------------- blocks
export function heading(text: string): EmailBlock {
  return {
    html: `<h1 style="margin:0 0 14px;font-family:${SERIF};font-size:23px;line-height:1.3;font-weight:normal;color:${T.text};">${escapeHtml(
      text,
    )}</h1>`,
    text: `${text}\n${"-".repeat(Math.min(text.length, 60))}`,
  };
}

/**
 * `html` is inserted verbatim, so callers escape their own interpolations —
 * they are the ones who know which fragments are markup (a <strong>) and which
 * are user data. `text` is the plain-text twin.
 */
export function paragraph(html: string, text: string): EmailBlock {
  return {
    html: `<p style="margin:0 0 14px;font-family:${SANS};font-size:15px;line-height:1.65;color:${T.text};">${html}</p>`,
    text,
  };
}

/** Secondary guidance: smaller and quieter, still above the 4.5:1 threshold. */
export function hint(html: string, text: string): EmailBlock {
  return {
    html: `<p style="margin:0 0 14px;font-family:${SANS};font-size:13px;line-height:1.6;color:${T.muted};">${html}</p>`,
    text,
  };
}

function contrastBetween(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/**
 * Pick a legible fill/label pair for a CTA, changing the tenant's colour as
 * little as possible.
 *
 * Darkening is the last resort, not the first: a pale brand colour reaches AA
 * immediately with a dark label, and turning someone's pale yellow into olive
 * to force white text would disfigure their brand for no reason. Only mid-tones
 * — too dark for dark text, too light for white — actually need shifting.
 */
export function buttonColors(brand: string): { bg: string; fg: string } {
  if (!/^#[0-9a-fA-F]{6}$/.test(brand)) return { bg: "#1f2937", fg: T.onAccent };
  if (contrastBetween(brand, T.onAccent) >= 4.5)
    return { bg: brand, fg: T.onAccent };
  if (contrastBetween(brand, T.text) >= 4.5) return { bg: brand, fg: T.text };
  return { bg: accessibleAccent(brand), fg: T.onAccent };
}

/**
 * Bulletproof CTA. Padding sits on the `<td>` and the background on `bgcolor`
 * as well as in CSS: Word honours the attribute, everything else the style.
 * A bare padded `<a>` — what the old templates used — collapses in Outlook.
 */
export function button(input: {
  href: string;
  label: string;
  color: string;
}): EmailBlock {
  const { bg, fg } = buttonColors(input.color);
  const href = escapeHtml(input.href);
  return {
    html: `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:22px 0;"><tr><td align="center" bgcolor="${bg}" style="background-color:${bg};border-radius:10px;padding:14px 24px;"><a href="${href}" style="display:inline-block;font-family:${SANS};font-size:15px;font-weight:600;line-height:1;color:${fg};text-decoration:none;">${escapeHtml(
      input.label,
    )}</a></td></tr></table>`,
    text: `${input.label} : ${input.href}`,
  };
}

/** Sign-off. Preserves the tenant's own line breaks. */
export function signature(text: string): EmailBlock {
  return {
    html: `<p style="margin:22px 0 0;font-family:${SANS};font-size:14px;line-height:1.6;color:${T.muted};white-space:pre-wrap;">${escapeHtml(
      text,
    )}</p>`,
    text: `\n${text}`,
  };
}

export function divider(): EmailBlock {
  return {
    html: `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="border-top:1px solid ${T.border};font-size:0;line-height:0;height:1px;">&nbsp;</td></tr></table>`,
    text: "\n---\n",
  };
}

// -------------------------------------------------------------- shell
/**
 * The official mark, inline.
 *
 * Same two frozen outlines as branding/paova-mark.svg — the geometry is copied,
 * not redrawn. What is dropped is the glass rendering: the real file carries 9
 * gradients and 2 clipPaths over 9 KB, which no mail client agrees on and which
 * would ride along in every message. A flat brand-green fill of the same shape
 * survives everywhere the SVG survives at all.
 *
 * And that is the catch worth stating: Gmail and both Outlooks strip <svg>
 * outright. So the mark never travels alone — the wordmark next to it is real
 * text, and it is what those clients show. Apple Mail renders the pair as the
 * full lockup; everywhere else the wordmark stands on its own. No broken state,
 * no external request, no attachment.
 */
const MARK_BOWL =
  "M35.16 86.9C34.77 84.25 38.91 82.74 39.97 80.58C40.56 79.37 40.75 77.86 41.04 76.55C41.29 75.43 41.3 73.67 42.4 73.07C43.45 72.5 48.99 75.78 51.91 75.53C54.24 75.33 56.96 72.65 58.83 71.36C63.61 68.01 70.84 66.5 71.33 59.53C71.45 57.88 71.43 55.99 70.66 54.5C68.92 51.11 62.76 47.82 59.54 45.87C50.35 40.34 29.2 30.44 23.18 22.91C16.5 14.54 20.18 1.31 31.67 0.67C38.41 0.3 52.17 12.37 58.47 15.91C66.5 20.41 81.25 27.63 87.82 33.26C91.33 36.27 94.61 40.48 96.22 44.84C99.47 53.65 97.75 69.16 92 76.67C86.73 83.56 77.19 86.01 70.01 90.23C65.74 92.73 61.92 96.5 57.04 97.81C50.2 99.64 45.38 95.18 40.16 91.51C38.6 90.41 35.46 88.94 35.16 86.9Z";
const MARK_STEM =
  "M39.63 46.82C40.92 47.66 40.25 50.78 40.2 52.12C40.04 57.15 41.63 62.4 40.41 67.4C39.26 72.07 29.98 72.49 27.13 77.26C23.75 82.9 26.73 97.9 26.81 104.7C26.88 109.42 26.72 114.75 24.11 118.87C19.19 126.63 9.15 125.8 3.99 118.79C-0.39 112.84 0.67 99.26 0.96 91.98C1.21 85.84 1.27 74.33 4.37 69.1C8.31 62.48 19.82 58.16 26.33 54.42C28.58 53.13 37.51 45.46 39.63 46.82Z";

function paovaMark(size = 26): string {
  const w = Math.round(size * (100 / 128.3));
  return `<svg width="${w}" height="${size}" viewBox="0 0 100 128.3" xmlns="http://www.w3.org/2000/svg" style="display:inline-block;vertical-align:middle;" role="img" aria-label="Paova"><path fill="${T.paova}" d="${MARK_BOWL}"/><path fill="${T.paova}" d="${MARK_STEM}"/></svg>`;
}

function headerBlock(input: {
  businessName: string;
  logoUrl?: string | null;
  accent: string;
}): string {
  // A tenant logo owns the header outright: two marks would read as a co-brand
  // nobody asked for.
  if (input.logoUrl) {
    return `<tr><td style="padding:26px 32px 0;"><img src="${escapeHtml(
      input.logoUrl,
    )}" alt="${escapeHtml(input.businessName)}" width="44" height="44" style="display:block;border:0;border-radius:8px;" /></td></tr>`;
  }
  return `<tr><td style="padding:26px 32px 0;">${paovaMark(26)}<span style="font-family:${SERIF};font-size:20px;color:${T.paova};padding-left:7px;vertical-align:middle;">paova</span><span style="font-family:${SANS};font-size:13px;color:${T.muted};padding-left:9px;vertical-align:middle;">${escapeHtml(
    input.businessName,
  )}</span></td></tr>`;
}

/**
 * Preheader: the grey line the inbox shows after the subject. Left unset, Gmail
 * pulls the first words of the body, which is usually "Bonjour". The trailing
 * entities pad it so no body text leaks into the preview.
 */
function preheaderBlock(text: string): string {
  if (!text) return "";
  return `<div style="display:none;font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all;">${escapeHtml(
    text,
  )}${"&#8199;&#65279;&#847; ".repeat(30)}</div>`;
}

export function renderEmail(input: {
  /** Used for <title> and as the document's accessible name. */
  title: string;
  /** Inbox preview line. Falls back to the title when omitted. */
  preheader?: string;
  businessName: string;
  brandColor: string;
  logoUrl?: string | null;
  blocks: EmailBlock[];
  /** Tenant footer note, shown above the Paova mention. */
  footerNote?: string | null;
}): RenderedEmail {
  const accent = accessibleAccent(input.brandColor);
  const body = input.blocks.map((b) => b.html).join("\n");

  const footerNote = (input.footerNote ?? "").trim();
  const footerHtml = `<tr><td style="padding:22px 32px 30px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="border-top:1px solid ${T.border};font-size:0;line-height:0;height:1px;">&nbsp;</td></tr></table>
      ${
        footerNote
          ? `<p style="margin:16px 0 6px;font-family:${SANS};font-size:12px;line-height:1.6;color:${T.faint};white-space:pre-wrap;">${escapeHtml(
              footerNote,
            )}</p>`
          : ""
      }
      <p style="margin:${footerNote ? "0" : "16px 0 0"};font-family:${SANS};font-size:12px;line-height:1.6;color:${T.faint};">Envoyé via <span style="color:${T.paova};font-family:${SERIF};">paova</span></p>
    </td></tr>`;

  const html = `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="fr">
<head>
<meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="x-apple-disable-message-reformatting" />
<meta name="color-scheme" content="light" />
<meta name="supported-color-schemes" content="light" />
<title>${escapeHtml(input.title)}</title>
<!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->
<style>
  a { color: ${accent}; }
  @media only screen and (max-width: 600px) {
    .p { padding-left: 22px !important; padding-right: 22px !important; }
  }
</style>
</head>
<body style="margin:0;padding:0;background-color:${T.canvas};">
${preheaderBlock(input.preheader ?? input.title)}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${T.canvas};">
<tr><td align="center" style="padding:28px 10px;">
<!--[if mso]><table role="presentation" width="${CONTENT_WIDTH}" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:${CONTENT_WIDTH}px;background-color:${T.surface};border:1px solid ${T.border};border-radius:14px;">
${headerBlock({ businessName: input.businessName, logoUrl: input.logoUrl, accent })}
<tr><td class="p" style="padding:20px 32px 4px;">
${body}
</td></tr>
${footerHtml}
</table>
<!--[if mso]></td></tr></table><![endif]-->
</td></tr>
</table>
</body>
</html>`;

  const text = [
    input.businessName,
    "",
    ...input.blocks.map((b) => b.text).filter(Boolean),
    "",
    footerNote,
    "Envoyé via Paova.",
  ]
    .filter((line) => line !== undefined)
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return { html, text };
}
