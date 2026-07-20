import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";
import { CopyLinkButton } from "../../copy-link-button";

type WaiverField = {
  key: string;
  label: string;
  type: string;
  required: boolean;
};

export default async function WaiverDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const { data: template } = await supabase
    .from("waiver_template")
    .select("id, title, legal_text, fields, public_slug, is_active, created_at")
    .eq("id", id)
    .maybeSingle();

  if (!template) {
    notFound();
  }

  const fields = (Array.isArray(template.fields)
    ? template.fields
    : []) as unknown as WaiverField[];

  const { data: submissions } = await supabase
    .from("submission")
    .select("id, signer_name, signer_email, signed_at")
    .eq("template_id", template.id)
    .order("signed_at", { ascending: false });

  const publicUrl = `${env.appUrl}/w/${template.public_slug}`;

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-8 px-6 py-12">
      <div className="flex flex-col gap-1">
        <Link
          href="/dashboard"
          className="text-sm text-[var(--color-muted)] transition-colors hover:text-[var(--color-foreground)]"
        >
          ← Retour au tableau de bord
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">
          {template.title}
        </h1>
      </div>

      <section className="flex flex-col gap-3 rounded-xl border border-[var(--color-border)] p-4">
        <span className="text-sm font-medium">Lien public à partager</span>
        <div className="flex flex-wrap items-center gap-3">
          <a
            href={publicUrl}
            target="_blank"
            rel="noreferrer"
            className="text-sm text-[var(--color-brand)] hover:underline"
          >
            {publicUrl}
          </a>
          <CopyLinkButton url={publicUrl} />
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <span className="text-sm font-medium">Texte juridique</span>
        <p className="whitespace-pre-wrap rounded-xl border border-[var(--color-border)] p-4 text-sm text-[var(--color-muted)]">
          {template.legal_text}
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <span className="text-sm font-medium">Champs demandés</span>
        <ul className="flex flex-col gap-2 text-sm">
          <li className="rounded-lg border border-[var(--color-border)] px-3 py-2">
            Nom du signataire{" "}
            <span className="text-[var(--color-muted)]">(toujours requis)</span>
          </li>
          <li className="rounded-lg border border-[var(--color-border)] px-3 py-2">
            Email <span className="text-[var(--color-muted)]">(optionnel)</span>
          </li>
          {fields.map((f) => (
            <li
              key={f.key}
              className="rounded-lg border border-[var(--color-border)] px-3 py-2"
            >
              {f.label}{" "}
              <span className="text-[var(--color-muted)]">
                ({f.type}
                {f.required ? ", requis" : ""})
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="flex flex-col gap-3">
        <span className="text-sm font-medium">
          Signatures collectées ({submissions?.length ?? 0})
        </span>
        {!submissions || submissions.length === 0 ? (
          <p className="rounded-xl border border-dashed border-[var(--color-border)] p-6 text-center text-sm text-[var(--color-muted)]">
            Aucune signature pour l&apos;instant. Partagez le lien public
            ci-dessus.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {submissions.map((s) => (
              <li
                key={s.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[var(--color-border)] px-4 py-3"
              >
                <div className="flex flex-col">
                  <span className="text-sm font-medium">{s.signer_name}</span>
                  <span className="text-xs text-[var(--color-muted)]">
                    {new Date(s.signed_at).toLocaleString("fr-FR", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                    {s.signer_email ? ` · ${s.signer_email}` : ""}
                  </span>
                </div>
                <a
                  href={`/dashboard/waivers/${template.id}/submissions/${s.id}/pdf`}
                  className="rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-sm font-medium transition-colors hover:bg-gray-50"
                >
                  Télécharger le PDF
                </a>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
