import Link from "next/link";

export const metadata = {
  title: "Politique de confidentialité — Paova",
};

export default function PrivacyPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-6 px-6 py-12">
      <Link
        href="/"
        className="text-sm text-[var(--color-muted)] transition-colors hover:text-[var(--color-foreground)]"
      >
        ← Accueil
      </Link>

      <h1 className="text-3xl font-semibold tracking-tight">
        Politique de confidentialité
      </h1>
      <p className="text-sm text-[var(--color-muted)]">
        Dernière mise à jour : [à compléter]
      </p>

      <section className="flex flex-col gap-3 text-sm leading-relaxed">
        <h2 className="text-lg font-semibold">1. Responsable du traitement</h2>
        <p>
          Lorsque vous signez une décharge via Paova, l&apos;établissement qui
          vous a transmis le lien (ci-après « l&apos;établissement ») est
          responsable du traitement de vos données. Paova agit comme
          sous-traitant technique pour le compte de l&apos;établissement.
        </p>
        <p>
          Éditeur de Paova : [Nom / raison sociale], [forme juridique], [adresse],
          SIREN/SIRET : [à compléter]. Contact : [email].
        </p>

        <h2 className="text-lg font-semibold">2. Données collectées</h2>
        <p>
          Dans le cadre de la signature d&apos;une décharge, nous collectons :
          nom du signataire, adresse email (facultative), réponses aux champs du
          formulaire, signature manuscrite, date et heure de signature, adresse
          IP.
        </p>

        <h2 className="text-lg font-semibold">3. Finalités</h2>
        <p>
          Ces données servent uniquement à établir et conserver la preuve de la
          décharge de responsabilité signée entre vous et l&apos;établissement.
        </p>

        <h2 className="text-lg font-semibold">4. Base légale</h2>
        <p>
          Le traitement repose sur votre consentement et sur
          l&apos;intérêt légitime de l&apos;établissement à disposer
          d&apos;une preuve de la décharge signée.
        </p>

        <h2 className="text-lg font-semibold">5. Durée de conservation</h2>
        <p>
          Les données sont conservées pendant la durée nécessaire à la finalité,
          puis archivées ou supprimées conformément aux obligations légales de
          l&apos;établissement : [durée à compléter].
        </p>

        <h2 className="text-lg font-semibold">6. Hébergement</h2>
        <p>
          Les données sont hébergées au sein de l&apos;Union européenne
          (infrastructure Supabase / Vercel, région UE).
        </p>

        <h2 className="text-lg font-semibold">7. Vos droits</h2>
        <p>
          Conformément au RGPD, vous disposez d&apos;un droit d&apos;accès, de
          rectification, d&apos;effacement, de limitation et
          d&apos;opposition. Pour les exercer, contactez
          l&apos;établissement concerné ou : [email]. Vous pouvez également
          introduire une réclamation auprès de la CNIL.
        </p>
      </section>

      <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
        Modèle à personnaliser et à faire valider juridiquement avant mise en
        ligne publique.
      </p>
    </main>
  );
}
