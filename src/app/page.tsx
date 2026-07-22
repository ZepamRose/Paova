import Link from "next/link";
import type { ReactNode } from "react";
import { BrandLogo } from "@/components/brand-logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { PRO_PRICE_EUR } from "@/lib/plan";

const iconProps = {
  width: 22,
  height: 22,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

const icons = {
  pen: (
    <svg {...iconProps}>
      <path d="M12 19l7-7 3 3-7 7-3-3z" />
      <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" />
      <path d="M2 2l7.586 7.586" />
      <circle cx="11" cy="11" r="2" />
    </svg>
  ),
  document: (
    <svg {...iconProps}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6" />
      <path d="M9 13h6M9 17h6" />
    </svg>
  ),
  qr: (
    <svg {...iconProps}>
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <path d="M14 14h3v3M21 14v.01M14 21h3M21 17v4" />
    </svg>
  ),
  shield: (
    <svg {...iconProps}>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  ),
  palette: (
    <svg {...iconProps}>
      <circle cx="12" cy="12" r="10" />
      <circle cx="8.5" cy="10.5" r="1" />
      <circle cx="12" cy="8" r="1" />
      <circle cx="15.5" cy="10.5" r="1" />
      <path d="M12 22a4 4 0 0 1 0-8 2 2 0 0 0 2-2 10 10 0 1 0-2 10z" />
    </svg>
  ),
  download: (
    <svg {...iconProps}>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <path d="M7 10l5 5 5-5" />
      <path d="M12 15V3" />
    </svg>
  ),
  europe: (
    <svg {...iconProps}>
      <circle cx="12" cy="12" r="10" />
      <path d="M2 12h20" />
      <path d="M12 2a15 15 0 0 1 0 20" />
      <path d="M12 2a15 15 0 0 0 0 20" />
    </svg>
  ),
} satisfies Record<string, ReactNode>;

const cardHover =
  "transition-[transform,box-shadow] duration-200 ease-out hover:-translate-y-0.5 hover:shadow-[0_10px_28px_-14px_rgba(0,0,0,0.12)]";

function Step({
  number,
  title,
  description,
}: {
  number: string;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--color-brand)] text-sm font-semibold text-[var(--color-on-brand)]">
        {number}
      </div>
      <h3 className="text-lg font-semibold tracking-tight">{title}</h3>
      <p className="text-sm leading-relaxed text-[var(--color-muted)]">
        {description}
      </p>
    </div>
  );
}

function Feature({
  icon,
  title,
  description,
  className = "",
}: {
  icon: ReactNode;
  title: string;
  description: string;
  className?: string;
}) {
  return (
    <div
      className={`flex flex-col gap-2.5 rounded-[1.25rem] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-[0_1px_0_rgba(0,0,0,0.02)] sm:gap-3 sm:p-5 ${cardHover} ${className}`}
    >
      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--color-surface-2)] text-[var(--color-brand)]">
        {icon}
      </div>
      <h3 className="text-base font-semibold tracking-tight">{title}</h3>
      <p className="text-sm leading-relaxed text-[var(--color-muted)]">
        {description}
      </p>
    </div>
  );
}

function Benefit({
  icon,
  title,
}: {
  icon: ReactNode;
  title: string;
}) {
  return (
    <div
      className={`flex items-center gap-3 rounded-[1.25rem] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-left shadow-[0_1px_0_rgba(0,0,0,0.02)] sm:flex-col sm:items-start sm:gap-3 sm:px-5 sm:py-5 ${cardHover}`}
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--color-surface-2)] text-[var(--color-brand)]">
        {icon}
      </div>
      <p className="text-sm font-medium leading-snug tracking-tight">{title}</p>
    </div>
  );
}

function PricingCheck({ children }: { children: ReactNode }) {
  return (
    <li className="flex items-start gap-2.5">
      <span
        className="mt-0.5 text-[var(--color-brand)]"
        aria-hidden
      >
        ✓
      </span>
      <span>{children}</span>
    </li>
  );
}

