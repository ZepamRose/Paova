"use client";

import { useRef, useState } from "react";
import { submitGroupRepresentativeSignature } from "./actions";

const MOTION = "duration-[180ms] ease-[cubic-bezier(0.22,1,0.36,1)]";

const INPUT_CLASS =
  "w-full min-h-[2.75rem] rounded-lg border border-[color-mix(in_srgb,var(--color-border)_85%,var(--color-foreground))] bg-[color-mix(in_srgb,var(--color-background)_58%,var(--color-surface))] px-3 py-2.5 text-[14px] text-[var(--color-foreground)] shadow-[var(--elev-1)] outline-none transition-[border-color,box-shadow,background-color] duration-[180ms] ease-[cubic-bezier(0.22,1,0.36,1)] placeholder:text-[var(--color-muted)]/40 hover:border-[color-mix(in_srgb,var(--color-border)_52%,var(--color-muted))] focus:border-[var(--public-brand)] focus:bg-[var(--color-surface)] focus:shadow-[0_0_0_2.5px_color-mix(in_srgb,var(--public-brand)_15%,transparent)]";

const sectionCard =
  "rounded-xl border border-[color-mix(in_srgb,var(--color-border)_75%,var(--color-foreground))] bg-[var(--color-surface)] p-4 shadow-[var(--elev-2)] ring-1 ring-black/[0.015] dark:ring-white/[0.035] sm:p-5";

