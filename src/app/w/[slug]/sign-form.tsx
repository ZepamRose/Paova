"use client";

import { useEffect, useRef, useState } from "react";
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

const INPUT_CLASS =
  "rounded-lg border border-[var(--color-border)] px-4 py-2.5 text-sm outline-none focus:border-gray-500";

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
      ctx.strokeStyle = "#111827";
    }
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
  }

  return (
    <div className="flex flex-col gap-2">
      <canvas
        ref={canvasRef}
        onPointerDown={start}
        onPointerMove={move}
        onPointerUp={end}
        onPointerLeave={end}
        className="h-40 w-full touch-none rounded-lg border border-[var(--color-border)] bg-white"
        style={{ borderColor: color }}
      />
      <button
        type="button"
        onClick={clear}
        className="self-start text-xs text-[var(--color-muted)] underline"
      >
        Effacer la signature
      </button>
    </div>
  );
}

type Participant = { name: string; dob: string; note: string };

function ParticipantsField({ field }: { field: WaiverField }) {
  const [rows, setRows] = useState<Participant[]>([
    { name: "", dob: "", note: "" },
  ]);

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
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium">
        {field.label}
        {field.required && <span className="text-red-500"> *</span>}
      </span>
      <input type="hidden" name={`field_${field.key}`} value={serialized} />

      {rows.map((row, index) => (
        <div
          key={index}
          className="flex flex-col gap-2 rounded-lg border border-[var(--color-border)] p-3"
        >
          <div className="flex flex-wrap gap-2">
            <input
              value={row.name}
              onChange={(e) => update(index, { name: e.target.value })}
              placeholder="Nom du participant"
              className={`flex-1 ${INPUT_CLASS}`}
            />
            <input
              type="date"
              value={row.dob}
              onChange={(e) => update(index, { dob: e.target.value })}
              className={INPUT_CLASS}
            />
          </div>
          <input
            value={row.note}
            onChange={(e) => update(index, { note: e.target.value })}
            placeholder="Note (facultatif, ex. allergie)"
            className={INPUT_CLASS}
          />
          {rows.length > 1 && (
            <button
              type="button"
              onClick={() => remove(index)}
              className="self-start text-xs text-red-600 underline"
            >
              Retirer ce participant
            </button>
          )}
        </div>
      ))}

      <button
        type="button"
        onClick={add}
        className="self-start rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-sm font-medium transition-colors hover:bg-[var(--color-surface-2)]"
      >
        + Ajouter un participant
      </button>
    </div>
  );
}

export function SignForm({
  slug,
  fields,
  brandColor,
  businessName,
  signerNameLabel,
  hasError,
  borne = false,
}: {
  slug: string;
  fields: WaiverField[];
  brandColor: string;
  businessName?: string | null;
  signerNameLabel?: string | null;
  hasError?: string;
  borne?: boolean;
}) {
  const [signature, setSignature] = useState("");
  const [consent, setConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = signature.length > 0 && consent && !submitting;

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
            // Minutes east of UTC (e.g. Paris CET = 60)
            offset.value = String(-new Date().getTimezoneOffset());
          }
        } catch {
          // Best-effort only
        }
      }}
      className="flex flex-col gap-5"
    >
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="signature" value={signature} />
      <input type="hidden" name="client_timezone" value="" />
      <input type="hidden" name="client_timezone_offset" value="" />
      {borne ? <input type="hidden" name="borne" value="1" /> : null}
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium" htmlFor="signer_name">
          {signerNameLabel || "Nom complet"}{" "}
          <span className="text-red-500">*</span>
        </label>
        <input
          id="signer_name"
          name="signer_name"
          required
          className={INPUT_CLASS}
        />
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium" htmlFor="signer_email">
          Email{" "}
          <span className="font-normal text-[var(--color-muted)]">
            (facultatif)
          </span>
        </label>
        <input
          id="signer_email"
          name="signer_email"
          type="email"
          className={INPUT_CLASS}
        />
      </div>

      {fields.map((field) => (
        <div key={field.key} className="flex flex-col gap-2">
          {field.type === "participants" ? (
            <ParticipantsField field={field} />
          ) : field.type === "checkbox" ? (
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name={`field_${field.key}`}
                required={field.required}
              />
              {field.label}
              {field.required && <span className="text-red-500">*</span>}
            </label>
          ) : (
            <>
              <label
                className="text-sm font-medium"
                htmlFor={`field_${field.key}`}
              >
                {field.label}
                {field.required && <span className="text-red-500"> *</span>}
              </label>
              {field.type === "textarea" ? (
                <textarea
                  id={`field_${field.key}`}
                  name={`field_${field.key}`}
                  rows={4}
                  required={field.required}
                  className={INPUT_CLASS}
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
            </>
          )}
        </div>
      ))}

      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium">
          Signature <span className="text-red-500">*</span>
        </span>
        <SignaturePad onChange={setSignature} color={brandColor} />
      </div>

      <label className="flex items-start gap-2 text-sm">
        <input
          type="checkbox"
          name="rgpd_consent"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
          required
          className="mt-1"
        />
        <span>
          J&apos;accepte que {businessName ?? "l'établissement"} collecte et
          conserve mes données (nom, email, réponses, signature) pour la gestion
          de cette décharge, conformément à la{" "}
          <a
            href="/confidentialite"
            target="_blank"
            rel="noreferrer"
            className="underline"
          >
            politique de confidentialité
          </a>
          . <span className="text-red-500">*</span>
        </span>
      </label>

      {hasError && (
        <p className="text-sm text-red-600">
          {hasError === "signature"
            ? "Merci de signer avant de valider."
            : hasError === "consent"
              ? "Merci d'accepter le traitement de vos données pour continuer."
              : "Merci de remplir tous les champs obligatoires."}
        </p>
      )}

      <button
        type="submit"
        disabled={!canSubmit}
        className="rounded-lg px-5 py-3 text-sm font-medium text-white transition-opacity disabled:opacity-50"
        style={{ backgroundColor: brandColor }}
      >
        {submitting ? "Envoi…" : "Signer et valider"}
      </button>
    </form>
  );
}
