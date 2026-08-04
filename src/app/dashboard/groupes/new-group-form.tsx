"use client";

import { useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ExternalLink, Check } from "lucide-react";
import type { RosterMode } from "@/lib/groups";
import type { ClosingMode, OpeningHours } from "@/lib/groups/lifecycle";
import { createSigningGroup } from "./actions";
import { RosterImport } from "./roster-import";
import { SmartWaiverSelector } from "./smart-waiver-selector";
import { ClosingModePicker } from "./closing-mode-picker";
import { CompactDateTimePicker } from "@/components/ui/datetime-picker";

const EASE = [0.22, 1, 0.36, 1] as const;

type TemplateChoice = {
  id: string;
  title: string;
  rosterMode?: RosterMode;
  fieldLabels?: string[];
};

const field =
  "h-11 w-full rounded-xl border border-[color-mix(in_srgb,var(--color-border)_78%,var(--color-foreground))] bg-[var(--color-surface)] px-3.5 text-[14px] outline-none transition-[border-color,box-shadow] focus:border-[var(--color-brand)] focus:shadow-[0_0_0_3px_color-mix(in_srgb,var(--color-brand)_16%,transparent)]";

const card =
  "rounded-2xl border border-[color-mix(in_srgb,var(--color-border)_68%,var(--color-foreground))] bg-[var(--color-surface)] p-5 shadow-[var(--elev-2)] sm:p-6";

function fieldLabelsPreview(labels?: string[]): ReactNode {
  if (!labels || labels.length === 0) return null;
  return (
    <p className="mt-1 truncate text-[12px] text-[var(--color-muted)]">
      {labels.join(" · ")}
    </p>
  );
}

