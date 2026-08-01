"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { X, CheckCircle2, XCircle, Clock, Calendar, ArrowRight } from "lucide-react";
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
    scheduled_at?: string | null;
    start_time?: string | null;
  };
  open: boolean;
  onClose: () => void;
};

const ease = "ease-[cubic-bezier(0.22,1,0.36,1)]";
const motion = `duration-[180ms] ${ease}`;

function formatActivityDateTime(dateStr: string | null | undefined): string | null {
  if (!dateStr) return null;
  const date = new Date(dateStr);
  const options: Intl.DateTimeFormatOptions = {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  };
  const timeOptions: Intl.DateTimeFormatOptions = {
    hour: '2-digit',
    minute: '2-digit',
  };
  const dateFormatted = date.toLocaleDateString('fr-FR', options);
  const timeFormatted = date.toLocaleTimeString('fr-FR', timeOptions);
  return `${dateFormatted.charAt(0).toUpperCase() + dateFormatted.slice(1)} · ${timeFormatted}`;
}

function getCompletionStory(session: CompletedSessionModalProps["session"]): {
  icon: React.ReactNode;
  headline: string;
  body: string;
  explanation?: string;
  tone: "success" | "neutral";
} {
  const allSigned = session.signed >= session.total && session.total > 0;
  const manuallyClosed = session.status === "closed";
  const hasEndTime = !!session.end_time;
  const activityTime = formatActivityDateTime(session.start_time || session.scheduled_at);

  if (allSigned) {
    return {
      icon: <CheckCircle2 size={20} strokeWidth={2.2} className="text-[#059669]" />,
      headline: "Toutes les signatures sont recueillies.",
      body: "La session est prête. Aucune autre action n'est nécessaire.",
      explanation: activityTime
        ? `Cette session apparaît dans "Terminées aujourd'hui" car toutes les signatures ont été recueillies.`
        : undefined,
      tone: "success",
    };
  }

  if (manuallyClosed) {
    const detail = session.signed > 0
      ? `${session.signed} signature${session.signed > 1 ? 's' : ''} sur ${session.total} ${session.signed > 1 ? 'ont été recueillies' : 'a été recueillie'}.`
      : "Aucune signature n'a été recueillie.";
    return {
      icon: <XCircle size={20} strokeWidth={2.2} className="text-[var(--color-muted)]" />,
      headline: "Cette session a été fermée manuellement.",
      body: detail,
      explanation: undefined,
      tone: "neutral",
    };
  }

  if (hasEndTime) {
    const endDate = new Date(session.end_time!);
    const now = new Date();
    if (endDate <= now) {
      return {
        icon: <Clock size={20} strokeWidth={2.2} className="text-[var(--color-muted)]" />,
        headline: "Cette session a atteint sa date de clôture.",
        body: "La collecte des signatures s'est terminée automatiquement.",
        explanation: undefined,
        tone: "neutral",
      };
    }
  }

  return {
    icon: <Calendar size={20} strokeWidth={2.2} className="text-[var(--color-muted)]" />,
    headline: "Cette session est terminée.",
    body: "Elle fait partie des activités terminées aujourd'hui.",
    explanation: undefined,
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

  const story = getCompletionStory(session);
  const activityTime = formatActivityDateTime(session.start_time || session.scheduled_at);

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
          {/* Header — simplifié */}
          <div className="flex items-start justify-between gap-3 px-6 pt-5 pb-4">
            <div className="flex-1 min-w-0">
              <h2
                id="modal-title"
                className="text-[16px] font-bold leading-tight tracking-tight text-[var(--color-foreground)]"
              >
                {session.name}
              </h2>
              <p className="mt-1 text-[12.5px] text-[var(--color-muted)]">
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

          {/* Content — histoire naturelle, sobre comme notification Apple */}
          <div className="px-6 pb-6">
            {/* Status principal — très sobre */}
            <div
              className={`flex items-start gap-3 rounded-xl p-4 mb-4 ${
                story.tone === "success"
                  ? "bg-[color-mix(in_srgb,#059669_4%,var(--color-surface))]"
                  : "bg-[var(--color-surface-2)]/40"
              }`}
            >
              <div className="shrink-0 mt-0.5">{story.icon}</div>
              <div className="flex-1 min-w-0 space-y-1.5">
                <p className="text-[14px] font-medium leading-snug text-[var(--color-foreground)]">
                  {story.headline}
                </p>
                <p className="text-[13px] leading-relaxed text-[var(--color-muted)]">
                  {story.body}
                </p>
              </div>
            </div>

            {/* Date de l'activité si disponible */}
            {activityTime && (
              <div className="mb-4">
                <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-[var(--color-muted)]/60">
                  Activité
                </p>
                <p className="text-[13px] text-[var(--color-foreground)]">
                  {activityTime}
                </p>
              </div>
            )}

            {/* Explication contextuelle */}
            {story.explanation && (
              <div className="mb-4 rounded-lg bg-[color-mix(in_srgb,var(--color-muted)_3%,transparent)] px-3 py-2.5">
                <p className="text-[12px] leading-relaxed text-[var(--color-muted)]">
                  {story.explanation}
                </p>
              </div>
            )}

            {/* Stats — très discrètes */}
            <div className="flex items-baseline gap-2 text-[13px] text-[var(--color-muted)]">
              <span className="font-semibold tabular-nums text-[var(--color-foreground)]">
                {session.signed}
              </span>
              <span className="text-[var(--color-muted)]/40">/</span>
              <span className="font-semibold tabular-nums text-[var(--color-foreground)]">
                {session.total}
              </span>
              <span>
                signature{session.total > 1 ? "s" : ""}
              </span>
            </div>
          </div>

          {/* Footer — hiérarchie inversée */}
          <div className="flex items-center justify-between gap-3 border-t border-[color-mix(in_srgb,var(--color-border)_40%,transparent)] px-6 py-4">
            <button
              type="button"
              onClick={onClose}
              className={`inline-flex h-9 items-center justify-center rounded-lg px-4 text-[13px] font-semibold tracking-tight text-[var(--color-foreground)]/80 transition-[background-color,color] ${motion} hover:bg-[var(--color-surface-2)] hover:text-[var(--color-foreground)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brand)] active:scale-[0.98]`}
            >
              Fermer
            </button>
            <Link
              href={`/dashboard/groupes/${session.id}`}
              className={`inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-[color-mix(in_srgb,var(--color-border)_70%,transparent)] bg-[var(--color-surface)] px-3.5 text-[13px] font-semibold tracking-tight text-[var(--color-foreground)] shadow-sm transition-[background-color,transform,box-shadow,border-color] ${motion} hover:-translate-y-px hover:border-[color-mix(in_srgb,var(--color-border)_90%,var(--color-foreground))] hover:bg-[var(--color-surface-2)] hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brand)] active:translate-y-0 active:scale-[0.98]`}
            >
              Voir les détails
              <ArrowRight size={14} strokeWidth={2} />
            </Link>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
