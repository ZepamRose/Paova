import Link from "next/link";

export const metadata = {
  title: "Mentions légales — Paova",
};

export default function LegalNoticePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-6 px-6 py-12">
      <Link
        href="/"
        className="text-sm text-[var(--color-muted)] transition-colors hover:text-[var(--color-foreground)]"
      >
        ← Accueil
      </Link>

      <h1 className="text-3xl font-semibold tracking-tight">Mentions légales</h1>

      <section className="flex flex-col gap-3 text-sm leading-relaxed">
        <h2 className="text-lg font-semibold">Éditeur du site</h2>
        <p>
          [Nom / raison sociale], [forme juridique] au capital de [montant] €.
          <br />
          Siège social : [adresse].
          <br />
          SIREN / SIRET : [à compléter] — RCS : [à compléter].
          <br />
          TVA intracommunautaire : [à compléter].
          <br />
          Directeur de la publication : [nom].
          <br />
          Contact : [email] — [téléphone].
        </p>

        <h2 className="text-lg font-semibold">Hébergement</h2>
        <p>
          Le site est hébergé par [hébergeur — ex. Vercel Inc. / Supabase],
          région Union européenne. [Adresse de l&apos;hébergeur].
        </p>

        <h2 className="text-lg font-semibold">Propriété intellectuelle</h2>
        <p>
          L&apos;ensemble des contenus de ce site est protégé par le droit
          d&apos;auteur. Toute reproduction sans autorisation est interdite.
        </p>

        <h2 className="text-lg font-semibold">Données personnelles</h2>
        <p>
          Le traitement des données personnelles est décrit dans notre{" "}
          <Link
            href="/confidentialite"
            className="text-[var(--color-brand)] hover:underline"
          >
            politique de confidentialité
          </Link>
          .
        </p>
      </section>

      <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
        Modèle à personnaliser avec vos informations réelles avant mise en ligne
        publique.
      </p>
    </main>
  );
}
