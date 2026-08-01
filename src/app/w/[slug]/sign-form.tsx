"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  resolveSignerNameLabel,
  type WaiverPackIntent,
} from "@/lib/waiver-packs";
import {
  buttonRadiusClass,
  DEFAULT_BUTTON_RADIUS,
  type BrandButtonRadius,
} from "@/lib/branding";
import { submitWaiver } from "./actions";

type WaiverField = {
  key: string;
  label: string;
  type:
    | "text"
    | "textarea"
    | "number"
    | "tel"
    | "date"
    | "checkbox"
    | "select"
    | "participants";
  required: boolean;
  options?: string[];
};

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
    <span
      className="ml-0.5 text-[var(--public-brand)]"
      aria-hidden
    >
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

function Section({
  step,
  title,
  description,
  children,
  featured = false,
}: {
  step?: number;
  title: string;
  description?: string;
  children: ReactNode;
  featured?: boolean;
}) {
  return (
    <section
      className={
        featured
          ? `${sectionCard} border-[color-mix(in_srgb,var(--public-brand)_20%,var(--color-border))] bg-[color-mix(in_srgb,var(--color-surface)_96%,var(--public-brand))]`
          : sectionCard
      }
    >
      <div className="mb-4 flex items-start gap-2.5">
        {typeof step === "number" ? (
          <span
            className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11.5px] font-bold tabular-nums text-[var(--color-on-brand)] shadow-[var(--elev-1)]"
            style={{ backgroundColor: "var(--public-brand)" }}
            aria-hidden
          >
            {step}
          </span>
        ) : null}
        <div className="min-w-0 pt-px">
          <h2 className="text-[15px] font-bold tracking-tight text-[var(--color-foreground)]">
            {title}
          </h2>
          {description ? (
            <p className="mt-0.5 text-[12.5px] leading-relaxed text-[var(--color-muted)]">
              {description}
            </p>
          ) : null}
        </div>
      </div>
      <div className="flex flex-col gap-3.5">{children}</div>
    </section>
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

  useEffect(() => {
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
    // Size once on mount — stroke color is applied during draw.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function pos(e: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function start(e: React.PointerEvent<HTMLCanvasElement>) {
    e.preventDefault();
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

type Participant = { name: string; dob: string; note: string };

function ParticipantsField({
  field,
  mode,
  brandColor,
  buttonRadius = DEFAULT_BUTTON_RADIUS,
}: {
  field: WaiverField;
  mode: "minors" | "participants";
  brandColor: string;
  brandAccent?: string;
  buttonRadius?: BrandButtonRadius;
}) {
  const radiusClass = buttonRadiusClass(buttonRadius);
  const [rows, setRows] = useState<Participant[]>([
    { name: "", dob: "", note: "" },
  ]);
  const isMinors = mode === "minors";

  function update(index: number, patch: Partial<Participant>) {
    setRows((prev) =>
      prev.map((r, i) => (i === index ? { ...r, ...patch } : r)),
    );
  }
  function add() {
    setRows((prev) => [...prev, { name: "", dob: "", note: "" }]);
  }
  function remove(index: number) {
    setRows((prev) => prev.filter((_, i) => i !== index));
  }

  const serialized = JSON.stringify(
    rows
      .filter((r) => r.name.trim().length > 0)
      .map((r) => ({
        name: r.name.trim(),
        dob: r.dob,
        note: r.note.trim(),
      })),
  );

  return (
    <div className="flex flex-col gap-2.5">
      <input type="hidden" name={`field_${field.key}`} value={serialized} />

      {rows.map((row, index) => (
        <div
          key={index}
          className="flex flex-col gap-3 rounded-lg bg-[color-mix(in_srgb,var(--color-background)_58%,var(--color-surface-2))] p-3.5 ring-1 ring-[color-mix(in_srgb,var(--color-border)_52%,transparent)]"
        >
          <div className="flex items-center justify-between gap-3">
            <p className="text-[12px] font-bold tracking-tight text-[var(--color-foreground)]/80">
              {isMinors ? `Enfant ${index + 1}` : `Participant ${index + 1}`}
            </p>
            {rows.length > 1 ? (
              <button
                type="button"
                onClick={() => remove(index)}
                className={`text-[11.5px] font-semibold text-[var(--color-muted)] transition-colors ${MOTION} hover:text-[var(--color-foreground)]`}
              >
                Retirer
              </button>
            ) : null}
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              className="text-[12.5px] font-bold tracking-tight"
              htmlFor={`participant-name-${field.key}-${index}`}
            >
              {isMinors ? "Nom et prénom" : "Nom"}{" "}
              {field.required ? <RequiredMark /> : null}
            </label>
            <input
              id={`participant-name-${field.key}-${index}`}
              value={row.name}
              onChange={(e) => update(index, { name: e.target.value })}
              placeholder={isMinors ? "Ex. Léa Dupont" : "Nom du participant"}
              required={field.required && index === 0}
              className={INPUT_CLASS}
              autoComplete="off"
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <label
                className="text-[12.5px] font-bold tracking-tight"
                htmlFor={`participant-dob-${field.key}-${index}`}
              >
                Date de naissance <OptionalHint />
              </label>
              <input
                id={`participant-dob-${field.key}-${index}`}
                value={row.dob}
                onChange={(e) => update(index, { dob: e.target.value })}
                placeholder="JJ/MM/AAAA"
                className={INPUT_CLASS}
                autoComplete="off"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label
                className="text-[12.5px] font-bold tracking-tight"
                htmlFor={`participant-note-${field.key}-${index}`}
              >
                Note <OptionalHint />
              </label>
              <input
                id={`participant-note-${field.key}-${index}`}
                value={row.note}
                onChange={(e) => update(index, { note: e.target.value })}
                placeholder="Ex. allergies"
                className={INPUT_CLASS}
                autoComplete="off"
              />
            </div>
          </div>
        </div>
      ))}

      <button
        type="button"
        onClick={add}
        className={`${radiusClass} flex h-10 items-center justify-center gap-2 border border-dashed border-[color-mix(in_srgb,var(--color-border)_58%,var(--color-foreground))] bg-[color-mix(in_srgb,var(--color-background)_45%,var(--color-surface))] text-[13px] font-semibold text-[var(--color-foreground)]/75 transition-[background-color,border-color,color] ${MOTION} hover:border-[color-mix(in_srgb,var(--public-brand)_35%,var(--color-border))] hover:bg-[color-mix(in_srgb,var(--public-brand)_6%,var(--color-surface))] hover:text-[var(--color-foreground)]`}
        style={{ color: "var(--color-foreground)" }}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="M12 5v14M5 12h14" />
        </svg>
        Ajouter {isMinors ? "un enfant" : "un participant"}
      </button>
    </div>
  );
}

function FieldBlock({ field }: { field: WaiverField }) {
  if (field.type === "checkbox") {
    return (
      <label className={`flex cursor-pointer items-start gap-2.5 rounded-lg border border-[color-mix(in_srgb,var(--color-border)_65%,transparent)] bg-[color-mix(in_srgb,var(--color-background)_45%,var(--color-surface))] px-3 py-3 text-[13.5px] leading-snug transition-[border-color,background-color] ${MOTION} hover:border-[color-mix(in_srgb,var(--color-border)_85%,var(--color-foreground))] hover:bg-[var(--color-surface)]`}>
        <input
          type="checkbox"
          name={`field_${field.key}`}
          required={field.required}
          className="mt-0.5 h-4 w-4 rounded border-[var(--color-border)] accent-[var(--public-brand)]"
        />
        <span>
          {field.label}
          {field.required ? <RequiredMark /> : null}
        </span>
      </label>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      <label
        className="text-[12.5px] font-bold tracking-tight"
        htmlFor={`field_${field.key}`}
      >
        {field.label}
        {field.required ? <RequiredMark /> : null}
      </label>
      {field.type === "textarea" ? (
        <textarea
          id={`field_${field.key}`}
          name={`field_${field.key}`}
          rows={4}
          required={field.required}
          className={`${INPUT_CLASS} min-h-[6.5rem] resize-y`}
        />
      ) : field.type === "select" ? (
        <select
          id={`field_${field.key}`}
          name={`field_${field.key}`}
          required={field.required}
          defaultValue=""
          className={INPUT_CLASS}
        >
          <option value="" disabled>
            Sélectionnez…
          </option>
          {(field.options ?? []).map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      ) : (
        <input
          id={`field_${field.key}`}
          name={`field_${field.key}`}
          type={
            field.type === "date"
              ? "date"
              : field.type === "number"
                ? "number"
                : field.type === "tel"
                  ? "tel"
                  : "text"
          }
          required={field.required}
          className={INPUT_CLASS}
        />
      )}
    </div>
  );
}

export function SignForm({
  slug,
  fields,
  brandColor,
  brandAccent,
  buttonRadius = DEFAULT_BUTTON_RADIUS,
  businessName,
  signerNameLabel,
  intent,
  hasError,
  borne = false,
}: {
  slug: string;
  fields: WaiverField[];
  brandColor: string;
  brandAccent?: string;
  buttonRadius?: BrandButtonRadius;
  businessName?: string | null;
  signerNameLabel?: string | null;
  intent: WaiverPackIntent;
  hasError?: string;
  borne?: boolean;
}) {
  const [signature, setSignature] = useState("");
  const [consent, setConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const accent = brandAccent || brandColor;
  const radiusClass = buttonRadiusClass(buttonRadius);
  const canSubmit = signature.length > 0 && consent && !submitting;
  const isLegalRep = intent.signerRole === "legal_representative";
  const participantsMode =
    intent.subjects === "minors" ? "minors" : "participants";

  const nameLabel = resolveSignerNameLabel({
    signerNameLabel,
    intent,
  });

  const participantFields = fields.filter((f) => f.type === "participants");
  const otherFields = fields.filter((f) => f.type !== "participants");

  const orderedOther =
    intent.subjects === "minors"
      ? otherFields
      : fields.filter((f) => f.type !== "participants");

  let step = 1;

  return (
    <form
      action={submitWaiver}
      onSubmit={(e) => {
        setSubmitting(true);
        const form = e.currentTarget;
        const tz = form.elements.namedItem(
          "client_timezone",
        ) as HTMLInputElement | null;
        const offset = form.elements.namedItem(
          "client_timezone_offset",
        ) as HTMLInputElement | null;
        try {
          if (tz) {
            tz.value = Intl.DateTimeFormat().resolvedOptions().timeZone ?? "";
          }
          if (offset) {
            offset.value = String(-new Date().getTimezoneOffset());
          }
        } catch {
          // Best-effort only
        }
      }}
      className="flex flex-col gap-4 sm:gap-5"
    >
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="signature" value={signature} />
      <input type="hidden" name="client_timezone" value="" />
      <input type="hidden" name="client_timezone_offset" value="" />
      {borne ? <input type="hidden" name="borne" value="1" /> : null}

      <Section
        step={step++}
        title={isLegalRep ? "Vos informations" : "Vos coordonnées"}
        description={
          isLegalRep
            ? "Parent ou représentant légal qui signe."
            : "Personne qui signe cette décharge."
        }
      >
        <div className="flex flex-col gap-1.5">
          <label
            className="text-[12.5px] font-bold tracking-tight"
            htmlFor="signer_name"
          >
            {nameLabel} <RequiredMark />
          </label>
          <input
            id="signer_name"
            name="signer_name"
            required
            autoComplete="name"
            className={INPUT_CLASS}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label
            className="text-[12.5px] font-bold tracking-tight"
            htmlFor="signer_email"
          >
            Email
            <OptionalHint />
          </label>
          <input
            id="signer_email"
            name="signer_email"
            type="email"
            autoComplete="email"
            className={INPUT_CLASS}
            aria-describedby="signer_email_hint"
            placeholder="prenom@email.com"
          />
          <p
            id="signer_email_hint"
            className="text-[11.5px] leading-relaxed text-[var(--color-muted)]/75"
          >
            Sans email, le document ne sera pas envoyé — vous pourrez télécharger
            votre copie juste après.
          </p>
        </div>
      </Section>

      {participantFields.map((field) => (
        <Section
          key={field.key}
          step={step++}
          title={field.label}
          description={
            participantsMode === "minors"
              ? "Chaque enfant concerné par cette autorisation."
              : "Personnes accompagnées, si besoin."
          }
        >
          <ParticipantsField
            field={field}
            mode={participantsMode}
            brandColor={brandColor}
            buttonRadius={buttonRadius}
          />
        </Section>
      ))}

      {orderedOther.length > 0 ? (
        <Section
          step={step++}
          title="Informations complémentaires"
          description="Quelques détails utiles pour l’établissement."
        >
          {orderedOther.map((field) => (
            <FieldBlock key={field.key} field={field} />
          ))}
        </Section>
      ) : null}

      <Section
        step={step++}
        title={
          isLegalRep ? "Signature du représentant légal" : "Votre signature"
        }
        description={
          isLegalRep
            ? "Confirme l’autorisation pour les personnes indiquées."
            : "Dernière étape pour valider votre décharge."
        }
        featured
      >
        <SignaturePad onChange={setSignature} color={brandColor} />

        <label className={`flex cursor-pointer items-start gap-2.5 rounded-lg border border-[color-mix(in_srgb,var(--color-border)_65%,transparent)] bg-[color-mix(in_srgb,var(--color-surface)_90%,var(--color-background))] px-3 py-3 text-[13px] leading-relaxed transition-[border-color,background-color] ${MOTION} hover:border-[color-mix(in_srgb,var(--color-border)_85%,var(--color-foreground))]`}>
          <input
            type="checkbox"
            name="rgpd_consent"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
            required
            className="mt-0.5 h-4 w-4 rounded border-[var(--color-border)] accent-[var(--public-brand)]"
          />
          <span>
            {isLegalRep ? (
              <>
                J&apos;accepte que {businessName ?? "l'établissement"} collecte
                et conserve mes données et celles des enfants concernés
                (identité, réponses, signature) pour la gestion de cette
                autorisation, conformément à la{" "}
              </>
            ) : (
              <>
                J&apos;accepte que {businessName ?? "l'établissement"} collecte
                et conserve mes données (nom, email, réponses, signature) pour
                la gestion de cette décharge, conformément à la{" "}
              </>
            )}
            <a
              href="/confidentialite"
              target="_blank"
              rel="noreferrer"
              className="font-medium underline underline-offset-2"
              style={{ color: accent }}
            >
              politique de confidentialité
            </a>
            . <RequiredMark />
          </span>
        </label>

        {hasError ? (
          <p
            role="alert"
            className="rounded-lg border border-[var(--color-warning-border)] bg-[var(--color-warning-bg)] px-3.5 py-2.5 text-[12.5px] text-[var(--color-warning-fg)]"
          >
            {hasError === "signature"
              ? "Merci de signer avant de valider."
              : hasError === "consent"
                ? "Merci d'accepter le traitement de vos données pour continuer."
                : hasError === "rate"
                  ? "Trop de tentatives depuis cet appareil. Patientez quelques minutes avant de réessayer."
                  : "Merci de remplir tous les champs obligatoires."}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={!canSubmit}
          aria-busy={submitting}
          className={`inline-flex min-h-[2.85rem] w-full items-center justify-center gap-2 ${radiusClass} px-5 py-3 text-[14.5px] font-bold text-[var(--color-on-brand)] transition-[transform,filter,box-shadow,opacity] ${MOTION} hover:-translate-y-px hover:brightness-[1.04] active:translate-y-0 active:scale-[0.99] disabled:pointer-events-none disabled:opacity-40 disabled:hover:translate-y-0 disabled:hover:brightness-100`}
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
          ) : isLegalRep ? (
            "Signer l'autorisation"
          ) : (
            "Signer et valider"
          )}
        </button>
      </Section>
    </form>
  );
}
