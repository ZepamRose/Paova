import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { WaiverForm } from "./waiver-form";

export default async function NewWaiverPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

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
          Nouvelle décharge
        </h1>
      </div>

      <WaiverForm hasError={error === "required"} />
    </main>
  );
}
