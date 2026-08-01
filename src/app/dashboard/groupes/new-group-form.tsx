"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ExternalLink } from "lucide-react";
import type { RosterMode } from "@/lib/groups";
import { createSigningGroup } from "./actions";
import { RosterImport } from "./roster-import";
import { TemplateCombobox } from "./template-combobox";

type TemplateChoice = {
  id: string;
  title: string;
  rosterMode: RosterMode;
  fieldLabels: string[];
};

const field =
  "h-11 w-full rounded-xl border border-[color-mix(in_srgb,var(--color-border)_78%,var(--color-foreground))] bg-[var(--color-surface)] px-3.5 text-[14px] outline-none transition-[border-color,box-shadow] focus:border-[var(--color-brand)] focus:shadow-[0_0_0_3px_color-mix(in_srgb,var(--color-brand)_16%,transparent)]";

const card =
  "rounded-2xl border border-[color-mix(in_srgb,var(--color-border)_68%,var(--color-foreground))] bg-[var(--color-surface)] p-5 shadow-[var(--elev-2)] sm:p-6";

function fieldLabelsPreview(labels: string[]): ReactNode {
  if (labels.length === 0) return null;
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
}: {
  choices: TemplateChoice[];
  preselected: TemplateChoice | null;
  fromWaiver: boolean;
  initialName?: string;
}) {
  const router = useRouter();
  const locked = Boolean(preselected);

  const [name, setName] = useState(initialName);
  const [templateId, setTemplateId] = useState(
    preselected?.id ?? choices[0]?.id ?? "",
  );
  const [rosterCount, setRosterCount] = useState(0);
  const [closesOn, setClosesOn] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [durationMinutes, setDurationMinutes] = useState("");

  const selected =
    (locked ? preselected : choices.find((c) => c.id === templateId)) ??
    preselected ??
    null;

  const nameDone = name.trim().length > 0;
  const canSubmit = nameDone && Boolean(selected);

  const summaryParts = [
    nameDone ? name.trim() : null,
    selected?.title ?? null,
    rosterCount > 0
      ? `${rosterCount} participant${rosterCount > 1 ? "s" : ""}`
      : null,
    closesOn
      ? `clôture ${new Date(`${closesOn}T12:00:00`).toLocaleDateString("fr-FR", {
          day: "numeric",
          month: "short",
        })}`
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
      {/* Essentials */}
      <section className={`${card} flex flex-col gap-5`}>
        <div>
          <h2 className="text-[15px] font-semibold tracking-tight text-[var(--color-foreground)]">
            La session
          </h2>
          <p className="mt-0.5 text-[13px] text-[var(--color-muted)]">
            Nom interne et formulaire que chacun signera.
          </p>
        </div>

        <label className="flex flex-col gap-1.5">
          <span className="text-[13px] font-medium text-[var(--color-foreground)]">
            Nom de la session
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

        {locked && preselected ? (
          <div className="flex flex-col gap-1.5">
            <span className="text-[13px] font-medium text-[var(--color-foreground)]">
              Décharge
            </span>
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
          <div className="flex flex-col gap-1.5">
            <span className="text-[13px] font-medium text-[var(--color-foreground)]">
              Décharge
            </span>
            <TemplateCombobox
              id="template_id"
              options={choices}
              value={templateId}
              onChange={setTemplateId}
            />
            <input type="hidden" name="template_id" value={templateId} />
            <div className="flex flex-wrap items-center justify-between gap-2">
              {selected ? fieldLabelsPreview(selected.fieldLabels) : <span />}
              <div className="flex flex-wrap items-center gap-3">
                {selected ? (
                  <Link
                    href={`/dashboard/waivers/${selected.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[12px] font-medium text-[var(--color-muted)] hover:text-[var(--color-foreground)]"
                  >
                    Voir
                    <ExternalLink size={11} strokeWidth={2} aria-hidden />
                  </Link>
                ) : null}
                <button
                  type="button"
                  onClick={goCreateWaiver}
                  className="text-[12.5px] font-medium text-[var(--color-muted)] underline-offset-2 hover:text-[var(--color-foreground)] hover:underline"
                >
                  + Nouvelle décharge
                </button>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Optional prep */}
      <section className={`${card} flex flex-col gap-4`}>
        <div>
          <h2 className="text-[15px] font-semibold tracking-tight text-[var(--color-foreground)]">
            Liste & clôture
          </h2>
          <p className="mt-0.5 text-[13px] text-[var(--color-muted)]">
            Facultatif — vous pourrez ajouter les participants après création.
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-baseline justify-between gap-3">
            <p className="text-[13px] font-medium text-[var(--color-foreground)]">
              Participants
            </p>
            {rosterCount > 0 ? (
              <p className="text-[12.5px] font-medium text-[var(--color-brand)]">
                {rosterCount} importé{rosterCount > 1 ? "s" : ""}
              </p>
            ) : (
              <p className="text-[12px] text-[var(--color-muted)]">CSV</p>
            )}
          </div>
          <RosterImport
            mode={selected?.rosterMode ?? "participants"}
            onCountChange={setRosterCount}
          />
        </div>

        <div className="flex flex-col gap-4 border-t border-[color-mix(in_srgb,var(--color-border)_50%,transparent)] pt-4 sm:flex-row sm:gap-5">
          <label className="flex flex-col gap-1.5">
            <span className="text-[13px] font-medium text-[var(--color-foreground)]">
              Date et heure de la session{" "}
              <span className="font-normal text-[var(--color-muted)]">
                (facultatif)
              </span>
            </span>
            <input
              name="scheduled_at"
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              className={`${field} max-w-xs`}
            />
            <span className="text-[12px] text-[var(--color-muted)]">
              Quand a lieu votre activité. Affiché sur la carte.
            </span>
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-[13px] font-medium text-[var(--color-foreground)]">
              Date de clôture{" "}
              <span className="font-normal text-[var(--color-muted)]">
                (facultatif)
              </span>
            </span>
            <input
              name="closes_on"
              type="date"
              value={closesOn}
              onChange={(e) => setClosesOn(e.target.value)}
              className={`${field} max-w-xs`}
            />
            <span className="text-[12px] text-[var(--color-muted)]">
              Après cette date, le lien refuse les nouvelles signatures.
            </span>
          </label>
        </div>

        {/* V2: Session Time Fields */}
        <div className="flex flex-col gap-4 border-t border-[color-mix(in_srgb,var(--color-border)_50%,transparent)] pt-4">
          <div>
            <h3 className="text-[13px] font-medium text-[var(--color-foreground)]">
              Horaires de session{" "}
              <span className="font-normal text-[var(--color-muted)]">
                (facultatif)
              </span>
            </h3>
            <p className="mt-0.5 text-[12px] text-[var(--color-muted)]">
              Précisez les heures de début et fin pour un meilleur suivi
            </p>
          </div>

          <div className="flex flex-col gap-4 sm:flex-row sm:gap-5">
            <label className="flex flex-1 flex-col gap-1.5">
              <span className="text-[13px] font-medium text-[var(--color-foreground)]">
                Heure de début
              </span>
              <input
                name="start_time"
                type="datetime-local"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className={field}
              />
            </label>

            <label className="flex flex-1 flex-col gap-1.5">
              <span className="text-[13px] font-medium text-[var(--color-foreground)]">
                Heure de fin
              </span>
              <input
                name="end_time"
                type="datetime-local"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className={field}
              />
            </label>

            <label className="flex flex-1 flex-col gap-1.5">
              <span className="text-[13px] font-medium text-[var(--color-foreground)]">
                Durée (minutes)
              </span>
              <input
                name="duration_minutes"
                type="number"
                min="1"
                step="1"
                placeholder="Ex. 90"
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(e.target.value)}
                className={field}
              />
            </label>
          </div>
        </div>
      </section>

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
