import { env } from "@/lib/env";
import { sanitizeLogoUrl } from "@/lib/branding";
import { logError } from "@/lib/observability/log";

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

  const isProd =
    process.env.VERCEL_ENV === "production" ||
    process.env.NODE_ENV === "production";
  const from = input.from ?? env.resend.from;
  // Resend's onboarding address only delivers to the account owner — treat it
  // as misconfigured in production so we never pretend the signer got the PDF.
  if (isProd && /@resend\.dev\b/i.test(from)) {
    logError(
      "email.misconfigured_sender",
      "RESEND_FROM still uses resend.dev in production; refusing to send.",
    );
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
        from,
        to: input.to,
        subject: input.subject,
        html: input.html,
        attachments: input.attachments,
      }),
      // Don't leave UI / server actions hanging forever on a stalled Resend call.
      signal: AbortSignal.timeout(10_000),
    });

    if (!res.ok) {
      // Body may carry Resend's reason (unverified domain, quota…); it never
      // contains recipient content, so it is safe to log.
      logError("email.send_failed", await res.text(), { status: res.status });
      return false;
    }
    return true;
  } catch (error) {
    logError("email.request_failed", error);
    return false;
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
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

  const logoSafe = sanitizeLogoUrl(input.logoUrl);
  const logoBlock =
    input.showLogo !== false && logoSafe
      ? `<div style="margin-bottom: 16px;"><img src="${escapeHtml(
          logoSafe,
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

const ROLE_LABEL: Record<"admin" | "employee", string> = {
  admin: "Administrateur",
  employee: "Collaborateur",
};

/** Invite a new team member to join a business on Paova. */
export async function sendMemberInvite(input: {
  to: string;
  businessName: string | null;
  role: "admin" | "employee";
  loginUrl: string;
  invitedByName?: string | null;
  brandColor?: string;
}): Promise<boolean> {
  const business = input.businessName?.trim() || "l'établissement";
  const color =
    input.brandColor && /^#[0-9a-fA-F]{6}$/.test(input.brandColor)
      ? input.brandColor
      : "#111827";
  const roleLabel = ROLE_LABEL[input.role];
  const from = (input.invitedByName ?? "").trim();

  const html = `
    <div style="font-family: -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; max-width: 520px; margin: 0 auto; color: #0a0a0a;">
      <h1 style="font-size: 20px; color: ${color};">Vous êtes invité·e sur Paova</h1>
      <p style="font-size: 14px; line-height: 1.6; color: #374151;">
        Bonjour,
      </p>
      <p style="font-size: 14px; line-height: 1.6; color: #374151;">
        ${from ? `${escapeHtml(from)} vous invite` : "Vous avez été invité·e"}
        à rejoindre l'espace <strong>${escapeHtml(business)}</strong> sur Paova,
        avec le rôle <strong>${escapeHtml(roleLabel)}</strong>.
      </p>
      <p style="margin: 24px 0;">
        <a href="${escapeHtml(input.loginUrl)}"
           style="display:inline-block;background:${color};color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:10px;font-size:14px;font-weight:600;">
          Accéder à l'espace
        </a>
      </p>
      <p style="font-size: 13px; line-height: 1.6; color: #6b7280;">
        Ce lien ouvre la connexion Paova avec
        ${escapeHtml(input.to)} prérempli. Demandez un lien magique sur
        la page de connexion — aucun mot de passe à retenir.
        Si le lien a expiré, allez sur paova.app/login avec la même adresse.
      </p>
      <p style="font-size: 12px; color: #9ca3af; margin-top: 24px;">
        Envoyé via Paova.
      </p>
    </div>
  `;

  return sendEmail({
    to: input.to,
    subject: `Invitation à rejoindre ${business} sur Paova`,
    html,
  });
}