export function NewGroupForm({
  choices,
  preselected,
  fromWaiver,
  initialName = "",
  openingHours = null,
}: {
  choices: TemplateChoice[];
  preselected: TemplateChoice | null;
  fromWaiver: boolean;
  initialName?: string;
  openingHours?: OpeningHours | null;
}) {
  const router = useRouter();
  const locked = Boolean(preselected);

  const [name, setName] = useState(initialName);
  const [templateId, setTemplateId] = useState(
    preselected?.id ?? choices[0]?.id ?? "",
  );
  const [rosterCount, setRosterCount] = useState(0);

  // Workflow state
  const [closingMode, setClosingMode] = useState<ClosingMode>("manual");
  const [durationMinutes, setDurationMinutes] = useState<number | null>(null);
  const [fixedEndTime, setFixedEndTime] = useState("");
  const [requiresSignature, setRequiresSignature] = useState(true);
  const [signatureMode, setSignatureMode] = useState<"individual" | "group_representative">("individual");
  const [closingModeValid, setClosingModeValid] = useState(true);

  // Date / time state
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [startTimePart, setStartTimePart] = useState("");

  // Computed ISO values for hidden inputs
  const startTimeISO = (() => {
    if (!startDate || !startTimePart) return "";
    const [h, m] = startTimePart.split(":").map(Number);
    const d = new Date(startDate);
    d.setHours(h, m, 0, 0);
    return d.toISOString();
  })();

  const selected =
    (locked ? preselected : choices.find((c) => c.id === templateId)) ??
    preselected ??
    null;

  const nameDone = name.trim().length > 0;
  const waiverDone = !requiresSignature || Boolean(selected);
  const canSubmit = nameDone && closingModeValid && waiverDone;

  const summaryParts = [
    nameDone ? name.trim() : null,
    requiresSignature && selected?.title ? selected.title : null,
    rosterCount > 0
      ? `${rosterCount} participant${rosterCount > 1 ? "s" : ""}`
      : null,
    startDate && startTimePart
      ? `début ${new Date(startDate).toLocaleDateString("fr-FR", {
          day: "numeric",
          month: "short",
        })} ${startTimePart}`
      : null,
  ].filter(Boolean);

  function goCreateWaiver() {
    const params = new URLSearchParams();
    params.set("return_to", "/dashboard/groupes/new");
    if (name.trim()) params.set("name", name.trim());
    router.push(`/dashboard/waivers/new?${params.toString()}`);
  }

  const cancelHref =
    fromWaiver && preselected
      ? `/dashboard/waivers/${preselected.id}`
      : "/dashboard";

  const expressHref = selected
    ? `/dashboard/groupes/express?template=${selected.id}`
    : "/dashboard/groupes/express";

  return (
    <form action={createSigningGroup} className="flex flex-col gap-5">
      {/* Step 1: Nom de la session */}
      <section className={`${card} flex flex-col gap-5`}>
        <div>
          <h2 className="text-[15px] font-semibold tracking-tight text-[var(--color-foreground)]">
            Nom de la session
          </h2>
          <p className="mt-0.5 text-[13px] text-[var(--color-muted)]">
            Donnez un nom identifiable à votre session.
          </p>
        </div>

        <label className="flex flex-col gap-1.5">
          <span className="text-[13px] font-medium text-[var(--color-foreground)]">
            Nom interne
          </span>
          <input
            name="name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex. Cours de yoga lundi · Atelier poterie samedi · Stage été 2026"
            className={field}
          />
        </label>
      </section>

      {/* Step 2: Quand? */}
      <section className={`${card} flex flex-col gap-5`}>
        <div>
          <h2 className="text-[15px] font-semibold tracking-tight text-[var(--color-foreground)]">
            Quand ?
          </h2>
          <p className="mt-0.5 text-[13px] text-[var(--color-muted)]">
            Date et heure de début de votre session.
          </p>
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-[13px] font-medium text-[var(--color-foreground)]">
            Date et heure de début{" "}
            <span className="font-normal text-[var(--color-muted)]">(facultatif)</span>
          </span>
          <CompactDateTimePicker
            date={startDate}
            time={startTimePart}
            onDateChange={setStartDate}
            onTimeChange={setStartTimePart}
          />
        </div>
      </section>

      {/* Step 3: Comment la session se termine? */}
      <section className={`${card} flex flex-col gap-5`}>
        <div>
          <h2 className="text-[15px] font-semibold tracking-tight text-[var(--color-foreground)]">
            Comment la session se termine ?
          </h2>
          <p className="mt-0.5 text-[13px] text-[var(--color-muted)]">
            Choisissez comment et quand fermer automatiquement la session.
          </p>
        </div>

        <ClosingModePicker
          mode={closingMode}
          onModeChange={setClosingMode}
          durationMinutes={durationMinutes}
          onDurationChange={setDurationMinutes}
          fixedEndTime={fixedEndTime}
          onFixedEndTimeChange={setFixedEndTime}
          openingHours={openingHours ?? null}
          startDate={startDate}
          onValidationChange={setClosingModeValid}
        />
      </section>

      {/* Step 4: Besoin d'une décharge? */}
      <section className={`${card} flex flex-col gap-5`}>
        <div>
          <h2 className="text-[15px] font-semibold tracking-tight text-[var(--color-foreground)]">
            Besoin d&apos;une décharge ?
          </h2>
          <p className="mt-0.5 text-[13px] text-[var(--color-muted)]">
            Les participants devront-ils signer une décharge de responsabilité ?
          </p>
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setRequiresSignature(true)}
            className={`flex-1 rounded-xl border px-4 py-3 text-left transition-all ${
              requiresSignature
                ? "border-[var(--color-brand)] bg-[color-mix(in_srgb,var(--color-brand)_8%,transparent)]"
                : "border-[color-mix(in_srgb,var(--color-border)_65%,transparent)] bg-[color-mix(in_srgb,var(--color-surface-2)_30%,transparent)] hover:border-[color-mix(in_srgb,var(--color-border)_85%,transparent)]"
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-[14px] font-medium text-[var(--color-foreground)]">
                Oui
              </span>
              {requiresSignature && (
                <Check size={16} strokeWidth={2.5} className="text-[var(--color-brand)]" />
              )}
            </div>
          </button>
          <button
            type="button"
            onClick={() => setRequiresSignature(false)}
            className={`flex-1 rounded-xl border px-4 py-3 text-left transition-all ${
              !requiresSignature
                ? "border-[var(--color-brand)] bg-[color-mix(in_srgb,var(--color-brand)_8%,transparent)]"
                : "border-[color-mix(in_srgb,var(--color-border)_65%,transparent)] bg-[color-mix(in_srgb,var(--color-surface-2)_30%,transparent)] hover:border-[color-mix(in_srgb,var(--color-border)_85%,transparent)]"
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-[14px] font-medium text-[var(--color-foreground)]">
                Non
              </span>
              {!requiresSignature && (
                <Check size={16} strokeWidth={2.5} className="text-[var(--color-brand)]" />
              )}
            </div>
          </button>
        </div>
      </section>

      {/* Steps 5-6: Conditional waiver configuration */}
      <AnimatePresence initial={false}>
        {requiresSignature && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: EASE }}
            className="flex flex-col gap-5"
          >
            {/* Step 5: Signature mode */}
            <section className={`${card} flex flex-col gap-5`}>
              <div>
                <h2 className="text-[15px] font-semibold tracking-tight text-[var(--color-foreground)]">
                  Comment la décharge est signée ?
                </h2>
                <p className="mt-0.5 text-[13px] text-[var(--color-muted)]">
                  Chaque personne signe individuellement, ou un représentant pour tous ?
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setSignatureMode("individual")}
                  className={`flex-1 rounded-xl border px-4 py-3.5 text-left transition-all ${
                    signatureMode === "individual"
                      ? "border-[var(--color-brand)] bg-[color-mix(in_srgb,var(--color-brand)_8%,transparent)]"
                      : "border-[color-mix(in_srgb,var(--color-border)_65%,transparent)] bg-[color-mix(in_srgb,var(--color-surface-2)_30%,transparent)] hover:border-[color-mix(in_srgb,var(--color-border)_85%,transparent)]"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-[14px] font-medium text-[var(--color-foreground)]">
                        Individuel
                      </p>
                      <p className="mt-0.5 text-[12.5px] text-[var(--color-muted)]">
                        Chaque participant signe sa propre décharge
                      </p>
                    </div>
                    {signatureMode === "individual" && (
                      <Check size={16} strokeWidth={2.5} className="mt-0.5 shrink-0 text-[var(--color-brand)]" />
                    )}
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setSignatureMode("group_representative")}
                  className={`flex-1 rounded-xl border px-4 py-3.5 text-left transition-all ${
                    signatureMode === "group_representative"
                      ? "border-[var(--color-brand)] bg-[color-mix(in_srgb,var(--color-brand)_8%,transparent)]"
                      : "border-[color-mix(in_srgb,var(--color-border)_65%,transparent)] bg-[color-mix(in_srgb,var(--color-surface-2)_30%,transparent)] hover:border-[color-mix(in_srgb,var(--color-border)_85%,transparent)]"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-[14px] font-medium text-[var(--color-foreground)]">
                        Représentant
                      </p>
                      <p className="mt-0.5 text-[12.5px] text-[var(--color-muted)]">
                        Un responsable signe pour tout le groupe
                      </p>
                    </div>
                    {signatureMode === "group_representative" && (
                      <Check size={16} strokeWidth={2.5} className="mt-0.5 shrink-0 text-[var(--color-brand)]" />
                    )}
                  </div>
                </button>
              </div>
            </section>

            {/* Step 6: Choose waiver */}
            <section className={`${card} flex flex-col gap-5`}>
              <div>
                <h2 className="text-[15px] font-semibold tracking-tight text-[var(--color-foreground)]">
                  Quelle décharge ?
                </h2>
                <p className="mt-0.5 text-[13px] text-[var(--color-muted)]">
                  Sélectionnez le formulaire que les participants signeront.
                </p>
              </div>

              {locked && preselected ? (
                <div className="flex flex-col gap-1.5">
                  <div className="rounded-xl border border-[color-mix(in_srgb,var(--color-border)_65%,transparent)] bg-[color-mix(in_srgb,var(--color-surface-2)_50%,var(--color-surface))] px-3.5 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-[14px] font-medium text-[var(--color-foreground)]">
                        {preselected.title}
                      </p>
                      <Link
                        href={`/dashboard/waivers/${preselected.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex shrink-0 items-center gap-1 text-[12.5px] font-medium text-[var(--color-brand)]"
                      >
                        Voir
                        <ExternalLink size={12} strokeWidth={2} aria-hidden />
                      </Link>
                    </div>
                    {fieldLabelsPreview(preselected.fieldLabels)}
                  </div>
                  <input type="hidden" name="template_id" value={preselected.id} />
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  <SmartWaiverSelector
                    choices={choices}
                    value={templateId}
                    onChange={setTemplateId}
                  />
                  <button
                    type="button"
                    onClick={goCreateWaiver}
                    className="self-start text-[12.5px] font-medium text-[var(--color-muted)] underline-offset-2 hover:text-[var(--color-foreground)] hover:underline"
                  >
                    + Nouvelle décharge
                  </button>
                </div>
              )}
            </section>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Optional: Participants import */}
      <section className={`${card} flex flex-col gap-4`}>
        <div>
          <h2 className="text-[15px] font-semibold tracking-tight text-[var(--color-foreground)]">
            Participants{" "}
            <span className="font-normal text-[var(--color-muted)]">(facultatif)</span>
          </h2>
          <p className="mt-0.5 text-[13px] text-[var(--color-muted)]">
            Vous pouvez importer une liste CSV ou ajouter les participants après création.
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-baseline justify-between gap-3">
            <p className="text-[13px] font-medium text-[var(--color-foreground)]">
              Importer un fichier CSV
            </p>
            {rosterCount > 0 ? (
              <p className="text-[12.5px] font-medium text-[var(--color-brand)]">
                {rosterCount} importé{rosterCount > 1 ? "s" : ""}
              </p>
            ) : (
              <p className="text-[12px] text-[var(--color-muted)]">Aucun fichier</p>
            )}
          </div>
          <RosterImport
            mode={selected?.rosterMode ?? "participants"}
            onCountChange={setRosterCount}
          />
        </div>
      </section>

      {/* Hidden fields for server action */}
      <input type="hidden" name="start_time" value={startTimeISO} />
      <input type="hidden" name="closing_mode" value={closingMode} />
      {closingMode === "duration" && durationMinutes && (
        <input type="hidden" name="duration_minutes" value={durationMinutes.toString()} />
      )}
      {closingMode === "fixed_time" && fixedEndTime && (
        <input type="hidden" name="end_time" value={fixedEndTime} />
      )}
      <input type="hidden" name="requires_signature" value={requiresSignature ? "true" : "false"} />
      {requiresSignature && (
        <>
          <input type="hidden" name="signature_mode" value={signatureMode} />
          <input type="hidden" name="template_id" value={templateId} />
        </>
      )}

      {/* Action */}
      <div className="flex flex-col gap-3 rounded-2xl border border-[color-mix(in_srgb,var(--color-border)_60%,transparent)] bg-[color-mix(in_srgb,var(--color-surface-2)_35%,var(--color-surface))] px-4 py-4 sm:px-5">
        {summaryParts.length > 0 ? (
          <p className="truncate text-[13px] text-[var(--color-muted)]">
            {summaryParts.join(" · ")}
          </p>
        ) : (
          <p className="text-[13px] text-[var(--color-muted)]">
            Indiquez un nom et une décharge pour continuer.
          </p>
        )}
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={!canSubmit}
            className="inline-flex h-11 items-center justify-center rounded-xl bg-[var(--color-brand)] px-5 text-[14px] font-medium text-[var(--color-on-brand)] shadow-[0_1px_0_rgba(255,255,255,0.12)_inset,var(--elev-1)] transition-[transform,filter,opacity] duration-200 hover:-translate-y-px hover:brightness-[1.03] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brand)] active:translate-y-0 active:scale-[0.99] disabled:pointer-events-none disabled:opacity-45"
          >
            Créer la session
          </button>
          <Link
            href={cancelHref}
            className="text-[13px] font-medium text-[var(--color-muted)] transition-colors hover:text-[var(--color-foreground)]"
          >
            Annuler
          </Link>
        </div>
      </div>

      {/* Secondary path */}
      <Link
        href={expressHref}
        className="flex items-center justify-between gap-3 rounded-xl border border-dashed border-[color-mix(in_srgb,var(--color-border)_70%,transparent)] px-3.5 py-3 transition-[border-color,background-color] hover:border-[color-mix(in_srgb,var(--color-border)_90%,var(--color-foreground))] hover:bg-[color-mix(in_srgb,var(--color-surface-2)_45%,transparent)]"
      >
        <span className="min-w-0">
          <span className="block text-[13px] font-medium text-[var(--color-foreground)]">
            Préférez un QR sans liste ?
          </span>
          <span className="mt-0.5 block text-[12.5px] text-[var(--color-muted)]">
            Groupe express — session immédiate, sans import.
          </span>
        </span>
        <span className="shrink-0 text-[12.5px] font-medium text-[var(--color-brand)]">
          Express →
        </span>
      </Link>
    </form>
  );
}
