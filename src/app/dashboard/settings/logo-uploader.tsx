"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { updateLogo, removeLogo } from "./actions";

const MAX_SIZE = 2 * 1024 * 1024;
const ACCEPTED = ["image/png", "image/jpeg"];

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) {
    const ko = bytes / 1024;
    return `${ko < 10 ? ko.toFixed(1) : Math.round(ko)} Ko`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

function formatFromUrl(url: string): "PNG" | "JPG" {
  const lower = url.toLowerCase();
  if (lower.includes(".png") || lower.includes("image/png")) return "PNG";
  return "JPG";
}

export function LogoUploader({
  businessId,
  currentLogoUrl,
}: {
  businessId: string;
  currentLogoUrl: string | null;
}) {
  const [logoUrl, setLogoUrl] = useState<string | null>(currentLogoUrl);
  const [meta, setMeta] = useState<{ format: "PNG" | "JPG"; sizeLabel: string | null }>(
    () =>
      currentLogoUrl
        ? { format: formatFromUrl(currentLogoUrl), sizeLabel: null }
        : { format: "PNG", sizeLabel: null },
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!logoUrl) return;
    let cancelled = false;

    async function loadSize() {
      try {
        const res = await fetch(logoUrl!, { method: "HEAD" });
        const len = res.headers.get("content-length");
        if (!cancelled && len) {
          setMeta((m) => ({ ...m, sizeLabel: formatBytes(Number(len)) }));
        }
      } catch {
        /* ignore — size is optional metadata */
      }
    }

    void loadSize();
    return () => {
      cancelled = true;
    };
  }, [logoUrl]);

  const processFile = useCallback(
    async (file: File) => {
      setError("");

      if (!ACCEPTED.includes(file.type)) {
        setError("Format non supporté. Utilisez un PNG ou un JPG.");
        return;
      }
      if (file.size > MAX_SIZE) {
        setError("Fichier trop lourd. Maximum 2 Mo.");
        return;
      }

      setBusy(true);
      try {
        const supabase = createClient();
        const ext = file.type === "image/png" ? "png" : "jpg";
        const path = `${businessId}/logo-${Date.now()}.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from("logos")
          .upload(path, file, { upsert: true, cacheControl: "3600" });

        if (uploadError) {
          setError(uploadError.message);
          return;
        }

        const {
          data: { publicUrl },
        } = supabase.storage.from("logos").getPublicUrl(path);

        await updateLogo(publicUrl);
        setLogoUrl(publicUrl);
        setMeta({
          format: ext === "png" ? "PNG" : "JPG",
          sizeLabel: formatBytes(file.size),
        });
      } catch {
        setError("Une erreur est survenue pendant l'envoi.");
      } finally {
        setBusy(false);
        if (inputRef.current) inputRef.current.value = "";
      }
    },
    [businessId],
  );

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    await processFile(file);
  }

  async function handleRemove() {
    setBusy(true);
    setError("");
    try {
      await removeLogo();
      setLogoUrl(null);
      setMeta({ format: "PNG", sizeLabel: null });
    } catch {
      setError("Impossible de supprimer le logo.");
    } finally {
      setBusy(false);
    }
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) void processFile(file);
  }

  const metaLine = meta.sizeLabel
    ? `${meta.format} · ${meta.sizeLabel}`
    : meta.format;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <span className="text-sm font-medium tracking-tight">Logo</span>
        <p className="text-[13px] leading-relaxed text-[var(--color-muted)]">
          Affiché sur vos pages publiques et vos PDF.
        </p>
      </div>

      {logoUrl ? (
        <div className="overflow-hidden rounded-2xl border border-[color-mix(in_srgb,var(--color-border)_78%,var(--color-foreground))] bg-[var(--color-background)] shadow-[var(--elev-1)]">
          <div className="flex flex-col items-center gap-3 px-5 py-5 sm:gap-3.5 sm:py-6">
            {/* Neutral light vignette — readable for light, dark & transparent logos */}
            <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-2xl border border-black/[0.06] bg-[#f4f5f7] shadow-[0_1px_2px_rgba(15,23,42,0.04),0_6px_16px_-10px_rgba(15,23,42,0.12)] dark:border-white/10 dark:bg-[#e8eaee] dark:shadow-[0_1px_2px_rgba(0,0,0,0.25),0_8px_18px_-10px_rgba(0,0,0,0.45)] sm:h-[6.5rem] sm:w-[6.5rem]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={logoUrl}
                alt="Logo actuel"
                className="h-full w-full object-contain p-2.5"
              />
            </div>
            <div className="text-center">
              <p className="text-[13px] font-medium tracking-tight text-[var(--color-foreground)]">
                Logo actuel
              </p>
              <p className="mt-0.5 text-[12px] tabular-nums text-[var(--color-muted)]/80">
                {metaLine}
              </p>
            </div>
          </div>
          <div className="flex items-center justify-center gap-1.5 border-t border-[color-mix(in_srgb,var(--color-border)_60%,transparent)] bg-[var(--color-surface)] px-4 py-3 sm:gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => inputRef.current?.click()}
              className="inline-flex h-9 items-center rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 text-sm font-medium shadow-[var(--elev-1)] transition-[background-color,transform,box-shadow,border-color] duration-[180ms] ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-px hover:border-[color-mix(in_srgb,var(--color-border)_50%,var(--color-muted))] hover:bg-[var(--color-surface-2)] hover:shadow-[var(--elev-2)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brand)] active:translate-y-0 disabled:opacity-50"
            >
              {busy ? "Envoi…" : "Remplacer"}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={handleRemove}
              className="inline-flex h-9 items-center gap-1.5 rounded-xl px-3 text-sm font-medium text-[color-mix(in_srgb,#dc2626_68%,var(--color-muted))] transition-[color,background-color] duration-[180ms] hover:bg-[color-mix(in_srgb,#dc2626_7%,transparent)] hover:text-red-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500/40 disabled:opacity-50 dark:text-red-400/70 dark:hover:text-red-400"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.9"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <path d="M3 6h18" />
                <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                <path d="M10 11v6M14 11v6" />
              </svg>
              Supprimer
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
          onDragEnter={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            setDragging(false);
          }}
          onDrop={onDrop}
          className={`flex w-full cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border border-dashed px-6 py-9 text-center transition-[border-color,background-color,box-shadow] duration-[180ms] ease-[cubic-bezier(0.22,1,0.36,1)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brand)] disabled:cursor-not-allowed disabled:opacity-60 ${
            dragging
              ? "border-[var(--color-brand)] bg-[color-mix(in_srgb,var(--color-brand)_8%,var(--color-surface))] shadow-[var(--elev-2)]"
              : "border-[color-mix(in_srgb,var(--color-border)_85%,var(--color-foreground))] bg-[color-mix(in_srgb,var(--color-surface-2)_40%,var(--color-background))] hover:border-[color-mix(in_srgb,var(--color-brand)_28%,var(--color-border))] hover:bg-[color-mix(in_srgb,var(--color-brand)_4%,var(--color-surface))]"
          }`}
        >
          <span
            className={`flex h-11 w-11 items-center justify-center rounded-xl transition-colors duration-[180ms] ${
              dragging
                ? "bg-[color-mix(in_srgb,var(--color-brand)_14%,transparent)] text-[var(--color-brand)]"
                : "bg-[var(--color-surface)] text-[var(--color-muted)] shadow-[var(--elev-1)]"
            }`}
            aria-hidden
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="9" cy="9" r="2" />
              <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
            </svg>
          </span>
          <div className="flex flex-col gap-0.5">
            <p className="text-sm font-semibold tracking-tight text-[var(--color-foreground)]">
              {busy ? "Envoi en cours…" : "Déposez votre logo"}
            </p>
            <p className="text-[13px] text-[var(--color-muted)]">
              ou cliquez pour sélectionner
            </p>
          </div>
          <p className="text-[11px] tracking-wide text-[var(--color-muted)]/70">
            PNG • JPG · 2 Mo maximum
          </p>
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg"
        onChange={handleFile}
        className="hidden"
      />

      {error ? (
        <p className="text-sm text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