function Faq({ question, answer }: { question: string; answer: string }) {
  return (
    <details className="group border-b border-[var(--color-border)] py-3 sm:py-4">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-medium">
        {question}
        <span className="text-[var(--color-muted)] transition-transform group-open:rotate-45">
          +
        </span>
      </summary>
      <p className="mt-3 text-sm leading-relaxed text-[var(--color-muted)]">
        {answer}
      </p>
    </details>
  );
}

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-10 border-b border-[var(--color-border)] bg-[var(--color-background)]/80 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3.5 sm:px-6 sm:py-4">
          <BrandLogo />
          <nav className="flex shrink-0 items-center gap-1 sm:gap-2">
            <a
              href="#comment-ca-marche"
              className="hidden rounded-lg px-3 py-2 text-sm font-medium text-[var(--color-muted)] transition-colors hover:text-[var(--color-foreground)] md:block"
            >
              Comment ça marche
            </a>
            <a
              href="#tarifs"
              className="whitespace-nowrap rounded-lg px-2.5 py-2 text-[13px] font-medium text-[var(--color-muted)] transition-colors hover:text-[var(--color-foreground)] sm:px-3 sm:text-sm"
            >
              Tarifs
            </a>
            <Link
              href="/login"
              className="whitespace-nowrap rounded-lg bg-[var(--color-brand)] px-2.5 py-2 text-[13px] font-medium text-[var(--color-on-brand)] transition-opacity hover:opacity-90 sm:px-3.5 sm:text-sm"
            >
              Commencer
            </Link>
            <ThemeToggle />
          </nav>
        </div>
      </header>

      <main className="w-full flex-1">
        {/* Hero */}
        <section className="mx-auto flex max-w-5xl flex-col items-center gap-4 px-6 py-12 text-center sm:gap-6 sm:py-20">
          <span className="rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 py-1.5 text-xs font-medium tracking-wide text-[var(--color-foreground)]/75 shadow-[0_1px_0_rgba(0,0,0,0.03)]">
            Simple · Français · Hébergé en Europe
          </span>
          <h1 className="max-w-3xl text-[2.625rem] font-semibold leading-tight tracking-tight sm:text-[3.95rem]">
            Faites signer vos décharges sans papier ni complication.
          </h1>
          <p className="max-w-lg text-base leading-relaxed text-[var(--color-muted)] sm:text-lg">
            Créez une décharge, partagez-la par lien ou QR code et récupérez une
            signature en moins d&apos;une minute.
          </p>
          <div className="flex flex-wrap justify-center gap-3 pt-1">
            <Link
              href="/login"
              className="rounded-lg bg-[var(--color-brand)] px-5 py-[0.7rem] text-sm font-medium text-[var(--color-on-brand)] transition-opacity hover:opacity-90"
            >
              Commencer gratuitement
            </Link>
            <a
              href="#comment-ca-marche"
              className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-[0.7rem] text-sm font-medium transition-colors hover:bg-[var(--color-surface-2)]"
            >
              Voir comment ça marche
            </a>
          </div>
          <p className="max-w-lg text-[12px] leading-relaxed text-[var(--color-muted)]/85">
            Aucune carte bancaire · 10 signatures gratuites par mois ·
            Configuration en moins de 2 minutes
          </p>
        </section>

        {/* Avantages clés */}
        <section
          aria-label="Avantages principaux"
          className="mx-auto max-w-5xl px-6 pb-10 sm:pb-16"
        >
          <div className="grid gap-3 sm:grid-cols-3 sm:gap-4">
            <Benefit
              icon={icons.pen}
              title="Signature en moins d'une minute"
            />
            <Benefit
              icon={icons.document}
              title="PDF généré automatiquement"
            />
            <Benefit
              icon={icons.europe}
              title="Données hébergées en Europe"
            />
          </div>
        </section>

        {/* Comment ça marche */}
        <section
          id="comment-ca-marche"
          className="border-t border-[var(--color-border)] bg-[var(--color-surface-2)]/45"
        >
          <div className="mx-auto flex max-w-5xl flex-col gap-6 px-6 py-12 sm:gap-8 sm:py-20">
            <div className="flex flex-col gap-2 text-center">
              <h2 className="text-3xl font-semibold tracking-tight">
                Comment ça marche
              </h2>
              <p className="text-[var(--color-muted)]">
                Trois étapes simples pour collecter votre première signature.
              </p>
            </div>
            <div className="grid gap-6 sm:grid-cols-3 sm:gap-8">
              <Step
                number="1"
                title="Créez votre décharge"
                description="Choisissez un modèle ou rédigez votre texte, puis ajoutez les champs dont vous avez besoin. Aucune compétence technique requise."
              />
              <Step
                number="2"
                title="Partagez le lien ou le QR code"
                description="Envoyez le lien par message ou affichez le QR code à l'accueil. Vos clients signent depuis leur téléphone."
              />
              <Step
                number="3"
                title="Retrouvez vos signatures"
                description="Chaque signature est horodatée et archivée. Téléchargez le PDF ou exportez le tout en CSV."
              />
            </div>
          </div>
        </section>

        {/* Pour ceux qui n'ont pas encore de décharge — desktop only */}
        <section
          id="pour-qui"
          className="hidden border-t border-[var(--color-border)] sm:block"
        >
          <div className="mx-auto flex max-w-5xl flex-col gap-8 px-6 py-16 sm:gap-10 sm:py-20">
            <div className="mx-auto flex max-w-2xl flex-col gap-3 text-center">
              <h2 className="text-3xl font-semibold tracking-tight">
                Vous ne faites pas encore signer de décharge&nbsp;?
              </h2>
              <p className="text-[var(--color-muted)]">
                Beaucoup d&apos;établissements savent qu&apos;ils devraient
                protéger leur activité, mais repoussent la mise en place
                d&apos;un système de signature parce que c&apos;est compliqué,
                prend du temps ou implique du papier.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <Feature
                icon={icons.pen}
                title="Plus de papier"
                description="Faites signer vos clients directement sur leur téléphone ou une tablette."
              />
              <Feature
                icon={icons.qr}
                title="Mise en place en quelques minutes"
                description="Créez votre première décharge, partagez un QR code et commencez immédiatement."
              />
              <Feature
                icon={icons.document}
                title="Toutes vos signatures au même endroit"
                description="Chaque signature est horodatée, archivée et disponible en PDF."
              />
            </div>

            <aside className="mx-auto max-w-2xl rounded-[1.25rem] border border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-4 text-left shadow-[0_1px_0_rgba(0,0,0,0.02)]">
              <p className="text-sm font-medium tracking-tight">
                Paova est un outil, pas un cabinet juridique.
              </p>
              <p className="mt-1.5 text-sm leading-relaxed text-[var(--color-muted)]">
                Paova facilite la création, la signature et l&apos;archivage de
                vos décharges. Le contenu juridique des documents reste sous la
                responsabilité de votre établissement.
              </p>
            </aside>
          </div>
        </section>

        {/* Fonctionnalités */}
        <section className="border-t border-[var(--color-border)] bg-[var(--color-surface-2)]/45">
          <div className="mx-auto flex max-w-5xl flex-col gap-6 px-6 py-12 sm:gap-8 sm:py-20">
            <div className="flex flex-col gap-2 text-center">
              <h2 className="text-3xl font-semibold tracking-tight">
                Tout ce qu&apos;il vous faut
              </h2>
              <p className="text-[var(--color-muted)]">
                Simple pour vos clients, clair pour vous.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
              <Feature
                icon={icons.pen}
                title="Signature manuscrite"
                description="Vos clients signent au doigt sur leur téléphone ou une tablette, comme sur papier."
              />
              <Feature
                icon={icons.document}
                title="PDF horodaté"
                description="Chaque décharge génère un PDF signé, daté et conservé dans votre espace."
              />
              <Feature
                icon={icons.qr}
                title="QR code & mode borne"
                description="Affichez un QR code à l'accueil, ou faites signer plusieurs personnes d'affilée sur une seule tablette."
              />
              <Feature
                icon={icons.shield}
                title="Conçu pour le RGPD"
                description="Consentement explicite, données hébergées en Europe et export à tout moment."
              />
              <Feature
                className="hidden sm:flex"
                icon={icons.palette}
                title="À vos couleurs"
                description="Personnalisez la couleur de vos pages de signature et de vos PDF avec votre marque."
              />
              <Feature
                className="hidden sm:flex"
                icon={icons.download}
                title="Export CSV"
                description="Exportez toutes vos signatures en un clic pour votre comptabilité ou vos archives."
              />
            </div>
          </div>
        </section>

        {/* Tarifs */}
        <section
          id="tarifs"
          className="border-t border-[var(--color-border)]"
        >
          <div className="mx-auto flex max-w-5xl flex-col gap-6 px-6 py-12 sm:gap-8 sm:py-20">
            <div className="flex flex-col gap-2 text-center">
              <h2 className="text-3xl font-semibold tracking-tight">
                Un tarif simple
              </h2>
              <p className="text-[var(--color-muted)]">
                Commencez gratuitement, passez à Pro quand vous décollez.
              </p>
            </div>
            <div className="mx-auto grid w-full max-w-2xl gap-3 sm:grid-cols-2 sm:gap-4">
              <div
                className={`flex flex-col gap-4 rounded-[1.35rem] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[0_1px_0_rgba(0,0,0,0.02)] sm:gap-5 sm:p-6 ${cardHover}`}
              >
                <div className="flex flex-col gap-1">
                  <span className="text-sm font-medium text-[var(--color-muted)]">
                    Gratuit
                  </span>
                  <span className="text-3xl font-semibold tracking-tight">
                    0 € <span className="text-base font-normal">/ mois</span>
                  </span>
                </div>
                <ul className="flex flex-col gap-3 text-sm text-[var(--color-muted)]">
                  <PricingCheck>10 signatures par mois</PricingCheck>
                  <PricingCheck>Décharges illimitées</PricingCheck>
                  <PricingCheck>Preuve PDF & export CSV</PricingCheck>
                  <PricingCheck>QR code & mode borne</PricingCheck>
                </ul>
                <Link
                  href="/login"
                  className="mt-auto rounded-lg border border-[var(--color-border)] px-5 py-2.5 text-center text-sm font-medium transition-colors hover:bg-[var(--color-surface-2)]"
                >
                  Commencer
                </Link>
              </div>

              <div
                className={`flex flex-col gap-4 rounded-[1.35rem] border-2 border-[var(--color-brand)] bg-[var(--color-surface)] p-5 shadow-[0_1px_0_rgba(0,0,0,0.02)] sm:gap-5 sm:p-6 ${cardHover}`}
              >
                <div className="flex flex-col gap-1">
                  <span className="flex items-center gap-2 text-sm font-medium">
                    Pro
                    <span className="rounded-full bg-[var(--color-brand)] px-2 py-0.5 text-xs text-[var(--color-on-brand)]">
                      Populaire
                    </span>
                  </span>
                  <span className="text-3xl font-semibold tracking-tight">
                    {PRO_PRICE_EUR} €{" "}
                    <span className="text-base font-normal">/ mois</span>
                  </span>
                  <span className="text-sm text-[var(--color-muted)]">
                    Sans engagement
                  </span>
                </div>
                <ul className="flex flex-col gap-3 text-sm text-[var(--color-muted)]">
                  <PricingCheck>Signatures illimitées</PricingCheck>
                  <PricingCheck>
                    Tout ce qui est inclus dans Gratuit
                  </PricingCheck>
                  <PricingCheck>
                    Personnalisation aux couleurs de votre marque
                  </PricingCheck>
                  <PricingCheck>Support prioritaire</PricingCheck>
                </ul>
                <Link
                  href="/login"
                  className="mt-auto rounded-lg bg-[var(--color-brand)] px-5 py-2.5 text-center text-sm font-medium text-[var(--color-on-brand)] transition-opacity hover:opacity-90"
                >
                  Passer à Pro
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="border-t border-[var(--color-border)] bg-[var(--color-surface-2)]/45">
          <div className="mx-auto flex max-w-5xl flex-col gap-5 px-6 py-12 sm:gap-6 sm:py-20">
            <div className="flex flex-col gap-2 text-center">
              <p className="text-sm text-[var(--color-muted)]">
                Une question&nbsp;? Vous trouverez probablement la réponse
                ci-dessous.
              </p>
              <h2 className="text-3xl font-semibold tracking-tight">
                Questions fréquentes
              </h2>
            </div>
            <div className="mx-auto w-full max-w-2xl">
              <Faq
                question="Que contient une signature Paova ?"
                answer="Chaque signature est horodatée, associée à l'adresse IP du signataire et à un consentement explicite au traitement des données. Un PDF est généré et archivé dans votre espace. Le contenu juridique de vos décharges reste sous votre responsabilité."
              />
              <Faq
                question="Mes clients doivent-ils installer une application ?"
                answer="Non. Tout se passe dans le navigateur. Vos clients ouvrent simplement le lien ou scannent le QR code, puis signent depuis leur téléphone."
              />
              <Faq
                question="Où sont hébergées les données ?"
                answer="Toutes les données sont hébergées au sein de l'Union européenne et le service est conçu pour respecter le RGPD."
              />
              <Faq
                question="Puis-je faire signer plusieurs personnes sur une seule tablette ?"
                answer="Oui, grâce au mode borne : après chaque signature, un bouton « Signataire suivant » réinitialise le formulaire pour la personne suivante."
              />
              <Faq
                question="Puis-je annuler à tout moment ?"
                answer="Oui. L'offre Pro est sans engagement, vous pouvez gérer ou résilier votre abonnement en un clic depuis votre espace."
              />
            </div>
          </div>
        </section>

        {/* CTA final */}
        <section className="border-t border-[var(--color-border)]">
          <div className="mx-auto flex max-w-5xl flex-col items-center gap-4 px-6 py-10 text-center sm:gap-6 sm:py-20">
            <h2 className="max-w-2xl text-3xl font-semibold tracking-tight sm:text-4xl">
              Prêt à simplifier vos décharges&nbsp;?
            </h2>
            <p className="max-w-lg text-[var(--color-muted)]">
              Remplacez le papier — ou mettez enfin en place un système de
              signature. Votre première décharge se crée en quelques minutes.
            </p>
            <Link
              href="/login"
              className="rounded-lg bg-[var(--color-brand)] px-5 py-[0.7rem] text-sm font-medium text-[var(--color-on-brand)] transition-opacity hover:opacity-90"
            >
              Commencer gratuitement
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-[var(--color-border)]">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-4 gap-y-2 px-6 py-8 text-sm text-[var(--color-muted)]">
          <span>© {new Date().getFullYear()} Paova</span>
          <Link href="/mentions-legales" className="hover:underline">
            Mentions légales
          </Link>
          <Link href="/confidentialite" className="hover:underline">
            Confidentialité
          </Link>
        </div>
      </footer>
    </div>
  );
}
