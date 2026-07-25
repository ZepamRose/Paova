"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  describePackIntent,
  emptyFormSeed,
  getPrimaryPacks,
  getSecondaryPacks,
  inferTemplateIntent,
  packToFormSeed,
  type WaiverPack,
  type WaiverPackIntent,
} from "@/lib/waiver-packs";
import { PendingSubmitButton } from "../pending-submit-button";
import { createTemplate, updateTemplate } from "./actions";

const EASE = [0.22, 1, 0.36, 1] as const;

type FieldType =
  | "text"
  | "textarea"
  | "number"
  | "tel"
  | "date"
  | "checkbox"
  | "select"
  | "participants";

type Field = {
  key?: string;
  label: string;
  type: FieldType;
  required: boolean;
  options?: string[];
};

const TYPE_LABELS: { value: FieldType; label: string }[] = [
  { value: "text", label: "Texte" },
  { value: "textarea", label: "Texte long" },
  { value: "number", label: "Nombre" },
  { value: "tel", label: "Téléphone" },
  { value: "date", label: "Date" },
  { value: "checkbox", label: "Case à cocher" },
  { value: "select", label: "Liste déroulante" },
  { value: "participants", label: "Liste de participants" },
];

const MOTION = "duration-[220ms] ease-[cubic-bezier(0.22,1,0.36,1)]";

const card =
  "rounded-[1.2rem] border border-[color-mix(in_srgb,var(--color-border)_72%,var(--color-foreground))] bg-[var(--color-surface)] p-6 shadow-[var(--elev-3)] ring-1 ring-black/[0.02] dark:ring-white/[0.04] sm:p-7";

const fieldClass =
  `mt-2 min-h-[3.15rem] w-full rounded-xl border border-[color-mix(in_srgb,var(--color-border)_78%,var(--color-foreground))] bg-[color-mix(in_srgb,var(--color-background)_72%,var(--color-surface-2))] px-4 py-3.5 text-sm outline-none transition-[border-color,box-shadow,background-color] ${MOTION} placeholder:text-[var(--color-muted)]/48 hover:border-[color-mix(in_srgb,var(--color-border)_55%,var(--color-muted))] hover:bg-[color-mix(in_srgb,var(--color-background)_55%,var(--color-surface))] focus-visible:border-[var(--color-brand)] focus-visible:bg-[var(--color-surface)] focus-visible:shadow-[0_0_0_3px_color-mix(in_srgb,var(--color-brand)_16%,transparent)]`;

const fieldCompact =
  `min-h-[2.75rem] w-full rounded-xl border border-[color-mix(in_srgb,var(--color-border)_78%,var(--color-foreground))] bg-[color-mix(in_srgb,var(--color-background)_72%,var(--color-surface-2))] px-3.5 py-2.5 text-sm outline-none transition-[border-color,box-shadow,background-color] ${MOTION} placeholder:text-[var(--color-muted)]/48 hover:border-[color-mix(in_srgb,var(--color-border)_55%,var(--color-muted))] hover:bg-[color-mix(in_srgb,var(--color-background)_55%,var(--color-surface))] focus-visible:border-[var(--color-brand)] focus-visible:bg-[var(--color-surface)] focus-visible:shadow-[0_0_0_3px_color-mix(in_srgb,var(--color-brand)_16%,transparent)]`;

const primaryBtn =
  `inline-flex h-10 items-center justify-center rounded-xl bg-[var(--color-brand)] px-5 text-sm font-semibold text-[var(--color-on-brand)] shadow-[0_1px_0_rgba(255,255,255,0.12)_inset,0_1px_2px_rgba(0,0,0,0.06),0_8px_20px_-10px_color-mix(in_srgb,var(--color-brand)_45%,transparent)] transition-[transform,box-shadow,filter] ${MOTION} hover:-translate-y-px hover:brightness-[1.04] hover:shadow-[0_1px_0_rgba(255,255,255,0.16)_inset,0_12px_28px_-12px_color-mix(in_srgb,var(--color-brand)_52%,transparent)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brand)] active:translate-y-0 active:scale-[0.99] disabled:pointer-events-none disabled:opacity-60`;

