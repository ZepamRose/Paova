import { createServiceRoleClient } from "@/lib/supabase/server";

export default async function ThankYouPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = createServiceRoleClient();

  const { data: template } = await supabase
    .from("waiver_template")
    .select("title, business_id")
    .eq("public_slug", slug)
    .maybeSingle();

  let businessName: string | null = null;
  if (template) {
    const { data: business } = await supabase
      .from("business")
      .select("name")
      .eq("id", template.business_id)
      .maybeSingle();
    businessName = business?.name ?? null;
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-green-100">
        <svg
          width="28"
          height="28"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#16a34a"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M20 6 9 17l-5-5" />
        </svg>
      </div>
      <h1 className="text-2xl font-semibold tracking-tight">
        Décharge signée !
      </h1>
      <p className="text-[var(--color-muted)]">
        Merci. Votre signature a bien été enregistrée
        {businessName ? ` auprès de ${businessName}` : ""}. Vous pouvez fermer
        cette page.
      </p>
    </main>
  );
}
