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
  brandFont?: string | null;
  logoUrl: string | null;
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
const MARGIN_X = 50;
const MARGIN_TOP = 42;
const MARGIN_BOTTOM = 46;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_X * 2;

/** Print-safe neutrals (remain readable in B&W). */
const ink = { r: 0.07, g: 0.08, b: 0.1 };
const muted = { r: 0.3, g: 0.32, b: 0.36 };
const soft = { r: 0.972, g: 0.974, b: 0.976 };
const line = { r: 0.76, g: 0.78, b: 0.81 };
const lineStrong = { r: 0.55, g: 0.57, b: 0.61 };

const BORDER = 0.75;
const BORDER_EMPH = 1.1;
const FIELD_GAP = 6;
const SECTION_BEFORE = 8;
const SECTION_AFTER = 10;

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!m) return { r: 0.07, g: 0.09, b: 0.15 };
  const int = parseInt(m[1], 16);
  return {
    r: ((int >> 16) & 255) / 255,
    g: ((int >> 8) & 255) / 255,
    b: (int & 255) / 255,
  };
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
  const brand = hexToRgb(input.brandColor || "#111827");

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

  function ensureSpace(needed: number) {
    if (y - needed < MARGIN_BOTTOM) {
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

  function drawHairline(weight = 0.65) {
    ensureSpace(8);
    page.drawRectangle({
      x: MARGIN_X,
      y: y - weight,
      width: CONTENT_WIDTH,
      height: weight,
      color: rgb(line.r, line.g, line.b),
    });
    gap(SECTION_AFTER);
  }

  function drawSectionTitle(title: string) {
    const label = title.toUpperCase();
    const size = 9;
    ensureSpace(28);
    gap(SECTION_BEFORE);

    page.drawText(label, {
      x: MARGIN_X,
      y: y - size,
      size,
      font: fontBold,
      color: rgb(ink.r, ink.g, ink.b),
    });
    y -= size + 5;

    page.drawRectangle({
      x: MARGIN_X,
      y: y - 0.65,
      width: CONTENT_WIDTH,
      height: 0.65,
      color: rgb(line.r, line.g, line.b),
    });
    page.drawRectangle({
      x: MARGIN_X,
      y: y - 1.6,
      width: 40,
      height: 1.6,
      color: rgb(brand.r, brand.g, brand.b),
    });
    gap(SECTION_AFTER);
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
    },
  ): number {
    const emphasize = options?.emphasize === true;
    const useMono = options?.mono === true;
    const compact = options?.compact !== false;
    const spacious = options?.spacious === true;
    const labelSize = 7;
    const valueSize = emphasize ? (spacious ? 12.5 : 11.5) : 10.5;
    const valueFont = useMono ? fontMono : fontBold;
    const padX = spacious ? 14 : compact ? 11 : 12;
    const padY = emphasize
      ? spacious
        ? 12
        : 9
      : spacious
        ? 10
        : compact
          ? 7
          : 9;
    const valueLines = wrap(value || "—", valueSize, width - padX * 2, valueFont);
    const lineStep = valueSize + (spacious ? 3.5 : 2.5);
    const blockH =
      padY + labelSize + (spacious ? 5 : 3) + valueLines.length * lineStep + padY;

    page.drawRectangle({
      x,
      y: y - blockH,
      width,
      height: blockH,
      color: rgb(soft.r, soft.g, soft.b),
    });
    page.drawRectangle({
      x,
      y: y - blockH,
      width,
      height: blockH,
      borderColor: rgb(
        emphasize ? lineStrong.r : line.r,
        emphasize ? lineStrong.g : line.g,
        emphasize ? lineStrong.b : line.b,
      ),
      borderWidth: emphasize ? BORDER_EMPH : BORDER,
    });
    if (emphasize) {
      page.drawRectangle({
        x,
        y: y - blockH,
        width: 3,
        height: blockH,
        color: rgb(brand.r, brand.g, brand.b),
      });
    }

    let cy = y - padY;
    page.drawText(label.toUpperCase(), {
      x: x + padX,
      y: cy - labelSize,
      size: labelSize,
      font: fontBold,
      color: rgb(muted.r, muted.g, muted.b),
    });
    cy -= labelSize + (spacious ? 5 : 3);
    for (const lineText of valueLines) {
      page.drawText(lineText, {
        x: x + padX,
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
    },
  ) {
    const valueSize = options?.emphasize ? 11.5 : 10.5;
    const valueFont = options?.mono ? fontMono : fontBold;
    const padX = options?.spacious ? 14 : 11;
    const approxLines = wrap(
      value || "—",
      valueSize,
      CONTENT_WIDTH - padX * 2,
      valueFont,
    ).length;
    const approxH =
      22 + approxLines * (valueSize + (options?.spacious ? 3.5 : 2.5)) + 8;
    ensureSpace(approxH);
    const blockH = drawFieldBox(MARGIN_X, CONTENT_WIDTH, label, value, {
      ...options,
      compact: options?.compact !== false,
    });
    y -= blockH + (options?.spacious ? 10 : FIELD_GAP);
  }

  /** Two fields side-by-side. */
  function drawFieldPair(
    left: { label: string; value: string; mono?: boolean; emphasize?: boolean },
    right: { label: string; value: string; mono?: boolean; emphasize?: boolean },
    options?: { spacious?: boolean },
  ) {
    const gutter = options?.spacious ? 8 : 6;
    const colW = (CONTENT_WIDTH - gutter) / 2;
    const approxH = options?.spacious ? 52 : 42;
    ensureSpace(approxH);
    const hLeft = drawFieldBox(MARGIN_X, colW, left.label, left.value, {
      mono: left.mono,
      emphasize: left.emphasize,
      compact: true,
      spacious: options?.spacious,
    });
    const hRight = drawFieldBox(MARGIN_X + colW + gutter, colW, right.label, right.value, {
      mono: right.mono,
      emphasize: right.emphasize,
      compact: true,
      spacious: options?.spacious,
    });
    y -= Math.max(hLeft, hRight) + (options?.spacious ? 10 : FIELD_GAP);
  }

  function drawPageChrome() {
    page.drawRectangle({
      x: 0,
      y: PAGE_HEIGHT - 3.5,
      width: PAGE_WIDTH,
      height: 3.5,
      color: rgb(brand.r, brand.g, brand.b),
    });
  }

  // ── Header brand bar ──────────────────────────────────────────────
  drawPageChrome();

  // ── Logo (business, or Paova wordmark as fallback) ────────────────
  let drewBusinessLogo = false;
  if (input.logoUrl) {
    try {
      const res = await fetch(input.logoUrl);
      if (res.ok) {
        const buf = new Uint8Array(await res.arrayBuffer());
        const isPng = buf[0] === 0x89 && buf[1] === 0x50;
        const logo = isPng ? await pdf.embedPng(buf) : await pdf.embedJpg(buf);
        const maxH = 36;
        const scale = maxH / logo.height;
        const w = logo.width * scale;
        ensureSpace(maxH + 14);
        page.drawImage(logo, {
          x: MARGIN_X,
          y: y - maxH,
          width: w,
          height: maxH,
        });
        y -= maxH + 14;
        drewBusinessLogo = true;
      }
    } catch {
      // Ignore logo failures; fall back to Paova branding below.
    }
  }

  const paovaGreen = { r: 0x6b / 255, g: 0x8f / 255, b: 0x71 / 255 };

  /** Draw the Paova P + optional "paova" wordmark. `yTop` is the top of the mark. */
  function drawPaovaBrand(x: number, yTop: number, height: number, withName: boolean) {
    const markScale = height / 140;
    // SVG stroke-width ~9–14 in a 140 viewBox; keeps weight readable when scaled.
    const markStroke = 13;
    page.drawSvgPath("M56 110 L79 35", {
      x,
      y: yTop,
      scale: markScale,
      borderWidth: markStroke,
      borderColor: rgb(paovaGreen.r, paovaGreen.g, paovaGreen.b),
    });
    page.drawSvgPath("M40 48 C56 12 118 10 112 50 C106 84 73 84 56 73", {
      x,
      y: yTop,
      scale: markScale,
      borderWidth: markStroke,
      borderColor: rgb(paovaGreen.r, paovaGreen.g, paovaGreen.b),
    });
    if (withName) {
      // Slightly smaller than the P height, optically centered — brand type, not body text.
      const nameSize = Math.max(11, height * 0.48);
      drawWordmark(
        page,
        wordmarkFont,
        x + height + 8,
        yTop - height / 2 - nameSize * 0.32,
        nameSize,
        ink,
      );
    }
  }

  // No client logo → show full Paova brand in the header (reassuring default).
  if (!drewBusinessLogo) {
    const logoH = 28;
    ensureSpace(logoH + 14);
    drawPaovaBrand(MARGIN_X, y, logoH, true);
    y -= logoH + 14;
  }

  // ── Business name ─────────────────────────────────────────────────
  if (input.businessName) {
    const size = 10.5;
    const label = input.businessName.toUpperCase();
    const lines = wrap(label, size, CONTENT_WIDTH, businessFont);
    for (const lineText of lines) {
      ensureSpace(size + 2);
      if (lineText) {
        page.drawText(lineText, {
          x: MARGIN_X,
          y: y - size,
          size,
          font: businessFont,
          color: rgb(brand.r, brand.g, brand.b),
        });
      }
      y -= size + 2;
    }
    gap(8);
  }

  // ── Document title ────────────────────────────────────────────────
  {
    const size = 18;
    const lines = wrap(input.title, size, CONTENT_WIDTH, businessFont);
    for (const lineText of lines) {
      ensureSpace(size + 3.5);
      if (lineText) {
        page.drawText(lineText, {
          x: MARGIN_X,
          y: y - size,
          size,
          font: businessFont,
          color: rgb(ink.r, ink.g, ink.b),
        });
      }
      y -= size + 3.5;
    }
  }
  gap(4);
  drawLines("Décharge de responsabilité signée", 8.5, {
    color: muted,
    lineGap: 1.5,
  });
  gap(10);
  drawHairline(0.65);

  // ── Legal text (soft panel) ───────────────────────────────────────
  drawSectionTitle("Texte juridique");

  const legalSize = 9.5;
  const legalLineGap = 3.4;
  const legalPadY = 12;
  const legalPadX = 14;
  const legalLines = wrap(
    input.legalText,
    legalSize,
    CONTENT_WIDTH - legalPadX * 2 - 4,
    font,
  );
  const legalBlockHeight =
    legalLines.length * (legalSize + legalLineGap) + legalPadY * 2;

  ensureSpace(legalBlockHeight + 8);
  const legalTop = y;
  page.drawRectangle({
    x: MARGIN_X,
    y: legalTop - legalBlockHeight,
    width: CONTENT_WIDTH,
    height: legalBlockHeight,
    color: rgb(soft.r, soft.g, soft.b),
  });
  page.drawRectangle({
    x: MARGIN_X,
    y: legalTop - legalBlockHeight,
    width: CONTENT_WIDTH,
    height: legalBlockHeight,
    borderColor: rgb(line.r, line.g, line.b),
    borderWidth: BORDER,
  });
  page.drawRectangle({
    x: MARGIN_X,
    y: legalTop - legalBlockHeight,
    width: 3,
    height: legalBlockHeight,
    color: rgb(brand.r, brand.g, brand.b),
  });

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
  y = legalTop - legalBlockHeight - 14;

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
  const hasCustomFields = input.fields.length > 0;
  if (hasCustomFields) {
    drawSectionTitle("Informations");

    // Pair short boolean answers side-by-side to save vertical space.
    const pendingBool: { label: string; value: string }[] = [];
    const flushBoolPair = () => {
      while (pendingBool.length >= 2) {
        const a = pendingBool.shift()!;
        const b = pendingBool.shift()!;
        drawFieldPair(a, b);
      }
    };
    const flushBoolRemain = () => {
      flushBoolPair();
      while (pendingBool.length > 0) {
        const a = pendingBool.shift()!;
        drawField(a.label, a.value);
      }
    };

    for (const field of input.fields) {
      const raw = input.answers[field.key];

      if (Array.isArray(raw)) {
        flushBoolRemain();
        ensureSpace(32);
        drawLines(field.label.toUpperCase(), 7, {
          bold: true,
          color: muted,
          lineGap: 1.5,
        });
        gap(4);

        if (raw.length === 0) {
          drawField("Participants", "—");
          continue;
        }

        for (let i = 0; i < raw.length; i++) {
          const p = raw[i] as { name?: string; dob?: string; note?: string };
          const name = String(p?.name ?? "").trim() || "—";
          const dob = p?.dob ? formatDob(String(p.dob)) : "";
          const note = String(p?.note ?? "").trim();

          ensureSpace(36);
          const rowH = note ? 34 : 24;
          page.drawRectangle({
            x: MARGIN_X,
            y: y - rowH,
            width: CONTENT_WIDTH,
            height: rowH,
            color: rgb(soft.r, soft.g, soft.b),
          });
          page.drawRectangle({
            x: MARGIN_X,
            y: y - rowH,
            width: CONTENT_WIDTH,
            height: rowH,
            borderColor: rgb(line.r, line.g, line.b),
            borderWidth: BORDER,
          });

          page.drawText(`${i + 1}.`, {
            x: MARGIN_X + 10,
            y: y - 15,
            size: 10,
            font: fontBold,
            color: rgb(brand.r, brand.g, brand.b),
          });

          page.drawText(name, {
            x: MARGIN_X + 28,
            y: y - 15,
            size: 10.5,
            font: fontBold,
            color: rgb(ink.r, ink.g, ink.b),
          });

          if (dob) {
            const nameW = fontBold.widthOfTextAtSize(name, 10.5);
            page.drawText(`  ·  né(e) le ${dob}`, {
              x: MARGIN_X + 28 + nameW,
              y: y - 15,
              size: 9,
              font,
              color: rgb(muted.r, muted.g, muted.b),
            });
          }

          if (note) {
            page.drawText(note, {
              x: MARGIN_X + 28,
              y: y - 28,
              size: 9,
              font,
              color: rgb(muted.r, muted.g, muted.b),
            });
          }

          y -= rowH + 4;
        }
        gap(2);
        continue;
      }

      if (typeof raw === "boolean" || field.type === "checkbox") {
        pendingBool.push({
          label: field.label,
          value: raw === true || raw === "true" ? "Oui" : "Non",
        });
        flushBoolPair();
        continue;
      }

      flushBoolRemain();
      const value = String(raw ?? "").trim() || "—";
      drawField(field.label, value);
    }
    flushBoolRemain();
  }

  // ── Signature ─────────────────────────────────────────────────────
  const signedAt = new Date(input.signedAt).toLocaleString("fr-FR", {
    dateStyle: "long",
    timeStyle: "short",
  });

  // Prefer keeping signature on the same page as the fields (no orphan page).
  const minSigBlock = 118;
  if (y - minSigBlock < MARGIN_BOTTOM) {
    page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    y = PAGE_HEIGHT - MARGIN_TOP;
    drawPageChrome();
  }

  drawSectionTitle("Signature");

  if (
    typeof input.signatureDataUrl === "string" &&
    input.signatureDataUrl.startsWith("data:image/png;base64,")
  ) {
    try {
      const base64 = input.signatureDataUrl.split(",")[1];
      const bytes = Uint8Array.from(Buffer.from(base64, "base64"));
      const png = await pdf.embedPng(bytes);

      const dateSize = 9;
      const dateLabel = `Signé le ${signedAt}`;
      const headerH = 22;
      const boxPadX = 18;
      const boxPadY = 16;
      const maxW = Math.min(280, CONTENT_WIDTH - boxPadX * 2);
      const remaining = Math.max(40, y - MARGIN_BOTTOM - headerH - 24);
      const maxH = Math.min(64, remaining - boxPadY * 2);
      const scale = Math.min(1, maxW / png.width, maxH / Math.max(png.height, 1));
      const w = png.width * scale;
      const h = png.height * scale;
      const boxW = CONTENT_WIDTH;
      const boxH = headerH + boxPadY + h + boxPadY;

      if (y - boxH < MARGIN_BOTTOM) {
        page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
        y = PAGE_HEIGHT - MARGIN_TOP;
        drawPageChrome();
      }

      const boxBottom = y - boxH;

      // Outer frame
      page.drawRectangle({
        x: MARGIN_X,
        y: boxBottom,
        width: boxW,
        height: boxH,
        color: rgb(1, 1, 1),
      });
      page.drawRectangle({
        x: MARGIN_X,
        y: boxBottom,
        width: boxW,
        height: boxH,
        borderColor: rgb(lineStrong.r, lineStrong.g, lineStrong.b),
        borderWidth: BORDER_EMPH,
      });
      // Brand accent bar on top edge
      page.drawRectangle({
        x: MARGIN_X,
        y: y - 2.5,
        width: boxW,
        height: 2.5,
        color: rgb(brand.r, brand.g, brand.b),
      });
      // Soft header band for date hierarchy
      page.drawRectangle({
        x: MARGIN_X + BORDER_EMPH,
        y: y - headerH,
        width: boxW - BORDER_EMPH * 2,
        height: headerH - 2.5,
        color: rgb(soft.r, soft.g, soft.b),
      });
      page.drawText(dateLabel, {
        x: MARGIN_X + boxPadX,
        y: y - 2.5 - (headerH - 2.5) / 2 - dateSize / 2,
        size: dateSize,
        font: fontBold,
        color: rgb(ink.r, ink.g, ink.b),
      });
      // Hairline under header
      page.drawRectangle({
        x: MARGIN_X,
        y: y - headerH,
        width: boxW,
        height: 0.6,
        color: rgb(line.r, line.g, line.b),
      });

      page.drawImage(png, {
        x: MARGIN_X + boxPadX,
        y: boxBottom + boxPadY,
        width: w,
        height: h,
      });
      y -= boxH + 8;
    } catch {
      drawLines(`Signé le ${signedAt}`, 9, { color: muted, lineGap: 1.5 });
      gap(6);
      drawLines("(signature non disponible)", 10, { color: muted });
    }
  } else {
    drawLines(`Signé le ${signedAt}`, 9, { color: muted, lineGap: 1.5 });
  }

  // ── Dossier de preuve numérique ───────────────────────────────────
  // Ideal: page 1 = décharge + signature, page 2 = preuves.
  // If signature already started a nearly empty page, keep preuves there
  // (avoids a useless 3rd page with only the dossier).
  if (input.proof) {
    const contentUsedOnPage = PAGE_HEIGHT - MARGIN_TOP - y;
    const orphanSignaturePage = contentUsedOnPage < 200;
    if (!orphanSignaturePage) {
      page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      y = PAGE_HEIGHT - MARGIN_TOP;
      drawPageChrome();
    } else {
      gap(14);
    }

    const p = input.proof;
    const spacious = !orphanSignaturePage;

    // Page intro — title + restrained lead-in
    {
      const titleSize = 14;
      ensureSpace(titleSize + 28);
      gap(spacious ? 8 : 4);
      page.drawText("DOSSIER DE PREUVE NUMÉRIQUE", {
        x: MARGIN_X,
        y: y - titleSize,
        size: titleSize,
        font: fontBold,
        color: rgb(ink.r, ink.g, ink.b),
      });
      y -= titleSize + 6;
      page.drawRectangle({
        x: MARGIN_X,
        y: y - 0.65,
        width: CONTENT_WIDTH,
        height: 0.65,
        color: rgb(line.r, line.g, line.b),
      });
      page.drawRectangle({
        x: MARGIN_X,
        y: y - 1.8,
        width: 48,
        height: 1.8,
        color: rgb(brand.r, brand.g, brand.b),
      });
      gap(spacious ? 14 : 10);
    }

    const intro =
      "Informations techniques enregistrées automatiquement lors de la signature afin de renforcer la traçabilité du document. Le contenu correspond au snapshot figé au moment de la signature. Ceci n’est pas une signature électronique qualifiée (eIDAS).";
    const introSize = 8.5;
    const introPadX = 14;
    const introPadY = spacious ? 12 : 9;
    const introLines = wrap(intro, introSize, CONTENT_WIDTH - introPadX * 2, font);
    const introH =
      introPadY * 2 + introLines.length * (introSize + 2.6);
    ensureSpace(introH + 8);
    page.drawRectangle({
      x: MARGIN_X,
      y: y - introH,
      width: CONTENT_WIDTH,
      height: introH,
      color: rgb(soft.r, soft.g, soft.b),
    });
    page.drawRectangle({
      x: MARGIN_X,
      y: y - introH,
      width: CONTENT_WIDTH,
      height: introH,
      borderColor: rgb(line.r, line.g, line.b),
      borderWidth: BORDER,
    });
    let iy = y - introPadY;
    for (const lineText of introLines) {
      page.drawText(lineText, {
        x: MARGIN_X + introPadX,
        y: iy - introSize,
        size: introSize,
        font,
        color: rgb(muted.r, muted.g, muted.b),
      });
      iy -= introSize + 2.6;
    }
    y -= introH + (spacious ? 16 : 10);

    // Official reference — primary identity of the proof pack
    drawField("Référence", p.reference, {
      emphasize: true,
      mono: true,
      spacious,
    });

    const proofSignedAt = new Date(p.signedAt).toLocaleString("fr-FR", {
      dateStyle: "long",
      timeStyle: "medium",
      timeZone: "UTC",
    });
    const tzLabel = [
      p.timezone,
      formatTimezoneOffset(p.timezoneOffsetMinutes),
    ]
      .filter(Boolean)
      .join(" · ");
    drawField(
      "Horodatage",
      tzLabel
        ? `${proofSignedAt} UTC (${tzLabel})`
        : `${proofSignedAt} UTC`,
      { emphasize: true, spacious },
    );

    const deviceOrUa = p.deviceHint
      ? p.deviceHint
      : p.userAgent
        ? p.userAgent.length > 90
          ? `${p.userAgent.slice(0, 87)}…`
          : p.userAgent
        : null;

    if (p.ipAddress && deviceOrUa) {
      drawFieldPair(
        { label: "Adresse IP", value: p.ipAddress, mono: true },
        { label: p.deviceHint ? "Appareil" : "Navigateur", value: deviceOrUa },
        { spacious },
      );
    } else if (p.ipAddress) {
      drawField("Adresse IP", p.ipAddress, { mono: true, spacious });
    } else if (deviceOrUa) {
      drawField(p.deviceHint ? "Appareil" : "Navigateur", deviceOrUa, {
        spacious,
      });
    }

    drawField("Version de la décharge", String(p.templateVersion), {
      emphasize: true,
      spacious,
    });

    // SHA-256 — monospace, grouped for readability
    const hash = p.contentSha256.toLowerCase().replace(/[^0-9a-f]/g, "");
    const hashGrouped = hash.match(/.{1,4}/g)?.join(" ") ?? hash;
    const hashLines = wrap(
      hashGrouped,
      10.5,
      CONTENT_WIDTH - 28,
      fontMono,
    );
    const monoSize = 10.5;
    const monoGap = spacious ? 4 : 3;
    const hashPadX = 14;
    const hashPadY = spacious ? 14 : 10;
    const hashLabelSize = 7;
    const hashBlockH =
      hashPadY +
      hashLabelSize +
      6 +
      hashLines.length * (monoSize + monoGap) +
      hashPadY;
    ensureSpace(hashBlockH + 8);
    page.drawRectangle({
      x: MARGIN_X,
      y: y - hashBlockH,
      width: CONTENT_WIDTH,
      height: hashBlockH,
      color: rgb(soft.r, soft.g, soft.b),
    });
    page.drawRectangle({
      x: MARGIN_X,
      y: y - hashBlockH,
      width: CONTENT_WIDTH,
      height: hashBlockH,
      borderColor: rgb(lineStrong.r, lineStrong.g, lineStrong.b),
      borderWidth: BORDER_EMPH,
    });
    page.drawRectangle({
      x: MARGIN_X,
      y: y - hashBlockH,
      width: 3,
      height: hashBlockH,
      color: rgb(brand.r, brand.g, brand.b),
    });
    let hy = y - hashPadY;
    page.drawText("EMPREINTE SHA-256", {
      x: MARGIN_X + hashPadX,
      y: hy - hashLabelSize,
      size: hashLabelSize,
      font: fontBold,
      color: rgb(muted.r, muted.g, muted.b),
    });
    hy -= hashLabelSize + 6;
    for (const lineText of hashLines) {
      page.drawText(lineText, {
        x: MARGIN_X + hashPadX,
        y: hy - monoSize,
        size: monoSize,
        font: fontMono,
        color: rgb(ink.r, ink.g, ink.b),
      });
      hy -= monoSize + monoGap;
    }
    y -= hashBlockH + (spacious ? 12 : 8);
  }

  // Legacy footer meta when no proof dossier is attached.
  if (!input.proof) {
    gap(8);
    drawHairline(0.7);
    const metaParts: string[] = [];
    if (input.ipAddress) {
      metaParts.push(`IP : ${input.ipAddress}`);
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

  // Discreet footer on every page (screen + print)
  const pages = pdf.getPages();
  const total = pages.length;
  for (let i = 0; i < total; i++) {
    const p = pages[i];
    const markH = 9;
    const markY = 34;
    // Temporarily bind draw helpers to this page via local draws
    const markScale = markH / 140;
    const markStroke = 12;
    p.drawSvgPath("M56 110 L79 35", {
      x: MARGIN_X,
      y: markY,
      scale: markScale,
      borderWidth: markStroke,
      borderColor: rgb(paovaGreen.r, paovaGreen.g, paovaGreen.b),
    });
    p.drawSvgPath("M40 48 C56 12 118 10 112 50 C106 84 73 84 56 73", {
      x: MARGIN_X,
      y: markY,
      scale: markScale,
      borderWidth: markStroke,
      borderColor: rgb(paovaGreen.r, paovaGreen.g, paovaGreen.b),
    });
    p.drawText("Document généré par Paova", {
      x: MARGIN_X + markH + 7,
      y: markY - markH / 2 - 2.5,
      size: 7,
      font,
      color: rgb(muted.r, muted.g, muted.b),
    });

    const label = `${i + 1} / ${total}`;
    const size = 7.5;
    const w = font.widthOfTextAtSize(label, size);
    p.drawText(label, {
      x: PAGE_WIDTH - MARGIN_X - w,
      y: markY - markH / 2 - 2.5,
      size,
      font,
      color: rgb(muted.r, muted.g, muted.b),
    });
  }

  return pdf.save();
}