const secondaryBtn =
  `inline-flex h-10 items-center justify-center rounded-xl border border-[color-mix(in_srgb,var(--color-border)_70%,transparent)] bg-[color-mix(in_srgb,var(--color-surface)_92%,var(--color-surface-2))] px-3.5 text-sm font-medium text-[var(--color-foreground)]/78 shadow-[var(--elev-1)] transition-[color,background-color,border-color,box-shadow,transform] ${MOTION} hover:-translate-y-px hover:border-[color-mix(in_srgb,var(--color-border)_88%,var(--color-foreground))] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-foreground)] hover:shadow-[var(--elev-2)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brand)] active:scale-[0.99]`;

const ghostAddBtn =
  `inline-flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-xl border border-[color-mix(in_srgb,var(--color-border)_72%,var(--color-foreground))] bg-[var(--color-surface)] px-3.5 text-[13px] font-medium text-[var(--color-foreground)] shadow-[var(--elev-1)] transition-[background-color,border-color,transform,box-shadow] ${MOTION} hover:-translate-y-px hover:bg-[var(--color-surface-2)] hover:shadow-[var(--elev-2)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brand)] active:scale-[0.99]`;

type Initial = {
  id: string;
  title: string;
  legalText: string;
  signerNameLabel: string;
  fields: Field[];
  hasSubmissions: boolean;
};

function SectionIcon({ children }: { children: ReactNode }) {
  return (
    <span
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[color-mix(in_srgb,var(--color-brand)_12%,transparent)] text-[var(--color-brand)] shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--color-brand)_18%,transparent)]"
      aria-hidden
    >
      {children}
    </span>
  );
}

function SectionHeader({
  icon,
  title,
  description,
}: {
  icon: ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <SectionIcon>{icon}</SectionIcon>
      <div className="min-w-0 flex-1 pt-px">
        <h2 className="text-[1.05rem] font-semibold tracking-tight text-[var(--color-foreground)] sm:text-[1.1rem]">
          {title}
        </h2>
        <p className="mt-1 text-[13px] leading-relaxed text-[var(--color-muted)]">
          {description}
        </p>
      </div>
    </div>
  );
}

