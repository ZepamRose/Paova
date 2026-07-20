"use client";

import { useEffect, useRef, useState } from "react";
import { submitWaiver } from "./actions";

type WaiverField = {
  key: string;
  label: string;
  type: "text" | "date" | "checkbox";
  required: boolean;
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

export function SignForm({
  slug,
  fields,
  brandColor,
  hasError,
}: {
  slug: string;
  fields: WaiverField[];
  brandColor: string;
  hasError?: string;
}) {
  const [signature, setSignature] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = signature.length > 0 && !submitting;

  return (
    <form
      action={submitWaiver}
      onSubmit={() => setSubmitting(true)}
      className="flex flex-col gap-5"
    >
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="signature" value={signature} />

      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium" htmlFor="signer_name">
          Nom complet <span className="text-red-500">*</span>
        </label>
        <input
          id="signer_name"
          name="signer_name"
          required
          className="rounded-lg border border-[var(--color-border)] px-4 py-2.5 text-sm outline-none focus:border-gray-500"
        />
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium" htmlFor="signer_email">
          Email
        </label>
        <input
          id="signer_email"
          name="signer_email"
          type="email"
          className="rounded-lg border border-[var(--color-border)] px-4 py-2.5 text-sm outline-none focus:border-gray-500"
        />
      </div>

      {fields.map((field) => (
        <div key={field.key} className="flex flex-col gap-2">
          {field.type === "checkbox" ? (
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
              <input
                id={`field_${field.key}`}
                name={`field_${field.key}`}
                type={field.type === "date" ? "date" : "text"}
                required={field.required}
                className="rounded-lg border border-[var(--color-border)] px-4 py-2.5 text-sm outline-none focus:border-gray-500"
              />
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

      {hasError && (
        <p className="text-sm text-red-600">
          {hasError === "signature"
            ? "Merci de signer avant de valider."
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
