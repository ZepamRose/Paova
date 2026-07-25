"use client";

import { useMemo, useRef, useState } from "react";
import { memberMatchesQuery } from "@/lib/groups";
import { submitWaiver } from "@/app/w/[slug]/actions";

type WaiverField = {
  key: string;
  label: string;
  type: string;
  required: boolean;
  options?: string[];
};

type Member = {
  id: string;
  full_name: string;
  dob: string | null;
  note: string | null;
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

export function GroupSignFlow({
  groupToken,
  groupId,
  slug,
  legalText,
  fields,
  signerNameLabel,
  brandColor,
  members,
  isLegalRep = true,
}: {
  groupToken: string;
  groupId: string;
  slug: string;
  legalText: string;
  fields: WaiverField[];
  signerNameLabel: string;
  brandColor: string;
  members: Member[];
  /** Parental / minors framing vs adult self-signing. */
  isLegalRep?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [step, setStep] = useState<"find" | "sign">("find");
  const [signature, setSignature] = useState("");
  const [consent, setConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const participantsField = fields.find((f) => f.type === "participants");
  const otherFields = fields.filter((f) => f.type !== "participants");

  const matches = useMemo(() => {
    const q = query.trim();
    if (q.length < 2) return [];
    return members.filter((m) => memberMatchesQuery(m.full_name, q)).slice(0, 12);
  }, [members, query]);

  const selectedMembers = members.filter((m) => selected.includes(m.id));

  function toggle(id: string) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!signature || !consent || selectedMembers.length === 0) return;
    setSubmitting(true);
    const form = e.currentTarget;
    const fd = new FormData(form);
    fd.set("signature", signature);
    fd.set("slug", slug);
    fd.set("group_token", groupToken);
    fd.set("group_id", groupId);
    fd.set("group_member_ids", JSON.stringify(selectedMembers.map((m) => m.id)));
    if (participantsField) {
      fd.set(
        `field_${participantsField.key}`,
        JSON.stringify(
          selectedMembers.map((m) => ({
            name: m.full_name,
            dob: m.dob ?? "",
            note: m.note ?? "",
          })),
        ),
      );
    }
    try {
      await submitWaiver(fd);
    } catch {
      setSubmitting(false);
    }
  }

  if (step === "find") {
    return (
      <div className="flex flex-col gap-4">
        <div>
          <label className="text-[13px] font-medium text-[var(--color-foreground)]">
            {isLegalRep ? "Retrouver mon enfant" : "Retrouver mon nom"}
          </label>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Tapez le nom…"
            autoComplete="off"
            className="mt-1.5 h-12 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 text-[15px] outline-none focus:border-[var(--color-brand)]"
          />
          <p className="mt-1.5 text-[12px] text-[var(--color-muted)]">
            {isLegalRep
              ? "Au moins 2 lettres. Vous pouvez sélectionner plusieurs enfants (frères / sœurs)."
              : "Au moins 2 lettres pour retrouver votre fiche."}
          </p>
        </div>

        {query.trim().length >= 2 && matches.length === 0 ? (
          <p className="text-[14px] text-[var(--color-muted)]">
            {isLegalRep
              ? "Aucun enfant trouvé. Vérifiez l’orthographe ou demandez à l’accueil."
              : "Aucun nom trouvé. Vérifiez l’orthographe ou demandez à l’accueil."}
          </p>
        ) : null}

        <ul className="flex flex-col gap-2">
          {matches.map((m) => {
            const on = selected.includes(m.id);
            return (
              <li key={m.id}>
                <button
                  type="button"
                  onClick={() => toggle(m.id)}
                  className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left transition-colors ${
                    on
                      ? "border-[var(--color-brand)] bg-[color-mix(in_srgb,var(--color-brand)_10%,var(--color-surface))]"
                      : "border-[var(--color-border)] bg-[var(--color-surface)]"
                  }`}
                >
                  <span>
                    <span className="block text-[15px] font-medium">
                      {m.full_name}
                    </span>
                    {m.dob ? (
                      <span className="text-[12px] text-[var(--color-muted)]">
                        Né(e) le {m.dob}
                      </span>
                    ) : null}
                  </span>
                  <span
                    className={`text-[12px] font-medium ${on ? "text-[var(--color-brand)]" : "text-[var(--color-muted)]"}`}
                  >
                    {on ? "Sélectionné" : "Choisir"}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>

        <button
          type="button"
          disabled={selected.length === 0}
          onClick={() => setStep("sign")}
          className="mt-2 h-12 rounded-xl bg-[var(--color-brand)] text-[15px] font-medium text-white disabled:opacity-40"
          style={{ backgroundColor: brandColor }}
        >
          Continuer ({selected.length})
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5">
      <button
        type="button"
        onClick={() => setStep("find")}
        className="self-start text-[13px] text-[var(--color-muted)] hover:text-[var(--color-foreground)]"
      >
        ← Modifier la sélection
      </button>

      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
        <p className="text-[12px] font-medium uppercase tracking-wide text-[var(--color-muted)]">
          {isLegalRep ? "Enfant(s) concerné(s)" : "Participant(s)"}
        </p>
        <ul className="mt-2 space-y-1">
          {selectedMembers.map((m) => (
            <li key={m.id} className="text-[15px] font-medium">
              {m.full_name}
              {m.dob ? (
                <span className="font-normal text-[var(--color-muted)]">
                  {" "}
                  · {m.dob}
                </span>
              ) : null}
            </li>
          ))}
        </ul>
      </div>

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
          name="signer_name"
          required
          className="h-12 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 text-[15px]"
        />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-[13px] font-medium">
          Email <span className="font-normal text-[var(--color-muted)]">(facultatif)</span>
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
            <label key={field.key} className="flex items-start gap-2.5 text-[14px]">
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
        disabled={!signature || !consent || submitting}
        className="h-12 rounded-xl text-[15px] font-medium text-white disabled:opacity-40"
        style={{ backgroundColor: brandColor }}
      >
        {submitting ? "Envoi…" : "Signer"}
      </button>
    </form>
  );
}