function PackOption({
  pack,
  selected,
  onSelect,
}: {
  pack: WaiverPack;
  selected: boolean;
  onSelect: (pack: WaiverPack) => void;
}) {
  return (
    <button
      type="button"
      role="option"
      aria-selected={selected}
      onClick={() => onSelect(pack)}
      className={`flex w-full items-start gap-3 rounded-xl px-3.5 py-3 text-left transition-colors duration-[150ms] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--color-brand)] ${
        selected
          ? "bg-[color-mix(in_srgb,var(--color-brand)_10%,transparent)]"
          : "hover:bg-[var(--color-surface-2)]"
      }`}
    >
      <span
        className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
          selected
            ? "border-[var(--color-brand)] bg-[var(--color-brand)] text-[var(--color-on-brand)]"
            : "border-[color-mix(in_srgb,var(--color-border)_80%,var(--color-muted))]"
        }`}
        aria-hidden
      >
        {selected ? (
          <svg
            width="10"
            height="10"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M20 6 9 17l-5-5" />
          </svg>
        ) : null}
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-semibold tracking-tight text-[var(--color-foreground)]">
          {pack.label}
        </span>
        <span className="mt-0.5 block text-[13px] leading-snug text-[var(--color-muted)]">
          {pack.description}
        </span>
      </span>
    </button>
  );
}

function PackPicker({
  selectedId,
  onSelect,
  onClear,
}: {
  selectedId: string | null;
  onSelect: (pack: WaiverPack) => void;
  onClear: () => void;
}) {
  const reduced = useReducedMotion() ?? false;
  const primaryPacks = getPrimaryPacks();
  const secondaryPacks = getSecondaryPacks();
  const selectedIsSecondary = secondaryPacks.some((p) => p.id === selectedId);
  const [open, setOpen] = useState(false);
  const [showSecondary, setShowSecondary] = useState(selectedIsSecondary);
  const rootRef = useRef<HTMLDivElement>(null);
  const listId = useId();
  const selected =
    primaryPacks.find((p) => p.id === selectedId) ??
    secondaryPacks.find((p) => p.id === selectedId) ??
    null;

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  function choose(pack: WaiverPack) {
    onSelect(pack);
    setOpen(false);
  }

  return (
    <div ref={rootRef} className="relative mt-6">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((value) => !value)}
        className={`flex w-full items-center justify-between gap-3 rounded-xl border px-4 py-3.5 text-left transition-[border-color,background-color,box-shadow,transform] ${MOTION} focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brand)] ${
          selected
            ? "border-[color-mix(in_srgb,var(--color-brand)_55%,var(--color-border))] bg-[color-mix(in_srgb,var(--color-brand)_9%,var(--color-surface))] shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--color-brand)_22%,transparent)]"
            : "border-[color-mix(in_srgb,var(--color-border)_78%,var(--color-foreground))] bg-[color-mix(in_srgb,var(--color-background)_72%,var(--color-surface-2))] hover:border-[color-mix(in_srgb,var(--color-border)_55%,var(--color-muted))] hover:bg-[var(--color-surface)]"
        }`}
      >
        <span className="min-w-0">
          {selected ? (
            <>
              <span className="block text-[11px] font-medium uppercase tracking-[0.12em] text-[var(--color-muted)]/75">
                Contexte sélectionné
              </span>
              <span className="mt-1 block text-sm font-semibold tracking-tight text-[var(--color-foreground)]">
                {selected.label}
              </span>
              <span className="mt-0.5 block truncate text-[13px] text-[var(--color-muted)]">
                {selected.description}
              </span>
            </>
          ) : (
            <>
              <span className="block text-sm font-semibold tracking-tight text-[var(--color-foreground)]">
                Choisir un contexte
              </span>
              <span className="mt-0.5 block text-[13px] text-[var(--color-muted)]">
                Standard, autorisation parentale, sport, événement…
              </span>
            </>
          )}
        </span>
        <span
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[color-mix(in_srgb,var(--color-border)_75%,transparent)] bg-[var(--color-surface)] text-[var(--color-muted)] transition-transform ${MOTION} ${
            open ? "rotate-180" : ""
          }`}
          aria-hidden
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        </span>
      </button>

      <AnimatePresence>
        {open ? (
          <motion.div
            id={listId}
            role="listbox"
            aria-label="Contextes de décharge"
            initial={reduced ? false : { opacity: 0, y: 6, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, y: 4, scale: 0.985 }}
            transition={{ duration: 0.18, ease: EASE }}
            className="absolute left-0 right-0 z-30 mt-2 origin-top overflow-hidden rounded-2xl border border-[color-mix(in_srgb,var(--color-border)_80%,var(--color-foreground))] bg-[var(--color-surface)] shadow-[var(--elev-3)]"
          >
            <div className="max-h-[min(22rem,55vh)] overflow-y-auto overscroll-contain p-1.5">
              {primaryPacks.map((pack) => (
                <PackOption
                  key={pack.id}
                  pack={pack}
                  selected={selectedId === pack.id}
                  onSelect={choose}
                />
              ))}

              {secondaryPacks.length > 0 ? (
                <div className="mt-1 border-t border-[color-mix(in_srgb,var(--color-border)_70%,transparent)] pt-1">
                  <button
                    type="button"
                    onClick={() => setShowSecondary((value) => !value)}
                    className="flex w-full items-center justify-between rounded-xl px-3.5 py-2.5 text-left text-[13px] font-medium text-[var(--color-muted)] transition-colors hover:bg-[var(--color-surface-2)] hover:text-[var(--color-foreground)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--color-brand)]"
                  >
                    <span>
                      {showSecondary
                        ? "Masquer les autres contextes"
                        : "Voir plus de contextes"}
                    </span>
                    <span aria-hidden>{showSecondary ? "−" : "+"}</span>
                  </button>

                  {showSecondary
                    ? secondaryPacks.map((pack) => (
                        <PackOption
                          key={pack.id}
                          pack={pack}
                          selected={selectedId === pack.id}
                          onSelect={choose}
                        />
                      ))
                    : null}
                </div>
              ) : null}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {selected ? (
        <div className="mt-3 flex flex-col gap-2">
          <p className="text-[13px] leading-relaxed text-[var(--color-foreground)]/80">
            {describePackIntent(selected)}
          </p>
          <div className="flex items-center justify-between gap-3">
            <p className="text-[12px] leading-relaxed text-[var(--color-muted)]">
              Formulaire pré-rempli — tout reste modifiable.
            </p>
            <div className="flex shrink-0 items-center gap-3">
              <button
                type="button"
                onClick={onClear}
                className="text-[12px] font-medium text-[var(--color-muted)] transition-colors hover:text-[var(--color-foreground)] focus-visible:rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brand)]"
              >
                Partir de zéro
              </button>
              <button
                type="button"
                onClick={() => setOpen(true)}
                className="text-[12px] font-medium text-[var(--color-brand)] transition-opacity hover:opacity-80 focus-visible:rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brand)]"
              >
                Changer
              </button>
            </div>
          </div>
        </div>
      ) : (
        <p className="mt-3 text-[12px] leading-relaxed text-[var(--color-muted)]">
          Sans contexte, vous construisez la décharge librement. Ne collectez
          que les données nécessaires (RGPD).
        </p>
      )}
    </div>
  );
}

