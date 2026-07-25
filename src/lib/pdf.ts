import { readFile } from "fs/promises";
import path from "path";
import fontkit from "@pdf-lib/fontkit";
import { PDFDocument, StandardFonts, rgb, type PDFPage, type PDFFont } from "pdf-lib";

export type WaiverField = {
  key: string;
  label: string;
  type: string;
  required: boolean;
};

export type WaiverPdfProof = {
  reference: string;
  signedAt: string;
  timezone: string | null;
  timezoneOffsetMinutes: number | null;
  ipAddress: string | null;
  userAgent: string | null;
  deviceHint: string | null;
  templateVersion: number;
  contentSha256: string;
  hashAlgorithm: string;
};

export type GenerateWaiverPdfInput = {
  title: string;
  legalText: string;
  fields: WaiverField[];
  signerName: string;
  signerNameLabel?: string | null;
  signerEmail: string | null;
  answers: Record<string, unknown>;
  signatureDataUrl: string | null;
  ipAddress: string | null;
  signedAt: string;
  businessName: string | null;
  brandColor: string;
  brandAccent?: string | null;
  brandFont?: string | null;
  logoUrl: string | null;
  tagline?: string | null;
  contactAddress?: string | null;
  contactPhone?: string | null;
  contactEmail?: string | null;
  websiteUrl?: string | null;
  showLogo?: boolean;
  showName?: boolean;
  showContact?: boolean;
  showWebsite?: boolean;
  showPhone?: boolean;
  showFooter?: boolean;
  /** Digital evidence dossier — rendered as "Preuves de signature". */
  proof?: WaiverPdfProof | null;
};

