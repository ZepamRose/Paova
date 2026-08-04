"use client";

import { useActionState, useState, useCallback } from "react";
import { PendingSubmitButton } from "../pending-submit-button";
import { addGroupMembers, type AddMembersState } from "./actions";

const initialState: AddMembersState = { error: null };

export function AddParticipantForm({ groupId }: { groupId: string }) {
  const [state, formAction] = useActionState(addGroupMembers, initialState);
  const [rows, setRows] = useState<string[]>([""]);

  const addRow = useCallback(() => setRows((r) => [...r, ""]), []);
  const updateRow = useCallback((i: number, value: string) => {
    setRows((r) => r.map((v, idx) => (idx === i ? value : v)));
  }, []);
  const removeRow = useCallback(
    (i: number) => setRows((r) => (r.length > 1 ? r.filter((_, idx) => idx !== i) : r)),
    [],
  );

  // Serialize all non-empty rows as newline-separated names into the `roster` field.
  const rosterValue = rows.filter((n) => n.trim()).join("\n");
  const count = rows.filter((n) => n.trim()).length;

  return (
    <div className="flex flex-col gap-2.5">
      <form
        action={formAction}
        onSubmit={() => {
          // Reset rows to a single empty row after submit
          setTimeout(() => setRows([""]), 100);
        }}
        className="flex flex-col gap-2"
      >
        <input type="hidden" name="group_id" value={groupId} />
        {/* Hidden field consumed by addGroupMembers via parseRosterCsv */}
        <input type="hidden" name="roster" value={rosterValue} />

        {/* One visible row per participant */}
        <div className="flex flex-col gap-1.5">
          {rows.map((name, i) => (
            <div key={i} className="flex items-center gap-1.5">
              <input
                value={name}
                onChange={(e) => updateRow(i, e.target.value)}
                placeholder={i === 0 ? "Nom complet" : `Participant ${i + 1}`}
                className="h-9 flex-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-[13.5px] outline-none focus:border-[var(--color-brand)]"
                aria-label={`Nom du participant ${i + 1}`}
              />
              {rows.length > 1 ? (
                <button
                  type="button"
                  onClick={() => removeRow(i)}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[var(--color-muted)]/50 transition-colors hover:bg-[var(--color-surface-2)] hover:text-[color-mix(in_srgb,#ef4444_65%,var(--color-foreground))]"
                  aria-label={`Supprimer le participant ${i + 1}`}
                >
                  ×
                </button>
              ) : null}
            </div>
          ))}
        </div>

        {/* Controls row */}
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={addRow}
            className="text-[12.5px] font-medium text-[var(--color-brand)] transition-opacity hover:opacity-70"
          >
            + Ajouter une ligne
          </button>
          <PendingSubmitButton
            className="inline-flex h-9 min-w-[7rem] items-center justify-center rounded-xl bg-[var(--color-brand)] px-4 text-[13px] font-medium text-[var(--color-on-brand)] transition-[transform,filter] duration-150 hover:-translate-y-px hover:brightness-[1.03] disabled:pointer-events-none disabled:opacity-80"
            idle={count > 1 ? `Ajouter (${count})` : "Ajouter"}
            pendingLabel="Ajout…"
          />
        </div>
      </form>

      {state.error === "roster" ? (
        <p
          role="alert"
          className="rounded-xl border border-[color-mix(in_srgb,#b45309_25%,var(--color-border))] bg-[color-mix(in_srgb,#b45309_8%,var(--color-background))] px-3.5 py-2.5 text-[13px] text-[color-mix(in_srgb,#92400e_90%,var(--color-muted))]"
        >
          Indiquez au moins un nom complet.
        </p>
      ) : state.error === "add" ? (
        <p
          role="alert"
          className="rounded-xl border border-[color-mix(in_srgb,#b45309_25%,var(--color-border))] bg-[color-mix(in_srgb,#b45309_8%,var(--color-background))] px-3.5 py-2.5 text-[13px] text-[color-mix(in_srgb,#92400e_90%,var(--color-muted))]"
        >
          Impossible d&apos;ajouter les participants. Réessayez.
        </p>
      ) : state.count ? (
        <p role="status" className="text-[12.5px] text-[var(--color-brand)]">
          {state.count === 1
            ? "Participant ajouté."
            : `${state.count} participants ajoutés.`}
        </p>
      ) : null}
    </div>
  );
}