export function WaiverForm({
  hasError,
  initial,
  returnTo,
}: {
  hasError?: boolean;
  initial?: Initial;
  returnTo?: string | null;
}) {
  const isEdit = Boolean(initial);
  const blank = emptyFormSeed();
  const initialIntent = initial
    ? inferTemplateIntent({
        fields: initial.fields,
        signerNameLabel: initial.signerNameLabel,
      })
    : blank.intent;

  const [title, setTitle] = useState(initial?.title ?? blank.title);
  const [legalText, setLegalText] = useState(
    initial?.legalText ?? blank.legalText,
  );
  const [signerNameLabel, setSignerNameLabel] = useState(
    initial?.signerNameLabel ?? blank.signerNameLabel,
  );
  const [fields, setFields] = useState<Field[]>(
    initial?.fields ?? blank.fields,
  );
  const [selectedPackId, setSelectedPackId] = useState<string | null>(null);
  const [intent, setIntent] = useState<WaiverPackIntent>(initialIntent);

  function applyPack(pack: WaiverPack) {
    const seed = packToFormSeed(pack);
    setSelectedPackId(pack.id);
    setIntent(seed.intent);
    setTitle(seed.title);
    setLegalText(seed.legalText);
    setSignerNameLabel(seed.signerNameLabel);
    setFields(seed.fields);
  }

  function clearPack() {
    const seed = emptyFormSeed();
    setSelectedPackId(null);
    setIntent(seed.intent);
    setTitle(seed.title);
    setLegalText(seed.legalText);
    setSignerNameLabel(seed.signerNameLabel);
    setFields(seed.fields);
  }

  const contentDescription =
    intent.signerRole === "legal_representative"
      ? "Le titre et le texte visibles par le parent ou représentant légal."
      : "Le titre et le texte visibles par vos participants.";

  const fieldsDescription =
    intent.subjects === "minors"
      ? "Ajoutez les infos utiles. Le bloc enfants est déjà prévu pour ce contexte."
      : intent.subjects === "participants"
        ? "Ajoutez les infos utiles. Les accompagnants peuvent être listés si besoin."
        : "Ajoutez les informations dont vous avez réellement besoin.";

  const signerNameHelp =
    intent.signerRole === "legal_representative"
      ? "Indiquez clairement qu’il s’agit du parent ou responsable."
      : "Par défaut : « Nom complet ».";

  const typeLabels =
    intent.subjects === "minors"
      ? TYPE_LABELS.map((t) =>
          t.value === "participants"
            ? { ...t, label: "Liste d'enfants" }
            : t,
        )
      : TYPE_LABELS;

  function addField() {
    setFields((prev) => [...prev, { label: "", type: "text", required: false }]);
  }

  function updateField(index: number, patch: Partial<Field>) {
    setFields((prev) =>
      prev.map((f, i) => (i === index ? { ...f, ...patch } : f)),
    );
  }

  function removeField(index: number) {
    setFields((prev) => prev.filter((_, i) => i !== index));
  }

  const cancelHref = isEdit
    ? `/dashboard/waivers/${initial!.id}`
    : returnTo || "/dashboard";

  return (
    <form
      action={isEdit ? updateTemplate : createTemplate}
      className="flex flex-col gap-5 sm:gap-6"
    >
      {isEdit && <input type="hidden" name="id" value={initial!.id} />}
      <input type="hidden" name="fields" value={JSON.stringify(fields)} />
      {!isEdit && selectedPackId ? (
        <input type="hidden" name="starter_pack_id" value={selectedPackId} />
      ) : null}
      {!isEdit && returnTo ? (
        <input type="hidden" name="return_to" value={returnTo} />
      ) : null}

      {hasError ? (
        <p
          role="alert"
          className="rounded-xl border border-[color-mix(in_srgb,#b45309_25%,var(--color-border))] bg-[color-mix(in_srgb,#b45309_8%,var(--color-background))] px-4 py-3.5 text-sm leading-relaxed text-[#92400e] dark:text-[#fbbf24]"
        >
          Le titre et le texte juridique sont obligatoires.
        </p>
      ) : null}

      {!isEdit && (
        <section className={card}>
          <SectionHeader
            icon={
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.85"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <path d="M14 2v6h6" />
                <path d="M16 13H8" />
                <path d="M16 17H8" />
                <path d="M10 9H8" />
              </svg>
            }
            title="Choisir un contexte"
            description="Optionnel. Un contexte prépare les champs et le texte adaptés — tout reste modifiable."
          />

          <PackPicker
            selectedId={selectedPackId}
            onSelect={applyPack}
            onClear={clearPack}
          />
        </section>
      )}

      <section className={card}>
        <SectionHeader
          icon={
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.85"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
            </svg>
          }
          title="Contenu"
          description={contentDescription}
        />

        <div className="mt-7 flex flex-col gap-6 sm:gap-7">
          <div className="flex flex-col gap-1">
            <label
              htmlFor="title"
              className="text-[13px] font-medium tracking-tight text-[var(--color-foreground)]/90"
            >
              Titre de la décharge
            </label>
            <input
              id="title"
              name="title"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex. Décharge — Session escape game"
              className={fieldClass}
            />
          </div>

          <div className="h-px w-full bg-[color-mix(in_srgb,var(--color-border)_55%,transparent)]" />

          <div className="flex flex-col gap-1">
            <label
              htmlFor="legal_text"
              className="text-[13px] font-medium tracking-tight text-[var(--color-foreground)]/90"
            >
              Texte juridique
            </label>
            <p className="text-[13px] leading-relaxed text-[var(--color-muted)]">
              {intent.signerRole === "legal_representative"
                ? "Le nom et l'email du représentant légal sont toujours collectés."
                : "Le nom et l'email du signataire sont toujours collectés."}
            </p>
            <textarea
              id="legal_text"
              name="legal_text"
              required
              rows={7}
              value={legalText}
              onChange={(e) => setLegalText(e.target.value)}
              className={`${fieldClass} min-h-[10rem] resize-y`}
            />
          </div>

          <div className="flex flex-col gap-1">
            <label
              htmlFor="signer_name_label"
              className="text-[13px] font-medium tracking-tight text-[var(--color-foreground)]/90"
            >
              Libellé du nom du signataire{" "}
              <span className="font-normal text-[var(--color-muted)]">
                (optionnel)
              </span>
            </label>
            <p className="text-[13px] leading-relaxed text-[var(--color-muted)]">
              {signerNameHelp}
            </p>
            <input
              id="signer_name_label"
              name="signer_name_label"
              value={signerNameLabel}
              onChange={(e) => setSignerNameLabel(e.target.value)}
              placeholder={
                intent.signerRole === "legal_representative"
                  ? "Ex. Nom du parent / responsable"
                  : "Ex. Nom complet"
              }
              className={fieldClass}
            />
          </div>
        </div>
      </section>

      <section className={card}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <SectionHeader
            icon={
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.85"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M9 11l3 3L22 4" />
                <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
              </svg>
            }
            title="Champs personnalisés"
            description={fieldsDescription}
          />
          <button type="button" onClick={addField} className={ghostAddBtn}>
            <span aria-hidden className="text-[15px] leading-none">
              +
            </span>
            Ajouter un champ
          </button>
        </div>

        {isEdit && initial!.hasSubmissions ? (
          <p
            role="status"
            className="mt-5 rounded-xl border border-[color-mix(in_srgb,#b45309_25%,var(--color-border))] bg-[color-mix(in_srgb,#b45309_8%,var(--color-background))] px-4 py-3.5 text-[13px] leading-relaxed text-[#92400e] dark:text-[#fbbf24]"
          >
            Cette décharge a déjà des signatures. Vous pouvez ajouter de
            nouveaux champs sans risque. En revanche, renommer ou supprimer un
            champ existant peut affecter l&apos;affichage des signatures déjà
            collectées.
          </p>
        ) : null}

        <div className="mt-5 flex flex-col gap-3">
          {fields.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[color-mix(in_srgb,var(--color-border)_80%,var(--color-foreground))] bg-[color-mix(in_srgb,var(--color-surface-2)_40%,transparent)] px-5 py-8 text-center">
              <p className="text-[14px] font-medium tracking-tight text-[var(--color-foreground)]">
                Aucun champ supplémentaire
              </p>
              <p className="mx-auto mt-1.5 max-w-sm text-[13px] leading-relaxed text-[var(--color-muted)]">
                Nom et email sont déjà collectés. Ajoutez un champ ou choisissez
                un contexte pour démarrer.
              </p>
            </div>
          ) : null}

          {fields.map((field, index) => (
            <div
              key={index}
              className="rounded-xl border border-[color-mix(in_srgb,var(--color-border)_72%,var(--color-foreground))] bg-[color-mix(in_srgb,var(--color-background)_55%,var(--color-surface))] p-4 shadow-[var(--elev-1)]"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                <div className="min-w-0 flex-1">
                  <label className="text-[12px] font-medium text-[var(--color-muted)]">
                    Libellé
                  </label>
                  <input
                    value={field.label}
                    onChange={(e) =>
                      updateField(index, { label: e.target.value })
                    }
                    placeholder="Nom du champ"
                    className={`mt-1.5 ${fieldCompact}`}
                  />
                </div>
                <div className="w-full sm:w-44">
                  <label className="text-[12px] font-medium text-[var(--color-muted)]">
                    Type
                  </label>
                  <select
                    value={field.type}
                    onChange={(e) =>
                      updateField(index, {
                        type: e.target.value as FieldType,
                      })
                    }
                    className={`mt-1.5 ${fieldCompact}`}
                  >
                    {typeLabels.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center justify-between gap-3 sm:pb-1">
                  <label className="flex items-center gap-2 text-sm text-[var(--color-muted)]">
                    <input
                      type="checkbox"
                      checked={field.required}
                      onChange={(e) =>
                        updateField(index, { required: e.target.checked })
                      }
                      className="h-4 w-4 rounded border-[var(--color-border)] accent-[var(--color-brand)]"
                    />
                    Obligatoire
                  </label>
                  <button
                    type="button"
                    onClick={() => removeField(index)}
                    className="rounded-lg px-2.5 py-1.5 text-sm font-medium text-[color-mix(in_srgb,#dc2626_88%,var(--color-foreground))] transition-colors hover:bg-[color-mix(in_srgb,#dc2626_8%,transparent)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brand)]"
                  >
                    Supprimer
                  </button>
                </div>
              </div>

              {field.type === "select" ? (
                <div className="mt-3">
                  <label className="text-[12px] font-medium text-[var(--color-muted)]">
                    Options
                  </label>
                  <input
                    value={(field.options ?? []).join(",")}
                    onChange={(e) =>
                      updateField(index, {
                        options: e.target.value.split(","),
                      })
                    }
                    placeholder="Choix séparés par des virgules (ex. Homme, Femme, Autre)"
                    className={`mt-1.5 ${fieldCompact}`}
                  />
                </div>
              ) : null}

              {field.type === "participants" ? (
                <p className="mt-3 text-[13px] leading-relaxed text-[var(--color-muted)]">
                  {intent.subjects === "minors"
                    ? "Sur la page publique, le parent pourra ajouter un ou plusieurs enfants (nom, date de naissance, allergie / particularité)."
                    : "Sur la page publique, le signataire pourra ajouter plusieurs personnes (nom, date de naissance, note)."}
                </p>
              ) : null}
            </div>
          ))}
        </div>
      </section>

      <div className="flex flex-col gap-3.5 border-t border-[color-mix(in_srgb,var(--color-border)_55%,transparent)] pt-6 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:pt-7">
        <p className="text-[13px] leading-relaxed text-[var(--color-muted)]">
          {isEdit
            ? "Les changements s’appliquent aux prochaines signatures."
            : "Vous pourrez partager le lien et le QR après création."}
        </p>
        <div className="flex items-center justify-end gap-2.5 sm:shrink-0">
          <Link href={cancelHref} className={secondaryBtn}>
            Annuler
          </Link>
          <PendingSubmitButton
            className={primaryBtn}
            idle={
              isEdit ? "Enregistrer les modifications" : "Créer la décharge"
            }
            pendingLabel={isEdit ? "Enregistrement…" : "Création…"}
          />
        </div>
      </div>
    </form>
  );
}
