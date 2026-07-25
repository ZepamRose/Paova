import { env } from "@/lib/env";

type Attachment = {
  filename: string;
  /** Base64-encoded file content. */
  content: string;
};

type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
  from?: string;
  attachments?: Attachment[];
};

/**
 * Send an email through the Resend HTTP API.
 * Returns false (and never throws) when Resend is not configured or fails,
 * so email issues can never block the signing flow.
 */
async function sendEmail(input: SendEmailInput): Promise<boolean> {
  if (!env.resend.apiKey) {
    return false;
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.resend.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: input.from ?? env.resend.from,
        to: input.to,
        subject: input.subject,
        html: input.html,
        attachments: input.attachments,
      }),
    });

    if (!res.ok) {
      console.error("Resend error:", res.status, await res.text());
      return false;
    }
    return true;
  } catch (error) {
    console.error("Resend request failed:", error);
    return false;
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function formatFromAddress(fromName: string | null | undefined): string | undefined {
  const name = (fromName ?? "").trim();
  if (!name || !env.resend.from) return undefined;
  // Keep the verified mailbox; only override the display name.
  const match = /<([^>]+)>/.exec(env.resend.from);
  const address = match?.[1] ?? env.resend.from;
  const safeName = name.replace(/[<>"]/g, "").slice(0, 80);
  return `${safeName} <${address}>`;
}

/** Send the signer a confirmation email with the signed waiver PDF attached. */
export async function sendSignerConfirmation(input: {
  to: string;
  signerName: string;
  businessName: string | null;
  waiverTitle: string;
  brandColor: string;
  pdfBytes: Uint8Array;
  fromName?: string | null;
  subjectTemplate?: string | null;
  signature?: string | null;
  footer?: string | null;
  showLogo?: boolean;
  logoUrl?: string | null;
}): Promise<boolean> {
  const business = input.businessName ?? "l'établissement";
  const color = /^#[0-9a-fA-F]{6}$/.test(input.brandColor)
    ? input.brandColor
    : "#111827";

  const subjectRaw = (input.subjectTemplate ?? "").trim();
  const subject = (
    subjectRaw || `Votre décharge signée — ${input.waiverTitle}`
  )
    .replaceAll("{nom}", input.businessName?.trim() || business)
    .slice(0, 160);

  const signatureBlock = (input.signature ?? "").trim()
    ? `<p style="font-size: 13px; line-height: 1.6; color: #4b5563; white-space: pre-wrap;">${escapeHtml(
        input.signature!.trim(),
      )}</p>`
    : `<p style="font-size: 13px; line-height: 1.6; color: #4b5563;">— L'équipe ${escapeHtml(
        business,
      )}</p>`;

  const footerBlock = (input.footer ?? "").trim()
    ? `<p style="font-size: 11px; color: #9ca3af; margin-top: 20px; white-space: pre-wrap;">${escapeHtml(
        input.footer!.trim(),
      )}</p>`
    : `<p style="font-size: 12px; color: #6b7280; margin-top: 24px;">Envoyé via Paova.</p>`;

  const logoBlock =
    input.showLogo !== false && input.logoUrl
      ? `<div style="margin-bottom: 16px;"><img src="${escapeHtml(
          input.logoUrl,
        )}" alt="" width="48" height="48" style="display:block;border-radius:10px;object-fit:contain;" /></div>`
      : "";

  const html = `
    <div style="font-family: -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; max-width: 520px; margin: 0 auto; color: #0a0a0a;">
      ${logoBlock}
      <h1 style="font-size: 20px; color: ${color};">Votre décharge est signée</h1>
      <p style="font-size: 14px; line-height: 1.6; color: #374151;">
        Bonjour ${escapeHtml(input.signerName)},
      </p>
      <p style="font-size: 14px; line-height: 1.6; color: #374151;">
        Nous confirmons la signature de la décharge
        « ${escapeHtml(input.waiverTitle)} » auprès de
        ${escapeHtml(business)}.
      </p>
      <p style="font-size: 14px; line-height: 1.6; color: #374151;">
        Vous trouverez une copie de votre décharge signée en pièce jointe (PDF).
        Conservez-la précieusement.
      </p>
      ${signatureBlock}
      ${footerBlock}
    </div>
  `;

  const base64 = Buffer.from(input.pdfBytes).toString("base64");
  const safeTitle = input.waiverTitle
    .replace(/[^a-z0-9]+/gi, "-")
    .toLowerCase();

  return sendEmail({
    to: input.to,
    from: formatFromAddress(input.fromName),
    subject,
    html,
    attachments: [
      {
        filename: `decharge-${safeTitle}.pdf`,
        content: base64,
      },
    ],
  });
}

/** Remind a parent/participant to sign via the public group link. */
export async function sendGroupReminder(input: {
  to: string;
  recipientNames: string[];
  businessName: string | null;
  groupName: string;
  waiverTitle: string;
  signUrl: string;
  brandColor: string;
  fromName?: string | null;
}): Promise<boolean> {
  const business = input.businessName?.trim() || "l'établissement";
  const color = /^#[0-9a-fA-F]{6}$/.test(input.brandColor)
    ? input.brandColor
    : "#111827";
  const names = input.recipientNames.map((n) => n.trim()).filter(Boolean);
  const namesLabel =
    names.length === 0
      ? "un participant"
      : names.length === 1
        ? names[0]
        : names.length === 2
          ? `${names[0]} et ${names[1]}`
          : `${names.slice(0, -1).join(", ")} et ${names[names.length - 1]}`;

  const subject =
    names.length <= 1
      ? `Signature à compléter — ${input.groupName}`
      : `Signatures à compléter — ${input.groupName}`;

  const html = `
    <div style="font-family: -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; max-width: 520px; margin: 0 auto; color: #0a0a0a;">
      <h1 style="font-size: 20px; color: ${color};">Signature en attente</h1>
      <p style="font-size: 14px; line-height: 1.6; color: #374151;">
        Bonjour,
      </p>
      <p style="font-size: 14px; line-height: 1.6; color: #374151;">
        ${escapeHtml(business)} vous invite à signer la décharge
        « ${escapeHtml(input.waiverTitle)} » pour
        <strong>${escapeHtml(namesLabel)}</strong>
        (groupe ${escapeHtml(input.groupName)}).
      </p>
      <p style="margin: 24px 0;">
        <a href="${escapeHtml(input.signUrl)}"
           style="display:inline-block;background:${color};color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:10px;font-size:14px;font-weight:600;">
          Ouvrir le lien de signature
        </a>
      </p>
      <p style="font-size: 13px; line-height: 1.6; color: #6b7280;">
        Sur la page, recherchez le nom puis signez. Ce lien est personnel au groupe.
      </p>
      <p style="font-size: 12px; color: #9ca3af; margin-top: 24px;">
        Envoyé via Paova.
      </p>
    </div>
  `;

  return sendEmail({
    to: input.to,
    from: formatFromAddress(input.fromName ?? input.businessName),
    subject,
    html,
  });
}
