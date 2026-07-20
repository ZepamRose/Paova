import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center gap-10 px-6 py-16">
      <header className="flex items-center gap-2">
        <span className="inline-block h-6 w-6 rounded-md bg-[var(--color-brand)]" />
        <span className="text-lg font-semibold tracking-tight">SafeSign</span>
      </header>

      <section className="flex flex-col gap-6">
        <h1 className="text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
          Vos décharges de responsabilité,
          <br />
          signées en ligne en 30 secondes.
        </h1>
        <p className="max-w-xl text-lg text-[var(--color-muted)]">
          Créez une décharge, partagez un lien ou un QR code, collectez des
          signatures sécurisées et horodatées. Conforme RGPD, hébergé en Europe.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/login"
            className="rounded-lg bg-[var(--color-brand)] px-5 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
          >
            Commencer
          </Link>
          <a
            href="#"
            className="rounded-lg border border-[var(--color-border)] px-5 py-2.5 text-sm font-medium transition-colors hover:bg-gray-50"
          >
            En savoir plus
          </a>
        </div>
      </section>

      <footer className="mt-8 border-t border-[var(--color-border)] pt-6 text-sm text-[var(--color-muted)]">
        Base de projet prête à développer — Next.js 15 · Supabase · Stripe · Tailwind.
      </footer>
    </main>
  );
}
