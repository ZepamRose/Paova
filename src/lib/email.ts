import { env } from "@/lib/env";
import { sanitizeLogoUrl } from "@/lib/branding";
import { logError } from "@/lib/observability/log";
import {
  button,
  escapeHtml,
  heading,
  hint,
  paragraph,
  renderEmail,
  signature,
  type EmailBlock,
} from "@/lib/email-layout";

type Attachment = {
  filename: string;
  /** Base64-encoded file content. */
  content: string;
};

type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
  /** Plain-text alternative. Improves deliverability and screen-reader access. */
  text?: string;
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
        text: input.text,
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

  const signOff = (input.signature ?? "").trim() || `— L'équipe ${business}`;
  const logoSafe = input.showLogo !== false ? sanitizeLogoUrl(input.logoUrl) : null;

  const blocks: EmailBlock[] = [
    heading("Votre décharge est signée"),
    paragraph(
      `Bonjour ${escapeHtml(input.signerName)},`,
      `Bonjour ${input.signerName},`,
    ),
    paragraph(
      `Nous confirmons la signature de la décharge « ${escapeHtml(
        input.waiverTitle,
      )} » auprès de ${escapeHtml(business)}.`,
      `Nous confirmons la signature de la décharge « ${input.waiverTitle} » auprès de ${business}.`,
    ),
    paragraph(
      "Vous trouverez une copie de votre décharge signée en pièce jointe (PDF). Conservez-la précieusement.",
      "Vous trouverez une copie de votre décharge signée en pièce jointe (PDF). Conservez-la précieusement.",
    ),
    signature(signOff),
  ];

  const { html, text } = renderEmail({
    title: "Votre décharge est signée",
    preheader: `Votre copie signée de « ${input.waiverTitle} » est en pièce jointe.`,
    businessName: business,
    brandColor: color,
    logoUrl: logoSafe,
    blocks,
    footerNote: input.footer,
  });

  const base64 = Buffer.from(input.pdfBytes).toString("base64");
  const safeTitle = input.waiverTitle
    .replace(/[^a-z0-9]+/gi, "-")
    .toLowerCase();

  return sendEmail({
    to: input.to,
    from: formatFromAddress(input.fromName),
    subject,
    html,
    text,
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

  const blocks: EmailBlock[] = [
    heading("Signature en attente"),
    paragraph("Bonjour,", "Bonjour,"),
    paragraph(
      `${escapeHtml(business)} vous invite à signer la décharge « ${escapeHtml(
        input.waiverTitle,
      )} » pour <strong>${escapeHtml(namesLabel)}</strong> (groupe ${escapeHtml(
        input.groupName,
      )}).`,
      `${business} vous invite à signer la décharge « ${input.waiverTitle} » pour ${namesLabel} (groupe ${input.groupName}).`,
    ),
    button({
      href: input.signUrl,
      label: "Ouvrir le lien de signature",
      color,
    }),
    hint(
      "Sur la page, recherchez le nom puis signez. Ce lien est personnel au groupe.",
      "Sur la page, recherchez le nom puis signez. Ce lien est personnel au groupe.",
    ),
  ];

  const { html, text } = renderEmail({
    title: "Signature en attente",
    preheader: `${business} attend votre signature pour ${input.groupName}.`,
    businessName: business,
    brandColor: color,
    blocks,
  });

  return sendEmail({
    to: input.to,
    from: formatFromAddress(input.fromName ?? input.businessName),
    subject,
    html,
    text,
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

  const inviteLead = from
    ? `${escapeHtml(from)} vous invite`
    : "Vous avez été invité·e";
  const inviteLeadText = from ? `${from} vous invite` : "Vous avez été invité·e";

  const blocks: EmailBlock[] = [
    heading("Vous êtes invité·e sur Paova"),
    paragraph("Bonjour,", "Bonjour,"),
    paragraph(
      `${inviteLead} à rejoindre l'espace <strong>${escapeHtml(
        business,
      )}</strong> sur Paova, avec le rôle <strong>${escapeHtml(
        roleLabel,
      )}</strong>.`,
      `${inviteLeadText} à rejoindre l'espace ${business} sur Paova, avec le rôle ${roleLabel}.`,
    ),
    button({ href: input.loginUrl, label: "Accéder à l'espace", color }),
    hint(
      `Ce lien ouvre la connexion Paova avec ${escapeHtml(
        input.to,
      )} prérempli. Demandez un lien magique sur la page de connexion — aucun mot de passe à retenir. Si le lien a expiré, allez sur paova.app/login avec la même adresse.`,
      `Ce lien ouvre la connexion Paova avec ${input.to} prérempli. Demandez un lien magique sur la page de connexion — aucun mot de passe à retenir. Si le lien a expiré, allez sur paova.app/login avec la même adresse.`,
    ),
  ];

  const { html, text } = renderEmail({
    title: "Vous êtes invité·e sur Paova",
    preheader: `Rejoignez ${business} sur Paova en tant que ${roleLabel}.`,
    businessName: business,
    brandColor: color,
    blocks,
  });

  return sendEmail({
    to: input.to,
    subject: `Invitation à rejoindre ${business} sur Paova`,
    html,
    text,
  });
}
