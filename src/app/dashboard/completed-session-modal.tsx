"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { X, CheckCircle2, XCircle, Clock, Calendar } from "lucide-react";
import { createPortal } from "react-dom";

type CompletedSessionModalProps = {
  session: {
    id: string;
    name: string;
    template_title: string;
    status: string;
    total: number;
    signed: number;
    end_time: string | null;
  };
  open: boolean;
  onClose: () => void;
};

const ease = "ease-[cubic-bezier(0.22,1,0.36,1)]";
const motion = `duration-[180ms] ${ease}`;

function getCompletionReason(session: CompletedSessionModalProps["session"]): {
  icon: React.ReactNode;
  title: string;
  description: string;
  tone: "success" | "neutral";
} {
  const allSigned = session.signed >= session.total && session.total > 0;
  const manuallyClosed = session.status === "closed";
  const hasEndTime = !!session.end_time;

  if (allSigned) {
    return {
      icon: <CheckCircle2 size={20} strokeWidth={2} className="text-[#059669]" />,
      title: "Toutes les signatures recueillies",
      description: `Les ${session.total} participants ont validé leur décharge.`,
      tone: "success",
    };
  }

  if (manuallyClosed) {
    return {
      icon: <XCircle size={20} strokeWidth={2} className="text-[var(--color-muted)]" />,
      title: "Fermée manuellement",
      description: "La session a été fermée avant la collecte complète des signatures.",
      tone: "neutral",
    };
  }

  if (hasEndTime) {
    const endDate = new Date(session.end_time!);
    const now = new Date();
    if (endDate <= now) {
      return {
        icon: <Clock size={20} strokeWidth={2} className="text-[var(--color-muted)]" />,
        title: "Clôturée automatiquement",
        description: "La session a atteint sa date de clôture prévue.",
        tone: "neutral",
      };
    }
  }

  return {
    icon: <Calendar size={20} strokeWidth={2} className="text-[var(--color-muted)]" />,
    title: "Activité terminée",
    description: "Cette session fait partie des activités terminées aujourd'hui.",
    tone: "neutral",
  };
}

export function CompletedSessionModal({
  session,
  open,
  onClose,
}: CompletedSessionModalProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open, onClose]);

  if (!open) return null;

  const reason = getCompletionReason(session);

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div
        ref={ref}
        className="relative w-full max-w-md animate-in zoom-in-95 duration-200"
      >
        <div className="rounded-2xl border border-[color-mix(in_srgb,var(--color-border)_65%,transparent)] bg-[var(--color-surface)] shadow-[0_24px_48px_-12px_rgba(0,0,0,0.25)] ring-1 ring-black/5 dark:ring-white/10">
          <div className="flex items-start justify-between gap-3 border-b border-[color-mix(in_srgb,var(--color-border)_45%,transparent)] px-5 py-4">
            <div className="flex-1 min-w-0">
              <h2
                id="modal-title"
                className="text-[15px] font-bold leading-tight tracking-tight text-[var(--color-foreground)]"
              >
                {session.name}
              </h2>
              <p className="mt-0.5 text-[12px] text-[var(--color-muted)]">
                {session.template_title}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[var(--color-muted)] transition-[background-color,color] ${motion} hover:bg-[var(--color-surface-2)] hover:text-[var(--color-foreground)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brand)]`}
              aria-label="Fermer"
            >
              <X size={16} strokeWidth={2} />
            </button>
          </div>

          <div className="px-5 py-5">
            <div className="mb-5">
              <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-[var(--color-muted)]/70">
                État final
              </p>
              <div className="inline-flex items-center gap-1.5 rounded-lg border border-[color-mix(in_srgb,var(--color-border)_55%,transparent)] bg-[var(--color-surface-2)] px-2.5 py-1.5">
                <span className="text-[13px] font-semibold text-[var(--color-foreground)]">
                  Session terminée
                </span>
              </div>
            </div>

            <div className="mb-5">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[var(--color-muted)]/70">
                Raison
              </p>
              <div
                className={`flex items-start gap-3 rounded-xl border p-4 ${
                  reason.tone === "success"
                    ? "border-[color-mix(in_srgb,#059669_25%,var(--color-border))] bg-[color-mix(in_srgb,#059669_4%,var(--color-surface))]"
                    : "border-[color-mix(in_srgb,var(--color-border)_55%,transparent)] bg-[var(--color-surface-2)]"
                }`}
              >
                <div className="shrink-0 mt-0.5">{reason.icon}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13.5px] font-semibold leading-snug text-[var(--color-foreground)]">
                    {reason.title}
                  </p>
                  <p className="mt-1 text-[12.5px] leading-relaxed text-[var(--color-muted)]">
                    {reason.description}
                  </p>
                </div>
              </div>
            </div>

            <div className="mb-5">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[var(--color-muted)]/70">
                Participation
              </p>
              <div className="flex items-center gap-2 text-[13px]">
                <span className="font-bold tabular-nums text-[var(--color-foreground)]">
                  {session.signed}
                </span>
                <span className="text-[var(--color-muted)]/60">/</span>
                <span className="font-bold tabular-nums text-[var(--color-foreground)]">
                  {session.total}
                </span>
                <span className="text-[var(--color-muted)]">
                  signature{session.total > 1 ? "s" : ""}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-[color-mix(in_srgb,var(--color-border)_45%,transparent)] px-5 py-4">
            <button
              type="button"
              onClick={onClose}
              className={`inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-[color-mix(in_srgb,var(--color-border)_68%,transparent)] bg-[var(--color-surface)] px-3.5 text-[13px] font-semibold tracking-tight text-[var(--color-foreground)]/80 shadow-sm transition-[background-color,transform,box-shadow,border-color,color] ${motion} hover:-translate-y-px hover:border-[color-mix(in_srgb,var(--color-border)_85%,var(--color-foreground))] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-foreground)] hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brand)] active:translate-y-0 active:scale-[0.98]`}
            >
              Fermer
            </button>
            <Link
              href={`/dashboard/groupes/${session.id}`}
              className={`inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-[var(--color-brand)] px-3.5 text-[13px] font-semibold tracking-tight text-[var(--color-on-brand)] shadow-[0_1px_0_rgba(255,255,255,0.12)_inset,var(--elev-1)] transition-[transform,filter,box-shadow] ${motion} hover:-translate-y-px hover:brightness-[1.04] hover:shadow-[0_1px_0_rgba(255,255,255,0.16)_inset,0_8px_20px_-8px_color-mix(in_srgb,var(--color-brand)_48%,transparent)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white active:translate-y-0 active:scale-[0.98]`}
            >
              Voir la session
            </Link>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
