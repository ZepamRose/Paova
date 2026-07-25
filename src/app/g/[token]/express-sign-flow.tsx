"use client";

import { useRef, useState } from "react";
import { submitWaiver } from "@/app/w/[slug]/actions";

type WaiverField = {
  key: string;
  label: string;
  type: string;
  required: boolean;
  options?: string[];
};

function SignaturePad({
  onChange,
  color,
}: {
  onChange: (dataUrl: string) => void;
  color: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const hasDrawn = useRef(false);

  function setup() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ratio = Math.max(window.devicePixelRatio || 1, 1);
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * ratio;
    canvas.height = rect.height * ratio;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(ratio, ratio);
    ctx.lineWidth = 2.2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = color || "#111";
  }

  function pointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    setup();
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext("2d")!;
    drawing.current = true;
    hasDrawn.current = true;
    ctx.beginPath();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
    canvas.setPointerCapture(e.pointerId);
  }

  function pointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current) return;
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext("2d")!;
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.stroke();
  }

  function pointerUp() {
    drawing.current = false;
    if (hasDrawn.current && canvasRef.current) {
      onChange(canvasRef.current.toDataURL("image/png"));
    }
  }

  function clear() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx?.clearRect(0, 0, canvas.width, canvas.height);
    hasDrawn.current = false;
    onChange("");
    setup();
  }

  return (
    <div>
      <canvas
        ref={canvasRef}
        className="h-36 w-full touch-none rounded-xl border border-[var(--color-border)] bg-white"
        onPointerDown={pointerDown}
        onPointerMove={pointerMove}
        onPointerUp={pointerUp}
        onPointerCancel={pointerUp}
      />
      <button
        type="button"
        onClick={clear}
        className="mt-2 text-[13px] text-[var(--color-muted)] underline-offset-2 hover:underline"
      >
        Effacer
      </button>
    </div>
  );
}

/**
 * Walk-in signing for express groups.
 * - Adult leisure (self): one name — the person signs for themselves.
 * - Parental (legal rep): child identity + parent/guardian signer.
 */