function Spinner({ className = "" }: { className?: string }) {
  return (
    <svg
      className={`animate-spin ${className}`}
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
    >
      <circle
        cx="12"
        cy="12"
        r="9"
        stroke="currentColor"
        strokeOpacity="0.25"
        strokeWidth="2.5"
      />
      <path
        d="M21 12a9 9 0 0 0-9-9"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function RequiredMark() {
  return (
    <span className="ml-0.5 text-[var(--public-brand)]" aria-hidden>
      *
    </span>
  );
}

function OptionalHint() {
  return (
    <span className="ml-1 font-normal text-[var(--color-muted)]">
      (facultatif)
    </span>
  );
}

function SignaturePad({
  onChange,
  color,
}: {
  onChange: (dataUrl: string) => void;
  color: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const last = useRef<{ x: number; y: number } | null>(null);
  const hasDrawn = useRef(false);
  const [signed, setSigned] = useState(false);

  function setup() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ratio = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * ratio;
    canvas.height = rect.height * ratio;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.scale(ratio, ratio);
      ctx.lineWidth = 2.2;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.strokeStyle = color || "#111827";
    }
  }

  // Setup once on mount
  if (canvasRef.current && !hasDrawn.current) {
    setup();
  }

  function pos(e: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function start(e: React.PointerEvent<HTMLCanvasElement>) {
    e.preventDefault();
    if (!hasDrawn.current) setup();
    drawing.current = true;
    last.current = pos(e);
    canvasRef.current?.setPointerCapture(e.pointerId);
  }

  function move(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current) return;
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d");
    if (!ctx || !last.current) return;
    ctx.strokeStyle = color || "#111827";
    const p = pos(e);
    ctx.beginPath();
    ctx.moveTo(last.current.x, last.current.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    last.current = p;
    hasDrawn.current = true;
  }

  function end() {
    if (!drawing.current) return;
    drawing.current = false;
    last.current = null;
    if (hasDrawn.current && canvasRef.current) {
      setSigned(true);
      onChange(canvasRef.current.toDataURL("image/png"));
    }
  }

  function clear() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx?.clearRect(0, 0, canvas.width, canvas.height);
    hasDrawn.current = false;
    setSigned(false);
    onChange("");
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="relative">
        <canvas
          ref={canvasRef}
          onPointerDown={start}
          onPointerMove={move}
          onPointerUp={end}
          onPointerLeave={end}
          className={`h-40 w-full touch-none rounded-lg border bg-[color-mix(in_srgb,var(--color-background)_50%,var(--color-surface))] transition-[border-color,box-shadow] ${MOTION} ${
            signed
              ? "border-[color-mix(in_srgb,var(--public-brand)_32%,var(--color-border))]"
              : "border-[color-mix(in_srgb,var(--color-border)_78%,var(--color-foreground))]"
          }`}
          style={{
            boxShadow: signed
              ? `inset 0 0 0 1px color-mix(in srgb, ${color} 20%, transparent), var(--elev-1)`
              : `inset 0 1px 0 rgba(255,255,255,0.04), var(--elev-1)`,
          }}
        />
        {!signed ? (
          <p className="pointer-events-none absolute inset-x-0 bottom-2.5 text-center text-[11.5px] text-[var(--color-muted)]/50">
            Signez ici avec le doigt ou la souris
          </p>
        ) : null}
      </div>
      <div className="flex items-center justify-between gap-3">
        <p
          className={`text-[12px] ${
            signed
              ? "font-bold text-[var(--public-brand)]"
              : "font-semibold text-[var(--color-muted)]"
          }`}
        >
          {signed ? "Signature capturée" : "Signature obligatoire"}
        </p>
        <button
          type="button"
          onClick={clear}
          disabled={!signed}
          className={`rounded-lg px-2 py-1 text-[12px] font-semibold text-[var(--color-muted)] transition-[color,background-color,opacity] ${MOTION} hover:bg-[var(--color-surface-2)] hover:text-[var(--color-foreground)] disabled:pointer-events-none disabled:opacity-30`}
        >
          Effacer
        </button>
      </div>
    </div>
  );
}

type GroupRepresentativeSignFlowProps = {
  groupId: string;
  groupName: string;
  groupToken: string;
  templateId: string;
  slug: string;
  legalText: string;
  brandColor: string;
  participantCount: number;
  startTime: string | null;
};

export function GroupRepresentativeSignFlow({
  groupName,
  groupToken,
  legalText,
  brandColor,
  participantCount,
  startTime,
}: GroupRepresentativeSignFlowProps) {
  const [signerName, setSignerName] = useState("");
  const [signerEmail, setSignerEmail] = useState("");
  const [representativeRole, setRepresentativeRole] = useState("");
  const [signature, setSignature] = useState("");
  const [consent, setConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const canSubmit =
    signerName.trim().length >= 2 &&
    signerEmail.trim().includes("@") &&
    signature.length > 0 &&
    consent &&
    !submitting;

  // Format date and time if available
  let formattedDateTime = "";
  if (startTime) {
    try {
      const date = new Date(startTime);
      const dateStr = date.toLocaleDateString("fr-FR", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });
      const timeStr = date.toLocaleTimeString("fr-FR", {
        hour: "2-digit",
        minute: "2-digit",
      });
      formattedDateTime = `${dateStr} à ${timeStr}`;
    } catch {
      formattedDateTime = "";
    }
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6 sm:py-12">
      <form
        action={submitGroupRepresentativeSignature}
        onSubmit={() => setSubmitting(true)}
        className="flex flex-col gap-5"
      >
        <input type="hidden" name="group_token" value={groupToken} />
        <input type="hidden" name="signature" value={signature} />

        {/* Context Section */}
        <section className={sectionCard}>
          <div className="mb-4">
            <div className="flex items-center gap-2.5 mb-3">
              <span
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-lg"
                style={{ backgroundColor: brandColor }}
                aria-hidden
              >
                👥
              </span>
              <h1 className="text-lg font-bold tracking-tight text-[var(--color-foreground)]">
                Signature pour le groupe
              </h1>
            </div>
            <p className="text-[13.5px] leading-relaxed text-[var(--color-muted)]">
              Vous êtes sur le point de signer cette décharge au nom de l&apos;ensemble
              du groupe. Une seule signature suffit pour tous les participants.
            </p>
          </div>

          <div className="rounded-lg bg-[color-mix(in_srgb,var(--color-background)_45%,var(--color-surface))] p-3.5 ring-1 ring-[color-mix(in_srgb,var(--color-border)_52%,transparent)]">
            <h2 className="mb-2 text-[12px] font-bold uppercase tracking-wide text-[var(--color-muted)]">
              Détails de l&apos;activité
            </h2>
            <ul className="space-y-1.5 text-[13.5px] text-[var(--color-foreground)]">
              <li className="flex items-start gap-2">
                <span className="text-[var(--color-muted)]">•</span>
                <span>
                  <strong className="font-semibold">Activité :</strong> {groupName}
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[var(--color-muted)]">•</span>
                <span>
                  <strong className="font-semibold">Participants :</strong>{" "}
                  {participantCount} {participantCount > 1 ? "personnes" : "personne"}
                </span>
              </li>
              {formattedDateTime ? (
                <li className="flex items-start gap-2">
                  <span className="text-[var(--color-muted)]">•</span>
                  <span>
                    <strong className="font-semibold">Date et heure :</strong>{" "}
                    {formattedDateTime}
                  </span>
                </li>
              ) : null}
            </ul>
          </div>
        </section>

        {/* Legal Text Section */}
        <section className={sectionCard}>
          <h2 className="mb-3 text-[15px] font-bold tracking-tight text-[var(--color-foreground)]">
            Décharge de responsabilité
          </h2>
          <div
            className="prose prose-sm max-w-none text-[13px] leading-relaxed text-[var(--color-muted)]"
            dangerouslySetInnerHTML={{ __html: legalText }}
          />
        </section>

        {/* Representative Information */}
        <section
          className={`${sectionCard} border-[color-mix(in_srgb,var(--public-brand)_20%,var(--color-border))] bg-[color-mix(in_srgb,var(--color-surface)_96%,var(--public-brand))]`}
        >
          <div className="mb-4">
            <h2 className="text-[15px] font-bold tracking-tight text-[var(--color-foreground)]">
              Vos informations
            </h2>
            <p className="mt-0.5 text-[12.5px] leading-relaxed text-[var(--color-muted)]">
              Personne qui signe pour l&apos;ensemble du groupe.
            </p>
          </div>

          <div className="flex flex-col gap-3.5">
            <div className="flex flex-col gap-1.5">
              <label
                className="text-[12.5px] font-bold tracking-tight"
                htmlFor="signer_name"
              >
                Nom et prénom <RequiredMark />
              </label>
              <input
                id="signer_name"
                name="signer_name"
                value={signerName}
                onChange={(e) => setSignerName(e.target.value)}
                required
                autoComplete="name"
                placeholder="Ex. Marie Dubois"
                className={INPUT_CLASS}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label
                className="text-[12.5px] font-bold tracking-tight"
                htmlFor="signer_email"
              >
                Email <RequiredMark />
              </label>
              <input
                id="signer_email"
                name="signer_email"
                type="email"
                value={signerEmail}
                onChange={(e) => setSignerEmail(e.target.value)}
                required
                autoComplete="email"
                placeholder="marie@example.com"
                className={INPUT_CLASS}
              />
              <p className="text-[11.5px] leading-relaxed text-[var(--color-muted)]/75">
                Une copie de la décharge signée sera envoyée à cette adresse.
              </p>
            </div>

            <div className="flex flex-col gap-1.5">
              <label
                className="text-[12.5px] font-bold tracking-tight"
                htmlFor="representative_role"
              >
                Fonction <OptionalHint />
              </label>
              <input
                id="representative_role"
                name="representative_role"
                value={representativeRole}
                onChange={(e) => setRepresentativeRole(e.target.value)}
                placeholder="Ex. Enseignant, Responsable RH, Coach, Guide"
                className={INPUT_CLASS}
              />
              <p className="text-[11.5px] leading-relaxed text-[var(--color-muted)]/75">
                Précisez votre rôle ou qualité si pertinent.
              </p>
            </div>
          </div>
        </section>

        {/* Signature Section */}
        <section
          className={`${sectionCard} border-[color-mix(in_srgb,var(--public-brand)_20%,var(--color-border))] bg-[color-mix(in_srgb,var(--color-surface)_96%,var(--public-brand))]`}
        >
          <div className="mb-4">
            <h2 className="text-[15px] font-bold tracking-tight text-[var(--color-foreground)]">
              Votre signature
            </h2>
            <p className="mt-0.5 text-[12.5px] leading-relaxed text-[var(--color-muted)]">
              En signant, vous confirmez avoir l&apos;autorité nécessaire.
            </p>
          </div>

          <div className="flex flex-col gap-3.5">
            <SignaturePad onChange={setSignature} color={brandColor} />

            <div
              className={`rounded-lg border border-[color-mix(in_srgb,var(--public-brand)_25%,var(--color-border))] bg-[color-mix(in_srgb,var(--public-brand)_8%,var(--color-surface))] p-3.5`}
            >
              <p className="text-[13px] font-semibold leading-relaxed text-[var(--color-foreground)]">
                Je certifie être autorisé(e) à représenter ce groupe et à signer
                cette décharge en son nom.
              </p>
            </div>

            <label
              className={`flex cursor-pointer items-start gap-2.5 rounded-lg border border-[color-mix(in_srgb,var(--color-border)_65%,transparent)] bg-[color-mix(in_srgb,var(--color-surface)_90%,var(--color-background))] px-3 py-3 text-[13px] leading-relaxed transition-[border-color,background-color] ${MOTION} hover:border-[color-mix(in_srgb,var(--color-border)_85%,var(--color-foreground))]`}
            >
              <input
                type="checkbox"
                name="rgpd_consent"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
                required
                className="mt-0.5 h-4 w-4 rounded border-[var(--color-border)] accent-[var(--public-brand)]"
              />
              <span>
                J&apos;accepte que mes données (nom, email, fonction, signature)
                soient collectées et conservées pour la gestion de cette
                décharge, conformément à la{" "}
                <a
                  href="/confidentialite"
                  target="_blank"
                  rel="noreferrer"
                  className="font-medium underline underline-offset-2"
                  style={{ color: brandColor }}
                >
                  politique de confidentialité
                </a>
                . <RequiredMark />
              </span>
            </label>

            <button
              type="submit"
              disabled={!canSubmit}
              aria-busy={submitting}
              className={`inline-flex min-h-[2.85rem] w-full items-center justify-center gap-2 rounded-lg px-5 py-3 text-[14.5px] font-bold text-[var(--color-on-brand)] transition-[transform,filter,box-shadow,opacity] ${MOTION} hover:-translate-y-px hover:brightness-[1.04] active:translate-y-0 active:scale-[0.99] disabled:pointer-events-none disabled:opacity-40 disabled:hover:translate-y-0 disabled:hover:brightness-100`}
              style={{
                backgroundColor: brandColor,
                boxShadow: canSubmit
                  ? `0 1px 0 rgba(255,255,255,0.14) inset, 0 1px 2px rgba(0,0,0,0.06), 0 12px 24px -10px color-mix(in srgb, ${brandColor} 52%, transparent)`
                  : "none",
              }}
            >
              {submitting ? (
                <>
                  <Spinner />
                  <span>Envoi…</span>
                </>
              ) : (
                "Signer pour le groupe"
              )}
            </button>
          </div>
        </section>
      </form>
    </div>
  );
}
