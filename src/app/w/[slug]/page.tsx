import { notFound } from "next/navigation";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { FREE_MONTHLY_LIMIT, isPro, currentMonthStartISO } from "@/lib/plan";
import { resolveBrandFont } from "@/lib/brand-fonts";
import {
  ensureTemplateNotStale,
  isExpirationMode,
  isTemplateStatus,
  type ExpirationMode,
} from "@/lib/templates";
import { BrandFontLink } from "@/components/brand-font-link";
import { SignForm } from "./sign-form";
import { TrackPublicEvents } from "./track-public-events";

type WaiverField = {
  key: string;
  label: string;
  type:
    | "text"
    | "textarea"
    | "number"
    | "tel"
    | "date"
    | "checkbox"
    | "select"
    | "participants";
  required: boolean;
  options?: string[];
};

export default async function PublicWaiverPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ error?: string; borne?: string }>;
}) {
  const { slug } = await params;
  const { error, borne } = await searchParams;
  const supabase = createServiceRoleClient();

  const { data: template } = await supabase
    .from("waiver_template")
    .select(
      "id, business_id, title, legal_text, fields, signer_name_label, status, expiration_mode, expiration_days, expires_at",
    )
    .eq("public_slug", slug)
    .maybeSingle();

  if (!template || !isTemplateStatus(template.status)) {
    notFound();
  }

  const expirationMode: ExpirationMode = isExpirationMode(
    template.expiration_mode,
  )
    ? template.expiration_mode
    : "none";

  const lifecycle = await ensureTemplateNotStale(supabase, {
    id: template.id,
    business_id: template.business_id,
    title: template.title,
    status: template.status,
    expiration_mode: expirationMode,
    expiration_days: template.expiration_days,
    expires_at: template.expires_at,
  });

  // Inactive / archived: hide as not found. Expired: show a clear message.
  if (!lifecycle.acceptsSignatures && lifecycle.status !== "expired") {
    notFound();
  }

  const closed =
    !lifecycle.acceptsSignatures ||
    error === "closed" ||
    lifecycle.status === "expired";

  const { data: business } = await supabase
    .from("business")
    .select("name, brand_color, brand_font, logo_url, owner_id")
    .eq("id", template.business_id)
    .maybeSingle();

  const fields = (Array.isArray(template.fields)
    ? template.fields
    : []) as unknown as WaiverField[];

  const brandColor = business?.brand_color ?? "#111827";
  const brandFont = resolveBrandFont(business?.brand_font);
  let limitReached = false;
  if (business && !closed) {
    const { data: ownerProfile } = await supabase
      .from("profiles")
      .select("plan, subscription_status")
      .eq("id", business.owner_id)
      .maybeSingle();

    if (!isPro(ownerProfile)) {
      const { count } = await supabase
        .from("submission")
        .select("id", { count: "exact", head: true })
        .eq("business_id", template.business_id)
        .gte("signed_at", currentMonthStartISO());
      limitReached = (count ?? 0) >= FREE_MONTHLY_LIMIT;
    }
  }

  return (
    <>
      <BrandFontLink fontId={brandFont.id} />
      {!closed ? <TrackPublicEvents slug={slug} /> : null}
      <main
        className="mx-auto flex min-h-screen max-w-lg flex-col gap-6 px-6 py-10"
        style={{ fontFamily: brandFont.family }}
      >
        <header className="flex flex-col gap-2">
          {business?.logo_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={business.logo_url}
              alt={business?.name ?? "Logo"}
              className="h-12 w-auto max-w-[180px] object-contain"
            />
          )}
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

        <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] p-4">
          <p className="whitespace-pre-wrap text-sm text-[var(--color-muted)]">
            {template.legal_text}
          </p>
        </section>

        {closed ? (
          <section className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            Cette décharge n&apos;accepte plus de nouvelles signatures
            {lifecycle.status === "expired" ? " (expirée)" : ""}. Merci de
            contacter l&apos;établissement si besoin.
          </section>
        ) : limitReached ? (
          <section className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            Ce formulaire est temporairement indisponible. Merci de contacter
            l&apos;établissement directement.
          </section>
        ) : (
          <SignForm
            slug={slug}
            fields={fields}
            brandColor={brandColor}
            businessName={business?.name ?? null}
            signerNameLabel={template.signer_name_label ?? null}
            hasError={error}
            borne={borne === "1"}
          />
        )}

        <footer className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-[var(--color-border)] pt-4 text-xs text-[var(--color-muted)]">
          <span>Propulsé par Paova</span>
          <a href="/confidentialite" className="hover:underline">
            Confidentialité
          </a>
          <a href="/mentions-legales" className="hover:underline">
            Mentions légales
          </a>
        </footer>
      </main>
    </>
  );
}
