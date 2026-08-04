import { redirect } from "next/navigation";
import QRCode from "qrcode";
import { createClient } from "@/lib/supabase/server";
import { getActiveMembership, resolveBusinessContext } from "@/lib/auth/membership";
import { env } from "@/lib/env";
import { PrintView } from "./print-view";

export default async function StationPrintPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  await resolveBusinessContext(supabase, user.id, user);
  const membership = await getActiveMembership(supabase, user.id);
  if (!membership) redirect("/onboarding");

  const { data: group } = await supabase
    .from("signing_group")
    .select("id, name, public_token, template_id, kind, business_id")
    .eq("id", id)
    .eq("business_id", membership.businessId)
    .maybeSingle();

  if (!group) redirect("/dashboard");

  // Only stations can be printed
  if (group.kind !== "station") {
    redirect(`/dashboard/groupes/${id}`);
  }

  const { data: template } = group.template_id
    ? await supabase
        .from("waiver_template")
        .select("id, title")
        .eq("id", group.template_id)
        .maybeSingle()
    : { data: null };

  const publicUrl = `${env.appUrl}/g/${group.public_token}`;

  // Generate large QR code for printing
  const qrDataUrl = await QRCode.toDataURL(publicUrl, {
    width: 800,
    margin: 2,
    color: { dark: "#0a0a0a", light: "#ffffff" },
  });

  return (
    <PrintView
      stationName={group.name}
      templateTitle={template?.title ?? "Formulaire"}
      publicUrl={publicUrl}
      qrDataUrl={qrDataUrl}
    />
  );
}