function formatTimezoneOffset(minutes: number | null): string | null {
  if (minutes == null || !Number.isFinite(minutes)) return null;
  const sign = minutes >= 0 ? "+" : "-";
  const abs = Math.abs(minutes);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  return `UTC${sign}${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** Normalize IPv4-mapped IPv6 (::ffff:x.x.x.x) for a cleaner proof display. */
function formatDisplayIp(ip: string | null | undefined): string | null {
  if (!ip) return null;
  const t = ip.trim();
  const mapped = /^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/i.exec(t);
  return mapped ? mapped[1]! : t;
}

function formatDob(value: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : value;
}

async function loadBrandWordmarkFont(
  pdf: PDFDocument,
  fallback: PDFFont,
): Promise<PDFFont> {
  try {
    pdf.registerFontkit(fontkit);
    const fontPath = path.join(
      process.cwd(),
      "src/assets/fonts/PlusJakartaSans-SemiBold.ttf",
    );
    const bytes = await readFile(fontPath);
    return await pdf.embedFont(bytes, { subset: true });
  } catch (err) {
    console.error("Brand wordmark font failed, using fallback:", err);
    return fallback;
  }
}

async function loadBusinessBrandFont(
  pdf: PDFDocument,
  brandFontId: string | null | undefined,
  fallback: PDFFont,
): Promise<PDFFont> {
  // No explicit brand font → keep Helvetica (reliable WinAnsi embedding).
  if (!brandFontId) return fallback;
  try {
    const { resolveBrandFont } = await import("@/lib/brand-fonts");
    const brandFont = resolveBrandFont(brandFontId);
    pdf.registerFontkit(fontkit);
    const fontPath = path.join(
      process.cwd(),
      "src/assets/fonts",
      brandFont.pdfFile,
    );
    const bytes = await readFile(fontPath);
    return await pdf.embedFont(bytes, { subset: true });
  } catch (err) {
    console.error("Business brand font failed, using fallback:", err);
    return fallback;
  }
}

/** Draw "paova" with slight tracking so it feels designed, not dumped. */
function drawWordmark(
  page: PDFPage,
  font: PDFFont,
  x: number,
  y: number,
  size: number,
  color: { r: number; g: number; b: number },
) {
  const tracking = size * 0.04;
  let cursor = x;
  for (const ch of "paova") {
    page.drawText(ch, {
      x: cursor,
      y,
      size,
      font,
      color: rgb(color.r, color.g, color.b),
    });
    cursor += font.widthOfTextAtSize(ch, size) + tracking;
  }
}

const PAGE_WIDTH = 595.28; // A4
const PAGE_HEIGHT = 841.89;
const MARGIN_X = 44;
const MARGIN_TOP = 22;
const MARGIN_BOTTOM = 46;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_X * 2;

/** Print-safe neutrals — soft, Paova-calm, readable in B&W. */
const ink = { r: 0.1, g: 0.11, b: 0.13 };
const muted = { r: 0.4, g: 0.42, b: 0.46 };
const softMuted = { r: 0.55, g: 0.57, b: 0.6 };
const soft = { r: 0.986, g: 0.987, b: 0.988 };
const codeBg = { r: 0.978, g: 0.979, b: 0.98 };
const line = { r: 0.91, g: 0.915, b: 0.92 };

/** Shared Paova graphic language — same weight, same accent, same rhythm. */
const BORDER = 0.28;
const ACCENT_BAR = 2;
const ACCENT_MARK_W = 20;
const ACCENT_MARK_H = 0.8;
const FIELD_GAP = 2.5;
const FIELD_GUTTER = 10;
const SECTION_BEFORE = 6;
const SECTION_AFTER = 4;
const LABEL_SIZE = 5.5;
const VALUE_SIZE = 9.5;

const paovaGreen = { r: 0x6b / 255, g: 0x8f / 255, b: 0x71 / 255 };

/** Soften ALL-CAPS admin labels into sentence case for a premium feel. */
function formatFieldLabel(label: string): string {
  const t = label.trim();
  if (!t) return t;
  const letters = t.replace(/[^a-zA-ZÀ-ÿ]/g, "");
  if (!letters.length) return t;
  let upper = 0;
  for (const ch of letters) {
    if (ch === ch.toUpperCase() && ch !== ch.toLowerCase()) upper += 1;
  }
  if (upper / letters.length < 0.65) return t;
  const small = new Set([
    "de",
    "du",
    "des",
    "le",
    "la",
    "les",
    "et",
    "ou",
    "à",
    "a",
    "en",
    "au",
    "aux",
  ]);
  return t
    .toLowerCase()
    .split(/(\s+|\/)/)
    .map((part, i) => {
      if (part === "/" || /^\s+$/.test(part) || !part) return part;
      if (i > 0 && small.has(part)) return part;
      return part.charAt(0).toUpperCase() + part.slice(1);
    })
    .join("");
}

function wrap(
  text: string,
  size: number,
  maxWidth: number,
  usedFont: PDFFont,
): string[] {
  const lines: string[] = [];
  for (const paragraph of text.split("\n")) {
    if (!paragraph.trim()) {
      lines.push("");
      continue;
    }
    const words = paragraph.split(/\s+/);
    let current = "";
    for (const word of words) {
      const candidate = current ? `${current} ${word}` : word;
      if (usedFont.widthOfTextAtSize(candidate, size) > maxWidth && current) {
        lines.push(current);
        current = word;
      } else {
        current = candidate;
      }
    }
    if (current) lines.push(current);
  }
  return lines;
}

/** Build a signed-waiver PDF and return its bytes. */
export async function generateWaiverPdf(
  input: GenerateWaiverPdfInput,
): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const fontMono = await pdf.embedFont(StandardFonts.Courier);
  const wordmarkFont = await loadBrandWordmarkFont(pdf, fontBold);
  const businessFont = await loadBusinessBrandFont(
    pdf,
    input.brandFont,
    fontBold,
  );

  let page: PDFPage = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let y = PAGE_HEIGHT - MARGIN_TOP;
  /** Raised when a proof band is reserved at the bottom of the page. */
  let contentFloor = MARGIN_BOTTOM;

  function ensureSpace(needed: number) {
    if (y - needed < contentFloor) {
      page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      y = PAGE_HEIGHT - MARGIN_TOP;
      drawPageChrome();
    }
  }

  function gap(amount: number) {
    y -= amount;
  }

  function drawLines(
    text: string,
    size: number,
    options?: {
      bold?: boolean;
      color?: { r: number; g: number; b: number };
      lineGap?: number;
      x?: number;
      maxWidth?: number;
    },
  ) {
    const usedFont = options?.bold ? fontBold : font;
    const color = options?.color ?? ink;
    const maxWidth = options?.maxWidth ?? CONTENT_WIDTH;
    const x = options?.x ?? MARGIN_X;
    const lineGap = options?.lineGap ?? size * 0.45;
    const lines = wrap(text, size, maxWidth, usedFont);

    for (const lineText of lines) {
      ensureSpace(size + lineGap);
      if (lineText) {
        page.drawText(lineText, {
          x,
          y: y - size,
          size,
          font: usedFont,
          color: rgb(color.r, color.g, color.b),
        });
      }
      y -= size + lineGap;
    }
  }

  function drawHairline(weight = BORDER) {
    ensureSpace(6);
    page.drawRectangle({
      x: MARGIN_X,
      y: y - weight,
      width: CONTENT_WIDTH,
      height: weight,
      color: rgb(line.r, line.g, line.b),
    });
    gap(SECTION_AFTER);
  }

  /** Shared section underline: hairline + short Paova accent mark. */
  function drawSectionRule(withAccent = true) {
    page.drawRectangle({
      x: MARGIN_X,
      y: y - BORDER,
      width: CONTENT_WIDTH,
      height: BORDER,
      color: rgb(line.r, line.g, line.b),
    });
    if (withAccent) {
      page.drawRectangle({
        x: MARGIN_X,
        y: y - ACCENT_MARK_H,
        width: ACCENT_MARK_W,
        height: ACCENT_MARK_H,
        color: rgb(paovaGreen.r, paovaGreen.g, paovaGreen.b),
      });
    }
  }

  function drawAccentBar(x: number, bottom: number, height: number) {
    page.drawRectangle({
      x,
      y: bottom,
      width: ACCENT_BAR,
      height,
      color: rgb(paovaGreen.r, paovaGreen.g, paovaGreen.b),
    });
  }

  function drawSectionTitle(
    title: string,
    options?: { secondary?: boolean },
  ) {
    const secondary = options?.secondary === true;
    const size = secondary ? 7.5 : 8;
    ensureSpace(secondary ? 18 : 22);
    gap(secondary ? SECTION_BEFORE - 1 : SECTION_BEFORE);

    page.drawText(title, {
      x: MARGIN_X,
      y: y - size,
      size,
      font: fontBold,
      color: rgb(muted.r, muted.g, muted.b),
    });
    y -= size + 2.5;
    drawSectionRule(!secondary);
    gap(secondary ? SECTION_AFTER - 1 : SECTION_AFTER);
  }

  function drawFieldBox(
    x: number,
    width: number,
    label: string,
    value: string,
    options?: {
      emphasize?: boolean;
      mono?: boolean;
      compact?: boolean;
      spacious?: boolean;
      secondary?: boolean;
    },
  ): number {
    const emphasize = options?.emphasize === true;
    const secondary = options?.secondary === true;
    const useMono = options?.mono === true;
    const spacious = options?.spacious === true;
    const labelSize = LABEL_SIZE;
    const valueSize = emphasize ? 10 : secondary ? 9 : VALUE_SIZE;
    const valueFont = useMono ? fontMono : fontBold;
    const labelGap = 1.8;
    const bottomPad = spacious ? 6 : 4;
    const valueLines = wrap(value || "—", valueSize, width, valueFont);
    const lineStep = valueSize + (spacious ? 2 : 1.6);
    const blockH =
      labelSize + labelGap + valueLines.length * lineStep + bottomPad;

    let cy = y;
    page.drawText(formatFieldLabel(label), {
      x,
      y: cy - labelSize,
      size: labelSize,
      font,
      color: rgb(softMuted.r, softMuted.g, softMuted.b),
    });
    cy -= labelSize + labelGap;
    for (const lineText of valueLines) {
      page.drawText(lineText, {
        x,
        y: cy - valueSize,
        size: valueSize,
        font: valueFont,
        color: rgb(ink.r, ink.g, ink.b),
      });
      cy -= lineStep;
    }
    return blockH;
  }

  function drawField(
    label: string,
    value: string,
    options?: {
      emphasize?: boolean;
      mono?: boolean;
      compact?: boolean;
      spacious?: boolean;
      secondary?: boolean;
    },
  ) {
    const valueSize = options?.emphasize
      ? 10
      : options?.secondary
        ? 9
        : VALUE_SIZE;
    const valueFont = options?.mono ? fontMono : fontBold;
    const approxLines = wrap(
      value || "—",
      valueSize,
      CONTENT_WIDTH,
      valueFont,
    ).length;
    const approxH = LABEL_SIZE + 3 + approxLines * (valueSize + 1.8) + 6;
    ensureSpace(approxH);
    const blockH = drawFieldBox(MARGIN_X, CONTENT_WIDTH, label, value, {
      ...options,
      compact: options?.compact !== false,
    });
    y -= blockH + FIELD_GAP;
  }

  /** Two fields side-by-side — identical column rhythm. */
  function drawFieldPair(
    left: {
      label: string;
      value: string;
      mono?: boolean;
      emphasize?: boolean;
      secondary?: boolean;
    },
    right: {
      label: string;
      value: string;
      mono?: boolean;
      emphasize?: boolean;
      secondary?: boolean;
    },
    options?: { spacious?: boolean },
  ) {
    const colW = (CONTENT_WIDTH - FIELD_GUTTER) / 2;
    ensureSpace(36);
    const hLeft = drawFieldBox(MARGIN_X, colW, left.label, left.value, {
      mono: left.mono,
      emphasize: left.emphasize,
      secondary: left.secondary,
      compact: true,
      spacious: options?.spacious,
    });
    const hRight = drawFieldBox(
      MARGIN_X + colW + FIELD_GUTTER,
      colW,
      right.label,
      right.value,
      {
        mono: right.mono,
        emphasize: right.emphasize,
        secondary: right.secondary,
        compact: true,
        spacious: options?.spacious,
      },
    );
    const rowH = Math.max(hLeft, hRight);
    y -= rowH;
    page.drawRectangle({
      x: MARGIN_X,
      y: y + 2,
      width: CONTENT_WIDTH,
      height: BORDER,
      color: rgb(line.r, line.g, line.b),
    });
    gap(FIELD_GAP + 2);
  }

  type ProofCell = {
    label: string;
    value: string | string[];
    mono?: boolean;
  };

  /** Compact 2-column technical grid (fiche technique). */
  function measureProofGridHeight(cells: ProofCell[]): number {
    const gutter = FIELD_GUTTER + 6;
    const colW = (CONTENT_WIDTH - gutter) / 2;
    const labelSize = 5;
    const valueSize = 8.5;
    const padY = 2.5;
    const gapLV = 1.2;
    const valueStep = valueSize + 1.2;
    let total = 0;
    for (let i = 0; i < cells.length; i += 2) {
      const left = cells[i]!;
      const right = cells[i + 1];
      const measure = (value: string | string[], mono?: boolean) => {
        const lines = Array.isArray(value)
          ? value
          : wrap(value || "—", valueSize, colW, mono ? fontMono : fontBold);
        return (
          padY +
          labelSize +
          gapLV +
          Math.max(1, lines.length) * valueStep +
          padY
        );
      };
      total += Math.max(
        measure(left.value, left.mono),
        right ? measure(right.value, right.mono) : 0,
      );
      if (i + 2 < cells.length) total += 0.3;
    }
    return total;
  }

  function drawProofGrid(cells: ProofCell[]) {
    const gutter = FIELD_GUTTER + 6;
    const colW = (CONTENT_WIDTH - gutter) / 2;
    const labelSize = 5;
    const valueSize = 8.5;
    const padY = 2.5;
    const gapLV = 1.2;
    const valueStep = valueSize + 1.2;

    const measure = (value: string | string[], mono?: boolean) => {
      const lines = Array.isArray(value)
        ? value
        : wrap(value || "—", valueSize, colW, mono ? fontMono : fontBold);
      return (
        padY +
        labelSize +
        gapLV +
        Math.max(1, lines.length) * valueStep +
        padY
      );
    };

    const drawCell = (
      x: number,
      cell: ProofCell,
      top: number,
      height: number,
    ) => {
      const lines = Array.isArray(cell.value)
        ? cell.value
        : wrap(
            cell.value || "—",
            valueSize,
            colW,
            cell.mono ? fontMono : fontBold,
          );
      let cy = top - padY;
      page.drawText(formatFieldLabel(cell.label), {
        x,
        y: cy - labelSize,
        size: labelSize,
        font,
        color: rgb(softMuted.r, softMuted.g, softMuted.b),
      });
      cy -= labelSize + gapLV;
      for (const lineText of lines.length ? lines : ["—"]) {
        page.drawText(lineText, {
          x,
          y: cy - valueSize,
          size: valueSize,
          font: cell.mono ? fontMono : fontBold,
          color: rgb(ink.r, ink.g, ink.b),
        });
        cy -= valueStep;
      }
      return height;
    };

    const rowHeights: number[] = [];
    for (let i = 0; i < cells.length; i += 2) {
      const left = cells[i]!;
      const right = cells[i + 1];
      rowHeights.push(
        Math.max(
          measure(left.value, left.mono),
          right ? measure(right.value, right.mono) : 0,
        ),
      );
    }

    for (let i = 0; i < cells.length; i += 2) {
      const left = cells[i]!;
      const right = cells[i + 1];
      const rowH = rowHeights[i / 2]!;
      const isLast = i + 2 >= cells.length;
      const top = y;
      drawCell(MARGIN_X, left, top, rowH);
      if (right) {
        drawCell(MARGIN_X + colW + gutter, right, top, rowH);
      }
      y -= rowH;
      if (!isLast) {
        page.drawRectangle({
          x: MARGIN_X,
          y,
          width: CONTENT_WIDTH,
          height: BORDER,
          color: rgb(line.r, line.g, line.b),
        });
        gap(0.3);
      }
    }
  }

  function drawPageChrome() {
    page.drawRectangle({
      x: 0,
      y: PAGE_HEIGHT - 2,
      width: PAGE_WIDTH,
      height: 2,
      color: rgb(paovaGreen.r, paovaGreen.g, paovaGreen.b),
    });
  }

  /** Draw the Paova P + optional "paova" wordmark on any page. */
  function drawPaovaBrandOn(
    target: PDFPage,
    x: number,
    yTop: number,
    height: number,
    withName: boolean,
    nameColor: { r: number; g: number; b: number } = softMuted,
  ) {
    const markScale = height / 140;
    const markStroke = 12;
    target.drawSvgPath("M56 110 L79 35", {
      x,
      y: yTop,
      scale: markScale,
      borderWidth: markStroke,
      borderColor: rgb(paovaGreen.r, paovaGreen.g, paovaGreen.b),
    });
    target.drawSvgPath("M40 48 C56 12 118 10 112 50 C106 84 73 84 56 73", {
      x,
      y: yTop,
      scale: markScale,
      borderWidth: markStroke,
      borderColor: rgb(paovaGreen.r, paovaGreen.g, paovaGreen.b),
    });
    if (withName) {
      const nameSize = Math.max(8, height * 0.46);
      drawWordmark(
        target,
        wordmarkFont,
        x + height + 6,
        yTop - height / 2 - nameSize * 0.32,
        nameSize,
        nameColor,
      );
    }
  }

  // ── Header brand bar ──────────────────────────────────────────────
  drawPageChrome();

  const showLogo = input.showLogo !== false;
  const showName = input.showName !== false;
  const showContact = input.showContact !== false;
  const showPhone = input.showPhone !== false;
  const showWebsite = input.showWebsite === true;
  const showFooter = input.showFooter !== false;

  // ── Logo (business, or Paova wordmark as fallback) ────────────────
  let drewBusinessLogo = false;
  if (showLogo && input.logoUrl) {
    try {
      const res = await fetch(input.logoUrl, {
        signal: AbortSignal.timeout(4_000),
      });
      if (res.ok) {
        const buf = new Uint8Array(await res.arrayBuffer());
        const isPng = buf[0] === 0x89 && buf[1] === 0x50;
        const isJpg = buf[0] === 0xff && buf[1] === 0xd8;
        if (isPng || isJpg) {
          const logo = isPng ? await pdf.embedPng(buf) : await pdf.embedJpg(buf);
          const maxH = 15;
          const scale = maxH / logo.height;
          const w = logo.width * scale;
          ensureSpace(maxH + 2);
          page.drawImage(logo, {
            x: MARGIN_X,
            y: y - maxH,
            width: w,
            height: maxH,
          });
          y -= maxH + 2;
          drewBusinessLogo = true;
        }
      }
    } catch {
      // Ignore logo failures; fall back to Paova branding below.
    }
  }

  // No client logo → show discreet Paova brand in the header.
  if (!drewBusinessLogo) {
    const logoH = 13;
    ensureSpace(logoH + 2);
    drawPaovaBrandOn(page, MARGIN_X, y, logoH, true, muted);
    y -= logoH + 2;
  }

  // ── Business name + tagline + contact ─────────────────────────────
  if (showName && input.businessName) {
    const size = 8;
    const label = input.businessName.trim();
    const lines = wrap(label, size, CONTENT_WIDTH, businessFont);
    for (const lineText of lines) {
      ensureSpace(size + 1);
      if (lineText) {
        page.drawText(lineText, {
          x: MARGIN_X,
          y: y - size,
          size,
          font: businessFont,
          color: rgb(muted.r, muted.g, muted.b),
        });
      }
      y -= size + 1;
    }
  }

  const tagline = input.tagline?.trim();
  if (tagline) {
    const size = 7;
    const lines = wrap(tagline, size, CONTENT_WIDTH, font);
    gap(showName && input.businessName ? 0.5 : 0);
    for (const lineText of lines) {
      ensureSpace(size + 1);
      if (lineText) {
        page.drawText(lineText, {
          x: MARGIN_X,
          y: y - size,
          size,
          font,
          color: rgb(softMuted.r, softMuted.g, softMuted.b),
        });
      }
      y -= size + 1;
    }
  }

  const contactParts = [
    showContact ? input.contactAddress?.trim() : "",
    showPhone ? input.contactPhone?.trim() : "",
    showContact ? input.contactEmail?.trim() : "",
    showWebsite ? input.websiteUrl?.trim() : "",
  ].filter((v): v is string => Boolean(v));
  if (contactParts.length > 0) {
    const size = 6.5;
    const contactLine = contactParts.join("  ·  ");
    const lines = wrap(contactLine, size, CONTENT_WIDTH, font);
    gap(tagline || (showName && input.businessName) ? 1 : 0);
    for (const lineText of lines) {
      ensureSpace(size + 1);
      if (lineText) {
        page.drawText(lineText, {
          x: MARGIN_X,
          y: y - size,
          size,
          font,
          color: rgb(softMuted.r, softMuted.g, softMuted.b),
        });
      }
      y -= size + 1;
    }
  }

  // Breathing room before the document title (focal point)
  gap(
    (showName && input.businessName) || tagline || contactParts.length > 0
      ? 6
      : 4,
  );

  // ── Document title ────────────────────────────────────────────────
  {
    const size = 15;
    const lines = wrap(input.title, size, CONTENT_WIDTH, fontBold);
    for (const lineText of lines) {
      ensureSpace(size + 1.4);
      if (lineText) {
        page.drawText(lineText, {
          x: MARGIN_X,
          y: y - size,
          size,
          font: fontBold,
          color: rgb(ink.r, ink.g, ink.b),
        });
      }
      y -= size + 1.4;
    }
  }
  gap(1.5);
  drawLines("Décharge de responsabilité signée", 7, {
    color: muted,
    lineGap: 0.8,
  });
  gap(3.5);
  drawHairline(BORDER);

  // ── Legal text (Notion/Stripe soft panel — no full box) ────────────
  drawSectionTitle("Texte juridique");

  const legalSize = 8.5;
  const legalLineGap = 2.4;
  const legalPadY = 7;
  const legalPadX = 10;
  const legalLines = wrap(
    input.legalText,
    legalSize,
    CONTENT_WIDTH - legalPadX * 2 - ACCENT_BAR,
    font,
  );
  const legalBlockHeight =
    legalLines.length * (legalSize + legalLineGap) + legalPadY * 2;

  ensureSpace(legalBlockHeight + 4);
  const legalTop = y;
  page.drawRectangle({
    x: MARGIN_X,
    y: legalTop - legalBlockHeight,
    width: CONTENT_WIDTH,
    height: legalBlockHeight,
    color: rgb(soft.r, soft.g, soft.b),
  });
  drawAccentBar(MARGIN_X, legalTop - legalBlockHeight, legalBlockHeight);

  y = legalTop - legalPadY;
  for (const lineText of legalLines) {
    if (lineText) {
      page.drawText(lineText, {
        x: MARGIN_X + legalPadX,
        y: y - legalSize,
        size: legalSize,
        font,
        color: rgb(ink.r, ink.g, ink.b),
      });
    }
    y -= legalSize + legalLineGap;
  }
  y = legalTop - legalBlockHeight - 5;

  // ── Signer ────────────────────────────────────────────────────────
  drawSectionTitle("Signataire");
  if (input.signerEmail) {
    drawFieldPair(
      { label: input.signerNameLabel || "Nom", value: input.signerName },
      { label: "Email", value: input.signerEmail },
    );
  } else {
    drawField(input.signerNameLabel || "Nom", input.signerName, {
      emphasize: true,
    });
  }

  // ── Custom fields ─────────────────────────────────────────────────
  const signerNameNorm = input.signerName.trim().toLowerCase();
  const signerEmailNorm = (input.signerEmail ?? "").trim().toLowerCase();

  const isRedundantWithSigner = (field: WaiverField, value: string) => {
    const v = value.trim().toLowerCase();
    if (!v || v === "—") return false;
    const t = field.type.toLowerCase();
    if (signerEmailNorm && (t === "email" || v === signerEmailNorm)) {
      return v === signerEmailNorm;
    }
    if (signerNameNorm && v === signerNameNorm) return true;
    return false;
  };

  const customFields = input.fields.filter((field) => {
    const raw = input.answers[field.key];
    if (Array.isArray(raw) || typeof raw === "boolean" || field.type === "checkbox") {
      return true;
    }
    const value = String(raw ?? "").trim() || "—";
    return !isRedundantWithSigner(field, value);
  });

  const hasCustomFields = customFields.length > 0;
  if (hasCustomFields) {
    drawSectionTitle("Informations");

    type PendingField = {
      label: string;
      value: string;
      secondary?: boolean;
      mono?: boolean;
    };

    const pendingBool: PendingField[] = [];
    const pendingShort: PendingField[] = [];

    const flushBoolPair = () => {
      while (pendingBool.length >= 2) {
        const a = pendingBool.shift()!;
        const b = pendingBool.shift()!;
        drawFieldPair(
          { ...a, secondary: true },
          { ...b, secondary: true },
        );
      }
    };
    const flushBoolRemain = () => {
      flushBoolPair();
      while (pendingBool.length > 0) {
        const a = pendingBool.shift()!;
        drawField(a.label, a.value, { secondary: true });
      }
    };
    const flushShortPair = () => {
      while (pendingShort.length >= 2) {
        const a = pendingShort.shift()!;
        const b = pendingShort.shift()!;
        drawFieldPair(
          { ...a, secondary: true },
          { ...b, secondary: true },
        );
      }
    };
    const flushShortRemain = () => {
      flushShortPair();
      while (pendingShort.length > 0) {
        const a = pendingShort.shift()!;
        drawField(a.label, a.value, { secondary: true });
      }
    };
    const flushAllPending = () => {
      flushBoolRemain();
      flushShortRemain();
    };

    const isPairable = (type: string, value: string) => {
      const t = type.toLowerCase();
      if (
        t === "textarea" ||
        t === "long_text" ||
        t === "participants" ||
        t === "minors"
      ) {
        return false;
      }
      if (
        t === "tel" ||
        t === "phone" ||
        t === "email" ||
        t === "date" ||
        t === "number"
      ) {
        return true;
      }
      return value.length > 0 && value.length <= 42 && !value.includes("\n");
    };

    for (const field of customFields) {
      const raw = input.answers[field.key];

      if (Array.isArray(raw)) {
        flushAllPending();
        ensureSpace(24);
        drawLines(formatFieldLabel(field.label), 7, {
          bold: true,
          color: muted,
          lineGap: 1.2,
        });
        gap(4);

        if (raw.length === 0) {
          drawField("Participants", "—", { secondary: true });
          continue;
        }

        for (let i = 0; i < raw.length; i++) {
          const p = raw[i] as { name?: string; dob?: string; note?: string };
          const name = String(p?.name ?? "").trim() || "—";
          const dob = p?.dob ? formatDob(String(p.dob)) : "";
          const note = String(p?.note ?? "").trim();

          const nameSize = 9.5;
          const metaSize = 7.5;
          const noteSize = 6.5;
          const rowH = note ? 18 : 13;
          ensureSpace(rowH + 3);

          page.drawText(`${i + 1}.`, {
            x: MARGIN_X,
            y: y - 9.5,
            size: 8,
            font: fontBold,
            color: rgb(paovaGreen.r, paovaGreen.g, paovaGreen.b),
          });

          page.drawText(name, {
            x: MARGIN_X + 14,
            y: y - 9.5,
            size: nameSize,
            font: fontBold,
            color: rgb(ink.r, ink.g, ink.b),
          });

          if (dob) {
            const nameW = fontBold.widthOfTextAtSize(name, nameSize);
            page.drawText(`  ·  né(e) le ${dob}`, {
              x: MARGIN_X + 14 + nameW,
              y: y - 9.5,
              size: metaSize,
              font,
              color: rgb(muted.r, muted.g, muted.b),
            });
          }

          if (note) {
            page.drawText(note, {
              x: MARGIN_X + 14,
              y: y - 16.5,
              size: noteSize,
              font,
              color: rgb(softMuted.r, softMuted.g, softMuted.b),
            });
          }

          y -= rowH;
          page.drawRectangle({
            x: MARGIN_X,
            y: y + 1,
            width: CONTENT_WIDTH,
            height: BORDER,
            color: rgb(line.r, line.g, line.b),
          });
          gap(2);
        }
        gap(1);
        continue;
      }

      if (typeof raw === "boolean" || field.type === "checkbox") {
        flushShortRemain();
        pendingBool.push({
          label: field.label,
          value: raw === true || raw === "true" ? "Oui" : "Non",
        });
        flushBoolPair();
        continue;
      }

      flushBoolRemain();
      const value = String(raw ?? "").trim() || "—";
      if (isPairable(field.type, value)) {
        pendingShort.push({ label: field.label, value });
        flushShortPair();
      } else {
        flushShortRemain();
        drawField(field.label, value, { secondary: true });
      }
    }
    flushAllPending();
  }

  // ── Prepare proof layout (measured so we can pin it to page bottom)
  type ProofLayout = {
    cells: ProofCell[];
    hashLines: string[];
    summaryLabel: string;
    summaryLines: string[];
    height: number;
  };

  let proofLayout: ProofLayout | null = null;
  if (input.proof) {
    const p = input.proof;
    const signedDate = new Date(p.signedAt);
    const displayTz =
      p.timezone && p.timezone.trim() ? p.timezone.trim() : "UTC";
    let stampLine: string;
    try {
      const dateLine = signedDate.toLocaleDateString("fr-FR", {
        day: "numeric",
        month: "short",
        year: "numeric",
        timeZone: displayTz,
      });
      const timeLine = signedDate.toLocaleTimeString("fr-FR", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
        timeZone: displayTz,
      });
      stampLine = `${dateLine} · ${timeLine}`;
    } catch {
      stampLine = signedDate.toLocaleString("fr-FR", {
        dateStyle: "medium",
        timeStyle: "medium",
        timeZone: "UTC",
      });
    }

    const tzOffset = formatTimezoneOffset(p.timezoneOffsetMinutes);
    const tzValue =
      displayTz === "UTC"
        ? tzOffset
          ? `UTC · ${tzOffset}`
          : "UTC"
        : tzOffset
          ? `${displayTz} · ${tzOffset}`
          : displayTz;

    const parts = (p.deviceHint ?? "")
      .split("·")
      .map((s) => s.trim())
      .filter(Boolean);
    const browser =
      parts[0] ||
      (p.userAgent
        ? p.userAgent.length > 48
          ? `${p.userAgent.slice(0, 45)}…`
          : p.userAgent
        : null);
    const system = parts[1] || null;
    const device = parts[2] || null;
    const displayIp = formatDisplayIp(p.ipAddress);

    const cells: ProofCell[] = [
      { label: "Référence", value: p.reference, mono: true },
      { label: "Horodatage", value: stampLine },
      { label: "Version", value: String(p.templateVersion) },
      { label: "Fuseau horaire", value: tzValue },
    ];
    if (browser) cells.push({ label: "Navigateur", value: browser });
    if (system) cells.push({ label: "Système", value: system });
    if (displayIp) {
      cells.push({ label: "Adresse IP", value: displayIp, mono: true });
    }
    if (device) cells.push({ label: "Appareil", value: device });

    const hash = p.contentSha256.toLowerCase().replace(/[^0-9a-f]/g, "");
    const groups = hash.match(/.{1,4}/g) ?? [hash];
    const hashLines: string[] = [];
    for (let i = 0; i < groups.length; i += 10) {
      hashLines.push(groups.slice(i, i + 10).join(" "));
    }

    const summaryLabel = "Résumé  ·  ";
    const summary =
      "Contenu figé · version archivée · horodatage · SHA-256 · données techniques conservées.";
    const summaryLabelW = fontBold.widthOfTextAtSize(summaryLabel, 6.5);
    const summaryLines = wrap(
      summary,
      6.5,
      CONTENT_WIDTH - summaryLabelW,
      font,
    );

    const monoSize = 6.5;
    const monoGap = 1.5;
    const hashPadY = 3.5;
    const codeH =
      hashPadY * 2 + hashLines.length * (monoSize + monoGap) - monoGap;

    const height =
      /* title */ 9 +
      2.5 +
      BORDER +
      5 +
      /* résumé */ summaryLines.length * (6.5 + 1.5) +
      4 +
      /* fiche title */ 7 +
      3 +
      measureProofGridHeight(cells) +
      /* sha */ 5 +
      5.5 +
      2 +
      codeH +
      4 +
      /* eidas */ 6;

    proofLayout = {
      cells,
      hashLines,
      summaryLabel,
      summaryLines,
      height,
    };
  }

  /** Keep legal body above the pinned proof band when possible. */
  const bodyFloor = MARGIN_BOTTOM + (proofLayout ? proofLayout.height + 12 : 0);
  contentFloor = bodyFloor;

  // ── Signature — human focal point (accent only, no hollow grey card)
  gap(10);
  const signedAt = new Date(input.signedAt).toLocaleString("fr-FR", {
    dateStyle: "long",
    timeStyle: "short",
  });
  const signedLabel = `Signée électroniquement le ${signedAt}`;

  {
    let sigImg: Awaited<ReturnType<typeof pdf.embedPng>> | null = null;
    let sigW = 0;
    let sigH = 0;
    const titleSize = 9.5;
    const dateSize = 7.5;
    const padX = 12;
    const padTop = 8;
    const padBottom = 8;
    const titleGap = 3;
    const afterDate = 8;
    const maxSigW = Math.min(240, CONTENT_WIDTH - padX * 2);
    const maxSigH = 44;

    if (
      typeof input.signatureDataUrl === "string" &&
      input.signatureDataUrl.startsWith("data:image/png;base64,")
    ) {
      try {
        const base64 = input.signatureDataUrl.split(",")[1];
        const bytes = Uint8Array.from(Buffer.from(base64, "base64"));
        sigImg = await pdf.embedPng(bytes);
        const scale = Math.min(
          1,
          maxSigW / sigImg.width,
          maxSigH / Math.max(sigImg.height, 1),
        );
        sigW = sigImg.width * scale;
        sigH = Math.max(sigImg.height * scale, 26);
      } catch {
        sigImg = null;
      }
    }

    const bodyH = sigImg ? sigH : 12;
    const boxH =
      padTop + titleSize + titleGap + dateSize + afterDate + bodyH + padBottom;

    if (y - boxH < bodyFloor) {
      page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      y = PAGE_HEIGHT - MARGIN_TOP;
      drawPageChrome();
    }

    const boxBottom = y - boxH;
    drawAccentBar(MARGIN_X, boxBottom, boxH);

    let cy = y - padTop;
    page.drawText("Signature", {
      x: MARGIN_X + padX,
      y: cy - titleSize,
      size: titleSize,
      font: fontBold,
      color: rgb(ink.r, ink.g, ink.b),
    });
    cy -= titleSize + titleGap;
    page.drawText(signedLabel, {
      x: MARGIN_X + padX,
      y: cy - dateSize,
      size: dateSize,
      font,
      color: rgb(muted.r, muted.g, muted.b),
    });
    cy -= dateSize + afterDate;

    if (sigImg) {
      page.drawImage(sigImg, {
        x: MARGIN_X + padX,
        y: boxBottom + padBottom,
        width: sigW,
        height: sigH,
      });
      page.drawRectangle({
        x: MARGIN_X + padX,
        y: boxBottom + padBottom - 2.5,
        width: Math.max(sigW, 110),
        height: ACCENT_MARK_H,
        color: rgb(paovaGreen.r, paovaGreen.g, paovaGreen.b),
      });
    } else {
      page.drawText("(signature non disponible)", {
        x: MARGIN_X + padX,
        y: cy - 8,
        size: 8,
        font,
        color: rgb(softMuted.r, softMuted.g, softMuted.b),
      });
    }

    y -= boxH;
  }

  // ── Dossier de preuve — always anchored to the bottom of the page ──
  if (proofLayout) {
    const pinnedTop = MARGIN_BOTTOM + proofLayout.height;
    // Need a new page if signature already invaded the proof band
    if (y < pinnedTop + 8) {
      page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      y = PAGE_HEIGHT - MARGIN_TOP;
      drawPageChrome();
    }
    // Drop to the bottom — intentional air between signature and proof
    if (y > pinnedTop) {
      y = pinnedTop;
    }

    const { cells, hashLines, summaryLabel, summaryLines } = proofLayout;

    // Secondary title
    {
      const titleSize = 9;
      page.drawText("Dossier de preuve numérique", {
        x: MARGIN_X,
        y: y - titleSize,
        size: titleSize,
        font: fontBold,
        color: rgb(muted.r, muted.g, muted.b),
      });
      y -= titleSize + 2.5;
      drawSectionRule(false);
      gap(5);
    }

    // Résumé
    {
      const size = 6.5;
      const labelW = fontBold.widthOfTextAtSize(summaryLabel, size);
      page.drawText(summaryLabel, {
        x: MARGIN_X,
        y: y - size,
        size,
        font: fontBold,
        color: rgb(softMuted.r, softMuted.g, softMuted.b),
      });
      let first = true;
      for (const lineText of summaryLines) {
        page.drawText(lineText, {
          x: first ? MARGIN_X + labelW : MARGIN_X,
          y: y - size,
          size,
          font,
          color: rgb(softMuted.r, softMuted.g, softMuted.b),
        });
        y -= size + 1.5;
        first = false;
      }
      gap(4);
    }

    // Fiche technique
    {
      const titleSize = 7;
      page.drawText("Fiche technique", {
        x: MARGIN_X,
        y: y - titleSize,
        size: titleSize,
        font: fontBold,
        color: rgb(softMuted.r, softMuted.g, softMuted.b),
      });
      y -= titleSize + 3;
      drawProofGrid(cells);
    }

    // SHA-256
    {
      const monoSize = 6.5;
      const monoGap = 1.5;
      const hashPadX = 7;
      const hashPadY = 3.5;
      const labelSize = 5.5;
      const codeH =
        hashPadY * 2 + hashLines.length * (monoSize + monoGap) - monoGap;

      gap(5);
      page.drawText("Empreinte SHA-256", {
        x: MARGIN_X,
        y: y - labelSize,
        size: labelSize,
        font,
        color: rgb(softMuted.r, softMuted.g, softMuted.b),
      });
      y -= labelSize + 2;

      page.drawRectangle({
        x: MARGIN_X,
        y: y - codeH,
        width: CONTENT_WIDTH,
        height: codeH,
        color: rgb(codeBg.r, codeBg.g, codeBg.b),
      });

      let hy = y - hashPadY;
      for (const lineText of hashLines) {
        page.drawText(lineText, {
          x: MARGIN_X + hashPadX,
          y: hy - monoSize,
          size: monoSize,
          font: fontMono,
          color: rgb(muted.r, muted.g, muted.b),
        });
        hy -= monoSize + monoGap;
      }
      y -= codeH + 4;
    }

    // eIDAS
    {
      const note =
        "Ceci n’est pas une signature électronique qualifiée au sens du règlement eIDAS.";
      const noteSize = 6;
      page.drawText(note, {
        x: MARGIN_X,
        y: y - noteSize,
        size: noteSize,
        font,
        color: rgb(softMuted.r, softMuted.g, softMuted.b),
      });
    }
  }

  // Legacy footer meta when no proof dossier is attached.
  if (!input.proof) {
    gap(8);
    drawHairline(BORDER);
    const metaParts: string[] = [];
    if (input.ipAddress) {
      metaParts.push(`IP : ${formatDisplayIp(input.ipAddress)}`);
    }
    const consentAt = input.answers["__rgpd_consent_at"];
    if (typeof consentAt === "string") {
      const consentDate = new Date(consentAt).toLocaleString("fr-FR", {
        dateStyle: "long",
        timeStyle: "short",
      });
      metaParts.push(`Consentement RGPD accepté le ${consentDate}`);
    }

    if (metaParts.length > 0) {
      drawLines(metaParts.join("  ·  "), 7.5, {
        color: muted,
        lineGap: 3,
      });
    }
  }

  // Premium discreet footer on every page
  const pages = pdf.getPages();
  const total = pages.length;
  const proofRef = input.proof?.reference?.trim() || null;
  for (let i = 0; i < total; i++) {
    const pg = pages[i];
    const size = 6.5;
    const markH = 6;
    const topRuleY = 34;
    const line1Y = 22;
    const line2Y = 12;

    pg.drawRectangle({
      x: MARGIN_X,
      y: topRuleY,
      width: CONTENT_WIDTH,
      height: BORDER,
      color: rgb(line.r, line.g, line.b),
    });

    let textX = MARGIN_X;
    if (showFooter) {
      drawPaovaBrandOn(pg, MARGIN_X, line1Y + markH - 1, markH, false);
      textX = MARGIN_X + markH + 5;
      pg.drawText("Document généré automatiquement par Paova", {
        x: textX,
        y: line1Y,
        size,
        font,
        color: rgb(softMuted.r, softMuted.g, softMuted.b),
      });
    }

    const pageLabel = `Page ${i + 1} / ${total}`;
    const pageW = font.widthOfTextAtSize(pageLabel, size);
    pg.drawText(pageLabel, {
      x: PAGE_WIDTH - MARGIN_X - pageW,
      y: line1Y,
      size,
      font,
      color: rgb(softMuted.r, softMuted.g, softMuted.b),
    });

    if (proofRef) {
      pg.drawText(`Référence : ${proofRef}`, {
        x: showFooter ? textX : MARGIN_X,
        y: line2Y,
        size,
        font,
        color: rgb(softMuted.r, softMuted.g, softMuted.b),
      });
    }
  }

  return pdf.save();
}