export function ExpressSignFlow({
  groupToken,
  groupId,
  slug,
  legalText,
  fields,
  signerNameLabel,
  brandColor,
  askDob,
  participantLabel,
  isLegalRep,
}: {
  groupToken: string;
  groupId: string;
  slug: string;
  legalText: string;
  fields: WaiverField[];
  signerNameLabel: string;
  brandColor: string;
  askDob: boolean;
  participantLabel: string;
  isLegalRep: boolean;
}) {
  const [participantName, setParticipantName] = useState("");
  const [signerName, setSignerName] = useState("");
  const [dob, setDob] = useState("");
  const [signature, setSignature] = useState("");
  const [consent, setConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const participantsField = fields.find((f) => f.type === "participants");
  const otherFields = fields.filter((f) => f.type !== "participants");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const subjectName = isLegalRep
      ? participantName.trim()
      : signerName.trim() || participantName.trim();
    const parentOrSelf = isLegalRep ? signerName.trim() : subjectName;

    if (!subjectName || !parentOrSelf || !signature || !consent) return;
    if (askDob && !dob.trim()) return;

    setSubmitting(true);
    const form = e.currentTarget;
    const fd = new FormData(form);
    fd.set("signature", signature);
    fd.set("slug", slug);
    fd.set("group_token", groupToken);
    fd.set("group_id", groupId);
    fd.set("express_walk_in", "1");
    fd.set("signer_name", parentOrSelf);
    fd.set(
      "express_participants",
      JSON.stringify([{ name: subjectName, dob: dob.trim(), note: "" }]),
    );
    if (participantsField) {
      fd.set(
        `field_${participantsField.key}`,
        JSON.stringify([{ name: subjectName, dob: dob.trim(), note: "" }]),
      );
    }
    try {
      await submitWaiver(fd);
    } catch {
      setSubmitting(false);
    }
  }

  const primaryName = isLegalRep ? participantName : signerName;
  const canSubmit =
    Boolean(primaryName.trim()) &&
    Boolean(signature) &&
    consent &&
    !submitting &&
    (!isLegalRep || Boolean(signerName.trim())) &&
    (!askDob || Boolean(dob.trim()));

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5">
      <div className="rounded-xl border border-[color-mix(in_srgb,var(--color-brand)_22%,var(--color-border))] bg-[color-mix(in_srgb,var(--color-brand)_6%,var(--color-surface))] px-4 py-3">
        <p className="text-[13px] leading-snug text-[var(--color-foreground)]">
          {isLegalRep
            ? "Indiquez l’enfant concerné, puis signez en tant que responsable."
            : "Indiquez votre nom, puis signez. Pas besoin de chercher dans une liste."}
        </p>
      </div>

      {isLegalRep ? (
        <>
          <label className="flex flex-col gap-1.5">
            <span className="text-[13px] font-medium">{participantLabel}</span>
            <input
              value={participantName}
              onChange={(e) => setParticipantName(e.target.value)}
              required
              autoComplete="name"
              placeholder="Prénom et nom"
              className="h-12 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 text-[15px] outline-none focus:border-[var(--color-brand)]"
            />
          </label>

          {askDob ? (
            <label className="flex flex-col gap-1.5">
              <span className="text-[13px] font-medium">Date de naissance</span>
              <input
                value={dob}
                onChange={(e) => setDob(e.target.value)}
                required
                placeholder="JJ/MM/AAAA"
                className="h-12 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 text-[15px] outline-none focus:border-[var(--color-brand)]"
              />
            </label>
          ) : null}
        </>
      ) : null}

      <div className="rounded-xl border border-[var(--color-border)] bg-[color-mix(in_srgb,var(--color-surface-2)_70%,var(--color-surface))] p-4">
        <p className="text-[12px] font-medium text-[var(--color-muted)]">
          Texte juridique
        </p>
        <p className="mt-2 whitespace-pre-wrap text-[13.5px] leading-relaxed text-[var(--color-foreground)]">
          {legalText}
        </p>
      </div>

      <label className="flex flex-col gap-1.5">
        <span className="text-[13px] font-medium">{signerNameLabel}</span>
        <input
          value={signerName}
          onChange={(e) => setSignerName(e.target.value)}
          required
          autoComplete="name"
          placeholder="Prénom et nom"
          className="h-12 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 text-[15px] outline-none focus:border-[var(--color-brand)]"
        />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-[13px] font-medium">
          Email{" "}
          <span className="font-normal text-[var(--color-muted)]">
            (facultatif)
          </span>
        </span>
        <input
          name="signer_email"
          type="email"
          className="h-12 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 text-[15px]"
        />
      </label>

      {otherFields.map((field) => {
        if (field.type === "checkbox") {
          return (
            <label
              key={field.key}
              className="flex items-start gap-2.5 text-[14px]"
            >
              <input
                type="checkbox"
                name={`field_${field.key}`}
                value="true"
                required={field.required}
                className="mt-1"
              />
              <span>
                {field.label}
                {field.required ? " *" : ""}
              </span>
            </label>
          );
        }
        return (
          <label key={field.key} className="flex flex-col gap-1.5">
            <span className="text-[13px] font-medium">
              {field.label}
              {field.required ? " *" : ""}
            </span>
            {field.type === "textarea" ? (
              <textarea
                name={`field_${field.key}`}
                required={field.required}
                rows={3}
                className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 py-2.5 text-[15px]"
              />
            ) : (
              <input
                name={`field_${field.key}`}
                type={
                  field.type === "tel"
                    ? "tel"
                    : field.type === "date"
                      ? "date"
                      : field.type === "number"
                        ? "number"
                        : "text"
                }
                required={field.required}
                className="h-12 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 text-[15px]"
              />
            )}
          </label>
        );
      })}

      <div>
        <p className="mb-1.5 text-[13px] font-medium">Signature *</p>
        <SignaturePad onChange={setSignature} color={brandColor} />
      </div>

      <label className="flex items-start gap-2.5 text-[13px] leading-snug text-[var(--color-muted)]">
        <input
          type="checkbox"
          name="rgpd_consent"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
          className="mt-0.5"
        />
        <span>
          J’accepte que mes données et cette signature soient conservées pour
          la gestion de cette autorisation.
        </span>
      </label>

      <input
        type="hidden"
        name="client_timezone"
        value={
          typeof Intl !== "undefined"
            ? Intl.DateTimeFormat().resolvedOptions().timeZone
            : ""
        }
      />
      <input
        type="hidden"
        name="client_timezone_offset"
        value={String(-new Date().getTimezoneOffset())}
      />

      <button
        type="submit"
        disabled={!canSubmit}
        className="h-12 rounded-xl text-[15px] font-medium text-white disabled:opacity-40"
        style={{ backgroundColor: brandColor }}
      >
        {submitting ? "Envoi…" : "Signer"}
      </button>
    </form>
  );
}
