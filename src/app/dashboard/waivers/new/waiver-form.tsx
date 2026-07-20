"use client";

import { useState } from "react";
import Link from "next/link";
import { createTemplate } from "../actions";

type FieldType = "text" | "date" | "checkbox";

type Field = {
  label: string;
  type: FieldType;
  required: boolean;
};

const DEFAULT_LEGAL_TEXT =
  "Je reconnais avoir été informé(e) des risques liés à l'activité et je décharge l'établissement de toute responsabilité en cas d'accident. Je certifie l'exactitude des informations fournies.";

export function WaiverForm({ hasError }: { hasError?: boolean }) {
  const [fields, setFields] = useState<Field[]>([
    { label: "Date de naissance", type: "date", required: true },
  ]);

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
    <form action={createTemplate} className="flex flex-col gap-6">
      <input type="hidden" name="fields" value={JSON.stringify(fields)} />

      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium" htmlFor="title">
          Titre de la décharge
        </label>
        <input
          id="title"
          name="title"
          required
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
          defaultValue={DEFAULT_LEGAL_TEXT}
          className="rounded-lg border border-[var(--color-border)] px-4 py-2.5 text-sm outline-none focus:border-[var(--color-brand)]"
        />
        <p className="text-xs text-[var(--color-muted)]">
          Le nom et l&apos;email du signataire sont toujours collectés. Ajoutez
          ci-dessous les champs supplémentaires dont vous avez besoin.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Champs personnalisés</span>
          <button
            type="button"
            onClick={addField}
            className="rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-sm font-medium transition-colors hover:bg-gray-50"
          >
            + Ajouter un champ
          </button>
        </div>

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
              <option value="text">Texte</option>
              <option value="date">Date</option>
              <option value="checkbox">Case à cocher</option>
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
          className="rounded-lg bg-[var(--color-brand)] px-5 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
        >
          Créer la décharge
        </button>
        <Link
          href="/dashboard"
          className="rounded-lg border border-[var(--color-border)] px-5 py-2.5 text-sm font-medium transition-colors hover:bg-gray-50"
        >
          Annuler
        </Link>
      </div>
    </form>
  );
}
