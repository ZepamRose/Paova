import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { WaiverForm } from "../../waiver-form";

type FieldType = "text" | "date" | "checkbox";

type WaiverField = {
  key?: string;
  label: string;
  type: FieldType;
  required: boolean;
};

export default async function EditWaiverPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const { data: template } = await supabase
    .from("waiver_template")
    .select("id, title, legal_text, fields, signer_name_label, deleted_at")
    .eq("id", id)
    .maybeSingle();

  if (!template) {
    notFound();
  }

  if (template.deleted_at) {
    redirect(`/dashboard/waivers/${template.id}`);
  }

  const fields = (Array.isArray(template.fields)
    ? template.fields
    : []) as unknown as WaiverField[];

  const { count } = await supabase
    .from("submission")
    .select("id", { count: "exact", head: true })
    .eq("template_id", template.id);

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-8 px-5 py-10 sm:gap-9 sm:px-6 sm:py-12">
      <header className="animate-fade-up flex flex-col gap-3.5">
        <Link
          href={`/dashboard/waivers/${template.id}`}
          className="group inline-flex w-fit items-center gap-1.5 text-[13px] font-medium text-[var(--color-muted)] transition-[color,transform] duration-[220ms] ease-[cubic-bezier(0.22,1,0.36,1)] hover:text-[var(--color-foreground)] focus-visible:rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brand)]"
        >
          <span
            aria-hidden
            className="transition-transform duration-[220ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:-translate-x-0.5"
          >
            ←
          </span>
          Retour à la décharge
        </Link>
        <div className="flex flex-col gap-2">
          <h1 className="text-[1.625rem] font-semibold tracking-tight text-[var(--color-foreground)] sm:text-2xl">
            Modifier la décharge
          </h1>
          <p className="max-w-lg text-[14px] leading-relaxed text-[var(--color-muted)] sm:text-[15px]">
            Ajustez le titre, le texte juridique et les champs. Les
            modifications s&apos;appliquent aux prochaines signatures.
          </p>
        </div>
      </header>

      <div className="animate-fade-up-delay">
        <WaiverForm
          hasError={error === "required"}
          initial={{
            id: template.id,
            title: template.title,
            legalText: template.legal_text,
            signerNameLabel: template.signer_name_label ?? "",
            fields,
            hasSubmissions: (count ?? 0) > 0,
          }}
        />
      </div>
    </main>
  );
}
