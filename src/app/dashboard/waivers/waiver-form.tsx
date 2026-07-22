"use client";

import { useState } from "react";
import Link from "next/link";
import {
  DEFAULT_LEGAL_TEXT,
  WAIVER_PRESETS,
  type WaiverPreset,
} from "@/lib/waiver-presets";
import { createTemplate, updateTemplate } from "./actions";

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

type Initial = {
  id: string;
  title: string;
  legalText: string;
  signerNameLabel: string;
  fields: Field[];
  hasSubmissions: boolean;
};

export function WaiverForm({
  hasError,
  initial,
}: {
  hasError?: boolean;
  initial?: Initial;
}) {
  const isEdit = Boolean(initial);

  const [title, setTitle] = useState(initial?.title ?? "");
  const [legalText, setLegalText] = useState(
    initial?.legalText ?? DEFAULT_LEGAL_TEXT,
  );
  const [signerNameLabel, setSignerNameLabel] = useState(
    initial?.signerNameLabel ?? "",
  );
  const [fields, setFields] = useState<Field[]>(
    initial?.fields ?? [
      { label: "Date de naissance", type: "date", required: true },
    ],
  );

  function applyPreset(preset: WaiverPreset) {
    setTitle(preset.title);
    setLegalText(preset.legalText);
    setSignerNameLabel(preset.signerNameLabel ?? "");
    // Clone so the preset arrays are never mutated by field edits.
    setFields(preset.fields.map((f) => ({ ...f })));
  }

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

  return (
    <form
      action={isEdit ? updateTemplate : createTemplate}
      className="flex flex-col gap-6"
    >
      {isEdit && <input type="hidden" name="id" value={initial!.id} />}
      <input type="hidden" name="fields" value={JSON.stringify(fields)} />

      {!isEdit && (
        <div className="flex flex-col gap-3 rounded-xl border border-[var(--color-border)] p-4">
          <span className="text-sm font-medium">
            Partir d&apos;un modèle{" "}
            <span className="font-normal text-[var(--color-muted)]">
              (optionnel)
            </span>
          </span>
          <div className="flex flex-wrap gap-2">
            {WAIVER_PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => applyPreset(preset)}
                className="rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-sm font-medium transition-colors hover:bg-[var(--color-surface-2)]"
              >
                {preset.label}
              </button>
            ))}
          </div>
          <p className="text-xs text-[var(--color-muted)]">
            Un modèle pré-remplit le titre, le texte et les champs. Vous pouvez
            tout modifier ensuite. Ne collectez que les données nécessaires
            (RGPD).
          </p>
        </div>
      )}

      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium" htmlFor="title">
          Titre de la décharge
        </label>
        <input
          id="title"
          name="title"
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Ex. Décharge — Session escape game"
          className="rounded-lg border border-[var(--color-border)] px-4 py-2.5 text-sm outline-none focus:border-[var(--color-brand)]"
        />
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium" htmlFor="legal_text">
          Texte juridique
        </label>
        <textarea
          id="legal_text"
          name="legal_text"
          required
          rows={6}
          value={legalText}
          onChange={(e) => setLegalText(e.target.value)}
          className="rounded-lg border border-[var(--color-border)] px-4 py-2.5 text-sm outline-none focus:border-[var(--color-brand)]"
        />
        <p className="text-xs text-[var(--color-muted)]">
          Le nom et l&apos;email du signataire sont toujours collectés. Ajoutez
          ci-dessous les champs supplémentaires dont vous avez besoin.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium" htmlFor="signer_name_label">
          Libellé du nom du signataire{" "}
          <span className="font-normal text-[var(--color-muted)]">
            (optionnel)
          </span>
        </label>
        <input
          id="signer_name_label"
          name="signer_name_label"
          value={signerNameLabel}
          onChange={(e) => setSignerNameLabel(e.target.value)}
          placeholder="Par défaut : « Nom complet ». Ex. « Nom du parent / responsable »"
          className="rounded-lg border border-[var(--color-border)] px-4 py-2.5 text-sm outline-none focus:border-[var(--color-brand)]"
        />
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Champs personnalisés</span>
          <button
            type="button"
            onClick={addField}
            className="rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-sm font-medium transition-colors hover:bg-[var(--color-surface-2)]"
          >
            + Ajouter un champ
          </button>
        </div>

        {isEdit && initial!.hasSubmissions && (
          <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
            Cette décharge a déjà des signatures. Vous pouvez ajouter de
            nouveaux champs sans risque. En revanche, renommer ou supprimer un
            champ existant peut affecter l&apos;affichage des signatures déjà
            collectées.
          </p>
        )}

        {fields.length === 0 && (
          <p className="text-sm text-[var(--color-muted)]">
            Aucun champ supplémentaire.
          </p>
        )}

        {fields.map((field, index) => (
          <div
            key={index}
            className="flex flex-wrap items-center gap-3 rounded-lg border border-[var(--color-border)] p-3"
          >
            <input
              value={field.label}
              onChange={(e) => updateField(index, { label: e.target.value })}
              placeholder="Nom du champ"
              className="flex-1 rounded-md border border-[var(--color-border)] px-3 py-1.5 text-sm outline-none focus:border-[var(--color-brand)]"
            />
            <select
              value={field.type}
              onChange={(e) =>
                updateField(index, { type: e.target.value as FieldType })
              }
              className="rounded-md border border-[var(--color-border)] px-3 py-1.5 text-sm outline-none focus:border-[var(--color-brand)]"
            >
              {TYPE_LABELS.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
            <label className="flex items-center gap-1.5 text-sm text-[var(--color-muted)]">
              <input
                type="checkbox"
                checked={field.required}
                onChange={(e) =>
                  updateField(index, { required: e.target.checked })
                }
              />
              Obligatoire
            </label>
            <button
              type="button"
              onClick={() => removeField(index)}
              className="rounded-md px-2 py-1 text-sm text-red-600 transition-colors hover:bg-red-50"
            >
              Supprimer
            </button>

            {field.type === "select" && (
              <input
                value={(field.options ?? []).join(",")}
                onChange={(e) =>
                  updateField(index, { options: e.target.value.split(",") })
                }
                placeholder="Choix séparés par des virgules (ex. Homme, Femme, Autre)"
                className="w-full rounded-md border border-[var(--color-border)] px-3 py-1.5 text-sm outline-none focus:border-[var(--color-brand)]"
              />
            )}

            {field.type === "participants" && (
              <p className="w-full text-xs text-[var(--color-muted)]">
                Le signataire pourra ajouter plusieurs participants (nom, date
                de naissance, note). Idéal pour inscrire plusieurs enfants sur
                une même décharge.
              </p>
            )}
          </div>
        ))}
      </div>

      {hasError && (
        <p className="text-sm text-red-600">
          Le titre et le texte juridique sont obligatoires.
        </p>
      )}

      <div className="flex gap-3">
        <button
          type="submit"
          className="rounded-lg bg-[var(--color-brand)] px-5 py-2.5 text-sm font-medium text-[var(--color-on-brand)] transition-opacity hover:opacity-90"
        >
          {isEdit ? "Enregistrer les modifications" : "Créer la décharge"}
        </button>
        <Link
          href={isEdit ? `/dashboard/waivers/${initial!.id}` : "/dashboard"}
          className="rounded-lg border border-[var(--color-border)] px-5 py-2.5 text-sm font-medium transition-colors hover:bg-[var(--color-surface-2)]"
        >
          Annuler
        </Link>
      </div>
    </form>
  );
}
