import { notFound } from "next/navigation";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { SignForm } from "./sign-form";

type WaiverField = {
  key: string;
  label: string;
  type: "text" | "date" | "checkbox";
  required: boolean;
};

export default async function PublicWaiverPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { slug } = await params;
  const { error } = await searchParams;
  const supabase = createServiceRoleClient();

  const { data: template } = await supabase
    .from("waiver_template")
    .select("id, business_id, title, legal_text, fields, is_active")
    .eq("public_slug", slug)
    .maybeSingle();

  if (!template || !template.is_active) {
    notFound();
  }

  const { data: business } = await supabase
    .from("business")
    .select("name, brand_color")
    .eq("id", template.business_id)
    .maybeSingle();

  const fields = (Array.isArray(template.fields)
    ? template.fields
    : []) as unknown as WaiverField[];

  const brandColor = business?.brand_color ?? "#111827";

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col gap-6 px-6 py-10">
      <header className="flex flex-col gap-1">
        {business?.name && (
          <span
            className="text-sm font-medium"
            style={{ color: brandColor }}
          >
            {business.name}
          </span>
        )}
        <h1 className="text-2xl font-semibold tracking-tight">
          {template.title}
        </h1>
      </header>

      <section className="rounded-xl border border-[var(--color-border)] bg-gray-50 p-4">
        <p className="whitespace-pre-wrap text-sm text-[var(--color-muted)]">
          {template.legal_text}
        </p>
      </section>

      <SignForm
        slug={slug}
        fields={fields}
        brandColor={brandColor}
        hasError={error}
      />
    </main>
  );
}
