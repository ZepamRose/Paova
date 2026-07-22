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
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-8 px-6 py-12">
      <div className="flex flex-col gap-1">
        <Link
          href={`/dashboard/waivers/${template.id}`}
          className="text-sm text-[var(--color-muted)] transition-colors hover:text-[var(--color-foreground)]"
        >
          ← Retour à la décharge
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">
          Modifier la décharge
        </h1>
      </div>

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
    </main>
  );
}
