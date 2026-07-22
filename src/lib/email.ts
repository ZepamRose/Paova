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
        from: env.resend.from,
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

/** Send the signer a confirmation email with the signed waiver PDF attached. */
export async function sendSignerConfirmation(input: {
  to: string;
  signerName: string;
  businessName: string | null;
  waiverTitle: string;
  brandColor: string;
  pdfBytes: Uint8Array;
}): Promise<boolean> {
  const business = input.businessName ?? "l'établissement";
  const color = /^#[0-9a-fA-F]{6}$/.test(input.brandColor)
    ? input.brandColor
    : "#111827";

  const html = `
    <div style="font-family: -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; max-width: 520px; margin: 0 auto; color: #0a0a0a;">
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
      <p style="font-size: 12px; color: #6b7280; margin-top: 24px;">
        Envoyé via Paova.
      </p>
    </div>
  `;

  const base64 = Buffer.from(input.pdfBytes).toString("base64");
  const safeTitle = input.waiverTitle
    .replace(/[^a-z0-9]+/gi, "-")
    .toLowerCase();

  return sendEmail({
    to: input.to,
    subject: `Votre décharge signée — ${input.waiverTitle}`,
    html,
    attachments: [
      {
        filename: `decharge-${safeTitle}.pdf`,
        content: base64,
      },
    ],
  });
}
