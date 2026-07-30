import Link from "next/link";
import type { ReactNode } from "react";
import {
  DoorOpen,
  Dumbbell,
  FerrisWheel,
  HeartHandshake,
  Trophy,
  PartyPopper,
} from "lucide-react";
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
} satisfies Record<string, ReactNode>;

const cardHover =
  "transition-[box-shadow,border-color] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] hover:border-[color-mix(in_srgb,var(--color-brand)_16%,var(--color-border))] hover:shadow-[var(--elev-2)]";

/** ~15–20% tighter than previous — still premium, not cramped. */
const sectionPad = "px-6 py-8 sm:py-14";
const sectionStack = "flex flex-col gap-3.5 sm:gap-5";
const sectionHeader = "flex flex-col gap-1 text-center";

const audienceSegments: {
  title: string;
  description: string;
  icon: ReactNode;
}[] = [
  {
    title: "Escape games",
    description: "Faites signer avant chaque partie, sans ralentir l'accueil.",
    icon: <DoorOpen size={16} strokeWidth={1.75} aria-hidden />,
  },
  {
    title: "Salles de sport",
    description: "Collectez essais et abonnements en quelques secondes.",
    icon: <Dumbbell size={16} strokeWidth={1.75} aria-hidden />,
  },
  {
    title: "Parcs de loisirs",
    description: "Gérez un fort volume de visiteurs, sans papier à l'entrée.",
    icon: <FerrisWheel size={16} strokeWidth={1.75} aria-hidden />,
  },
  {
    title: "Associations",
    description: "Gardez une trace nette pour chaque sortie ou activité.",
    icon: <HeartHandshake size={16} strokeWidth={1.75} aria-hidden />,
  },
  {
    title: "Clubs sportifs",
    description: "Parents et licenciés signent en ligne, saison après saison.",
    icon: <Trophy size={16} strokeWidth={1.75} aria-hidden />,
  },
  {
    title: "Événementiel",
    description: "Déployez une décharge pour l'événement, archivez après.",
    icon: <PartyPopper size={16} strokeWidth={1.75} aria-hidden />,
  },
];

type PricingPlan = {
  id: "free" | "pro" | "business";
  name: string;
  priceLabel: string;
  priceSuffix?: string;
  description: string;
  features: string[];
  cta: { label: string; href: string; variant: "primary" | "secondary" };
  badge?: string;
  highlighted?: boolean;
  /** When false, the plan is ready in data but not shown on the landing. */
  visible: boolean;
};

const pricingPlans: PricingPlan[] = [
  {
    id: "free",
    name: "Gratuit",
    priceLabel: "0 €",
    priceSuffix: "/ mois",
    description: "Idéal pour découvrir Paova.",
    features: [
      "10 signatures par mois",
      "Décharges illimitées, lien et QR code",
      "Preuves PDF et recherche des signatures",
      "Horaires automatiques : découverte Premium offerte 7 jours",
    ],
    cta: {
      label: "Commencer gratuitement",
      href: "/login",
      variant: "secondary",
    },
    visible: true,
  },
  {
    id: "pro",
    name: "Pro",
    priceLabel: `${PRO_PRICE_EUR} €`,
    priceSuffix: "/ mois",
    description: "Conçu pour les équipes qui signent chaque jour.",
    features: [
      "Signatures illimitées",
      "Horaires automatiques et expiration",
      "Versions, historique et archivage",
      "Personnalisation à vos couleurs",
      "Export CSV et support prioritaire",
    ],
    cta: { label: "Passer à Pro", href: "/login", variant: "primary" },
    badge: "Recommandé",
    highlighted: true,
    visible: true,
  },
  {
    id: "business",
    name: "Business",
    priceLabel: "Sur mesure",
    description: "Pour les structures qui ont besoin d'un contrôle avancé.",
    features: [
      "Tout Pro inclus",
      "Contrôle avancé multi-établissements",
      "Traçabilité et reporting étendus",
      "Outils de gestion et accompagnement dédié",
    ],
    cta: { label: "Nous contacter", href: "/login", variant: "secondary" },
    visible: false,
  },
];

const paperVsPaova = {
  paper: {
    title: "Avant",
    items: [
      "Une signature introuvable le jour où il faut",
      "Des classeurs qui grossissent chaque mois",
      "Des minutes perdues à chaque recherche",
      "Impressions, scans, photos floues",
      "Aucune vision claire de l'activité",
    ],
  },
  paova: {
    title: "Aujourd'hui avec Paova",
    items: [
      "La preuve PDF en quelques secondes",
      "Un espace unique pour toutes les décharges",
      "Recherche par nom, immédiatement",
      "QR à l'accueil, zéro papier",
      "Historique, versions et archivage",
    ],
  },
};

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
    <div className="flex flex-col gap-2">
      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--color-brand)] text-sm font-semibold text-[var(--color-on-brand)]">
        {number}
      </div>
      <h3 className="text-base font-semibold tracking-tight sm:text-lg">
        {title}
      </h3>
      <p className="text-sm leading-snug text-[var(--color-muted)]">
        {description}
      </p>
    </div>
  );
}

function Feature({
  icon,
  title,
  description,
}: {
  icon: ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div
      className={`flex flex-col gap-2.5 rounded-[1.25rem] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-[var(--elev-1)] sm:gap-3 sm:p-5 ${cardHover}`}
    >
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[color-mix(in_srgb,var(--color-brand)_12%,var(--color-surface-2))] text-[var(--color-brand)]">
        {icon}
      </div>
      <div className="min-w-0">
        <h3 className="text-base font-semibold tracking-tight">{title}</h3>
        <p className="mt-1 text-sm leading-snug text-[var(--color-muted)]">
          {description}
        </p>
      </div>
    </div>
  );
}

function PricingCheck({ children }: { children: ReactNode }) {
  return (
    <li className="flex items-start gap-2.5">
      <span
        className="mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--color-brand)_14%,transparent)] text-[var(--color-brand)]"
        aria-hidden
      >
        <svg
          width="10"
          height="10"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M20 6 9 17l-5-5" />
        </svg>
      </span>
      <span>{children}</span>
    </li>
  );
}

function Faq({ question, answer }: { question: string; answer: string }) {
  return (
    <details className="group border-b border-[var(--color-border)] py-3 sm:py-3.5">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-medium">
        {question}
        <span className="text-[var(--color-muted)] transition-transform group-open:rotate-45">
          +
        </span>
      </summary>
      <p className="mt-2.5 text-sm leading-relaxed text-[var(--color-muted)]">
        {answer}
      </p>
    </details>
  );
}

/** Static product visual — phone signing, not a card collage. */
function HeroProductVisual() {
  return (
    <div
      aria-hidden
      className="relative mx-auto w-full max-w-[280px] sm:max-w-[300px]"
    >
      <div className="pointer-events-none absolute -inset-8 rounded-[2.5rem] bg-[radial-gradient(ellipse_at_center,color-mix(in_srgb,var(--color-brand)_18%,transparent),transparent_70%)] blur-2xl" />
      <div className="relative overflow-hidden rounded-[1.75rem] border border-[color-mix(in_srgb,var(--color-border)_80%,var(--color-foreground))] bg-[var(--color-surface)] shadow-[var(--elev-3)]">
        <div className="flex items-center justify-between border-b border-[var(--color-border)] px-4 py-3">
          <div className="flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/brand/paova-mark.svg"
              alt=""
              width={14}
              height={18}
              className="h-[18px] w-auto"
            />
            <span className="text-[13px] font-semibold tracking-tight">
              Escape Room Lyon
            </span>
          </div>
          <span className="h-2 w-2 rounded-full bg-[var(--color-brand)]" />
        </div>
        <div className="flex flex-col gap-3 px-4 py-4">
          <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-[var(--color-muted)]">
            Décharge
          </p>
          <p className="text-[15px] font-semibold tracking-tight">
            Participation escape game
          </p>
          <div className="h-16 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)]/70 px-3 py-2">
            <p className="text-[10px] leading-relaxed text-[var(--color-muted)]">
              Je reconnais avoir pris connaissance des règles de sécurité…
            </p>
          </div>
          <div className="rounded-xl border border-dashed border-[color-mix(in_srgb,var(--color-brand)_35%,var(--color-border))] bg-[color-mix(in_srgb,var(--color-brand)_5%,var(--color-surface))] px-3 py-5">
            <svg
              viewBox="0 0 120 36"
              className="mx-auto h-8 w-full text-[var(--color-foreground)]/70"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
            >
              <path d="M8 26c8-14 14-18 22-10 6 6 10 4 16-2 8-8 14-4 20 2 7 7 12 4 18-4 5-7 12-8 20 2" />
            </svg>
            <p className="mt-1 text-center text-[10px] text-[var(--color-muted)]">
              Signature
            </p>
          </div>
          <div className="h-10 rounded-xl bg-[var(--color-brand)] text-center text-[12px] font-medium leading-10 text-[var(--color-on-brand)]">
            Signer et valider
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const visiblePlans = pricingPlans.filter((plan) => plan.visible);

  return (
    <div className="relative flex min-h-screen flex-col">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[42rem] bg-[radial-gradient(ellipse_80%_55%_at_50%_-10%,color-mix(in_srgb,var(--color-brand)_14%,transparent),transparent)]"
      />

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
              className="btn-primary !rounded-lg px-2.5 py-2 text-[13px] sm:px-3.5 sm:text-sm"
            >
              Commencer
            </Link>
            <ThemeToggle />
          </nav>
        </div>
      </header>

      <main className="relative w-full flex-1">
        {/* Hero */}
        <section className="mx-auto grid max-w-5xl items-center gap-7 px-6 pb-9 pt-5 sm:gap-9 sm:pb-12 sm:pt-8 lg:grid-cols-[1.05fr_0.95fr] lg:gap-11 lg:pt-9">
          <div className="flex flex-col items-center text-center lg:items-start lg:text-left">
            <p className="text-[13px] font-semibold tracking-[0.04em] text-[var(--color-brand)] sm:text-sm">
              paova
            </p>
            <h1 className="mt-2.5 max-w-xl text-[2.35rem] font-semibold leading-[1.08] tracking-tight sm:text-[3.15rem] lg:text-[3.35rem]">
              Toutes vos décharges, gérées au même endroit.
            </h1>
            <p className="mt-3.5 max-w-lg text-base leading-relaxed text-[var(--color-muted)] sm:text-lg">
              Remplacez le papier : collectez les signatures, gardez les preuves
              et retrouvez chaque dossier en quelques secondes.
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-3 lg:justify-start">
              <Link href="/login" className="btn-primary">
                Commencer gratuitement
              </Link>
              <a href="#comment-ca-marche" className="btn-secondary">
                Voir comment ça marche
              </a>
            </div>
            <p className="mt-3.5 max-w-lg text-[12px] leading-relaxed text-[var(--color-muted)]/85">
              Sans application pour les participants · Hébergement européen ·
              Dossier de preuve inclus
            </p>
          </div>

          <div className="flex justify-center lg:justify-end">
            <HeroProductVisual />
          </div>
        </section>

        {/* Comment ça marche — Comment ça se passe ? */}
        <section
          id="comment-ca-marche"
          className="border-t border-[var(--color-border)] bg-[var(--color-surface-2)]/45"
        >
          <div className={`mx-auto max-w-5xl ${sectionPad} ${sectionStack}`}>
            <div className={sectionHeader}>
              <h2 className="text-3xl font-semibold tracking-tight">
                Comment ça marche
              </h2>
              <p className="text-sm text-[var(--color-muted)] sm:text-base">
                Du brouillon à l&apos;archive, sans friction.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-4">
              <Step number="1" title="Créer" description="Rédigez et activez." />
              <Step number="2" title="Partager" description="Lien ou QR code." />
              <Step
                number="3"
                title="Faire signer"
                description="Sur téléphone → PDF."
              />
              <Step
                number="4"
                title="Archiver et consulter"
                description="Toujours accessible."
              />
            </div>
          </div>
        </section>

        {/* Bénéfices — Qu'est-ce que j'y gagne ? */}
        <section id="benefices" className="border-t border-[var(--color-border)]">
          <div className={`mx-auto max-w-5xl ${sectionPad} ${sectionStack}`}>
            <div className={`mx-auto max-w-2xl ${sectionHeader}`}>
              <h2 className="text-3xl font-semibold tracking-tight">
                Ce que vous gagnez au quotidien
              </h2>
              <p className="text-sm text-[var(--color-muted)] sm:text-base">
                Moins d&apos;administratif. Plus de sérénité.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 sm:gap-3.5">
              <Feature
                icon={icons.document}
                title="Plus aucune décharge perdue"
                description="Tout reste dans votre espace. Fini les classeurs."
              />
              <Feature
                icon={icons.pen}
                title="Une preuve en quelques secondes"
                description="Cherchez un nom, ouvrez le PDF."
              />
              <Feature
                icon={icons.qr}
                title="Des signatures au bon moment"
                description="Le lien s'ouvre aux bons créneaux."
              />
              <Feature
                icon={icons.shield}
                title="Une trace claire de l'activité"
                description="Versions et historique, toujours disponibles."
              />
            </div>

            <aside className="mx-auto max-w-2xl rounded-[1.25rem] border border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-3.5 text-left shadow-[var(--elev-1)]">
              <p className="text-sm font-medium tracking-tight">
                Un logiciel métier, pas un simple formulaire.
              </p>
              <p className="mt-1 text-sm leading-relaxed text-[var(--color-muted)]">
                Vous pilotez vos décharges de A à Z. Le contenu juridique reste
                sous votre responsabilité.
              </p>
            </aside>
          </div>
        </section>

        {/* Parfait pour — Est-ce pour mon activité ? */}
        <section
          id="parfait-pour"
          className="border-t border-[var(--color-border)] bg-[var(--color-surface-2)]/45"
        >
          <div className={`mx-auto max-w-5xl ${sectionPad} ${sectionStack}`}>
            <div className={`mx-auto max-w-2xl ${sectionHeader}`}>
              <h2 className="text-3xl font-semibold tracking-tight">
                Parfait pour
              </h2>
              <p className="text-sm text-[var(--color-muted)] sm:text-base">
                Des métiers différents. Le même enjeu : collecter vite, garder
                la preuve.
              </p>
            </div>
            <div className="grid gap-2.5 sm:grid-cols-2 sm:gap-3 lg:grid-cols-3">
              {audienceSegments.map((segment) => (
                <div
                  key={segment.title}
                  className={`flex flex-col gap-1.5 rounded-[1.25rem] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-[var(--elev-1)] sm:p-4 ${cardHover}`}
                >
                  <div className="flex items-center gap-2">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[color-mix(in_srgb,var(--color-brand)_10%,var(--color-surface-2))] text-[var(--color-brand)]">
                      {segment.icon}
                    </span>
                    <h3 className="text-base font-semibold tracking-tight">
                      {segment.title}
                    </h3>
                  </div>
                  <p className="text-sm leading-snug text-[var(--color-muted)]">
                    {segment.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Comparaison — Pourquoi changer ? */}
        <section
          id="pourquoi-paova"
          className="border-t border-[var(--color-border)]"
        >
          <div className={`mx-auto max-w-5xl ${sectionPad} ${sectionStack}`}>
            <div className={`mx-auto max-w-2xl ${sectionHeader}`}>
              <h2 className="text-3xl font-semibold tracking-tight">
                Pourquoi les entreprises passent à Paova
              </h2>
              <p className="text-sm text-[var(--color-muted)] sm:text-base">
                De l&apos;ancien réflexe papier à une gestion claire.
              </p>
            </div>
            <div className="mx-auto grid w-full max-w-3xl gap-3 sm:grid-cols-2 sm:gap-4">
              <div className="rounded-[1.25rem] border border-[color-mix(in_srgb,var(--color-border)_90%,var(--color-muted))] bg-[color-mix(in_srgb,var(--color-surface-2)_55%,var(--color-surface))] p-5 opacity-[0.92] sm:p-5">
                <h3 className="flex items-center gap-2 text-[15px] font-semibold tracking-tight text-[var(--color-muted)]">
                  <span
                    className="flex h-6 w-6 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--color-muted)_14%,transparent)] text-[12px] font-semibold text-[var(--color-muted)]"
                    aria-hidden
                  >
                    ✕
                  </span>
                  {paperVsPaova.paper.title}
                </h3>
                <ul className="mt-3.5 flex flex-col gap-2 text-sm text-[var(--color-muted)]">
                  {paperVsPaova.paper.items.map((item) => (
                    <li key={item} className="flex items-start gap-2.5">
                      <span
                        className="mt-0.5 text-[13px] leading-none text-[var(--color-muted)]/70"
                        aria-hidden
                      >
                        ✕
                      </span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div
                className={`rounded-[1.25rem] border-2 border-[var(--color-brand)] bg-[color-mix(in_srgb,var(--color-surface)_88%,var(--color-brand))] p-5 shadow-[var(--elev-2)] ring-1 ring-[color-mix(in_srgb,var(--color-brand)_14%,transparent)] sm:p-5 dark:bg-[color-mix(in_srgb,var(--color-surface)_90%,var(--color-brand))] ${cardHover}`}
              >
                <h3 className="flex items-center gap-2 text-[15px] font-semibold tracking-tight text-[var(--color-foreground)]">
                  <span
                    className="flex h-6 w-6 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--color-brand)_16%,transparent)] text-[var(--color-brand)]"
                    aria-hidden
                  >
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M20 6 9 17l-5-5" />
                    </svg>
                  </span>
                  {paperVsPaova.paova.title}
                </h3>
                <ul className="mt-3.5 flex flex-col gap-2 text-sm text-[var(--color-foreground)]/80">
                  {paperVsPaova.paova.items.map((item) => (
                    <li key={item} className="flex items-start gap-2.5">
                      <span
                        className="mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--color-brand)_16%,transparent)] text-[var(--color-brand)]"
                        aria-hidden
                      >
                        <svg
                          width="10"
                          height="10"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="3"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M20 6 9 17l-5-5" />
                        </svg>
                      </span>
                      <span className="font-medium">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Tarifs — Combien ça coûte ? */}
        <section
          id="tarifs"
          className="border-t border-[var(--color-border)] bg-[var(--color-surface-2)]/45"
        >
          <div className={`mx-auto max-w-5xl ${sectionPad} ${sectionStack}`}>
            <div className={sectionHeader}>
              <p className="text-[11px] leading-relaxed tracking-wide text-[var(--color-muted)]/70">
                Sans engagement · Hébergement en Europe · Conforme au RGPD
              </p>
              <h2 className="text-3xl font-semibold tracking-tight">
                Un tarif clair
              </h2>
              <p className="text-sm text-[var(--color-muted)] sm:text-base">
                Gratuit pour découvrir. Pro pour accélérer le quotidien.
              </p>
            </div>
            <div
              className={`mx-auto grid w-full items-stretch gap-3 sm:gap-4 ${
                visiblePlans.length >= 3
                  ? "max-w-4xl sm:grid-cols-3"
                  : "max-w-2xl sm:grid-cols-2"
              }`}
            >
              {visiblePlans.map((plan) => (
                <div
                  key={plan.id}
                  className={`relative flex flex-col gap-3.5 rounded-[1.35rem] p-5 sm:gap-4 sm:p-6 ${cardHover} ${
                    plan.highlighted
                      ? "z-[1] border-2 border-[var(--color-brand)] bg-[color-mix(in_srgb,var(--color-surface)_90%,var(--color-brand))] shadow-[var(--elev-2)] ring-1 ring-[color-mix(in_srgb,var(--color-brand)_16%,transparent)] sm:scale-[1.02] dark:bg-[color-mix(in_srgb,var(--color-surface)_92%,var(--color-brand))]"
                      : "border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--elev-1)] opacity-[0.96]"
                  }`}
                >
                  <div className="flex flex-col gap-1">
                    <span
                      className={`flex flex-wrap items-center gap-2 text-sm font-medium ${
                        plan.highlighted
                          ? "text-[var(--color-foreground)]"
                          : "text-[var(--color-muted)]"
                      }`}
                    >
                      {plan.name}
                      {plan.badge ? (
                        <span className="rounded-md bg-[var(--color-brand)] px-2 py-0.5 text-[11px] font-semibold tracking-tight text-[var(--color-on-brand)] shadow-[var(--elev-1)]">
                          {plan.badge}
                        </span>
                      ) : null}
                    </span>
                    <span
                      className={`font-semibold tracking-tight ${
                        plan.highlighted ? "text-4xl" : "text-3xl"
                      }`}
                    >
                      {plan.priceLabel}
                      {plan.priceSuffix ? (
                        <span className="text-base font-normal">
                          {" "}
                          {plan.priceSuffix}
                        </span>
                      ) : null}
                    </span>
                    <span className="text-sm text-[var(--color-muted)]">
                      {plan.description}
                    </span>
                  </div>
                  <ul className="flex flex-col gap-2.5 text-sm text-[var(--color-muted)]">
                    {plan.features.map((feature) => (
                      <PricingCheck key={feature}>{feature}</PricingCheck>
                    ))}
                  </ul>
                  <Link
                    href={plan.cta.href}
                    className={`${
                      plan.cta.variant === "primary"
                        ? "btn-primary"
                        : "btn-secondary"
                    } mt-auto text-center`}
                  >
                    {plan.cta.label}
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ — Et si j'ai une question ? */}
        <section className="border-t border-[var(--color-border)]">
          <div className={`mx-auto max-w-5xl ${sectionPad} ${sectionStack}`}>
            <div className={sectionHeader}>
              <p className="text-sm text-[var(--color-muted)]">
                Avant de vous lancer
              </p>
              <h2 className="text-3xl font-semibold tracking-tight">
                Questions fréquentes
              </h2>
            </div>
            <div className="mx-auto w-full max-w-2xl">
              <Faq
                question="Puis-je personnaliser mes décharges ?"
                answer="Oui. Texte, champs, et en Pro : couleurs de votre établissement."
              />
              <Faq
                question="Les signatures disposent-elles d'un dossier de preuve ?"
                answer="Oui. Horodatage, adresse IP, consentement, et PDF conservé dans votre espace."
              />
              <Faq
                question="Puis-je consulter une signature plusieurs mois plus tard ?"
                answer="Oui. Signatures et preuves restent accessibles, même après archivage de la décharge."
              />
              <Faq
                question="Que se passe-t-il si je modifie ma décharge ?"
                answer="Les changements importants sont versionnés. Chaque signature reste liée à la version acceptée."
              />
              <Faq
                question="Mes clients doivent-ils installer une application ?"
                answer="Non. Lien ou QR code, puis signature dans le navigateur du téléphone."
              />
              <Faq
                question="Paova est-il conforme au RGPD ?"
                answer="Oui. Les données sont hébergées dans l'Union européenne. Consentement explicite, accès contrôlé, et export possible. Le contenu juridique des décharges reste sous votre responsabilité."
              />
              <Faq
                question="Puis-je annuler à tout moment ?"
                answer="Oui. Pro sans engagement : vous résiliez depuis votre espace."
              />
            </div>
          </div>
        </section>

        {/* CTA final */}
        <section className="border-t border-[var(--color-border)]">
          <div
            className={`mx-auto flex max-w-5xl flex-col items-center gap-3.5 text-center sm:gap-4 ${sectionPad}`}
          >
            <h2 className="max-w-2xl text-3xl font-semibold tracking-tight sm:text-4xl">
              Prêt à tout gérer au même endroit&nbsp;?
            </h2>
            <p className="max-w-lg text-[var(--color-muted)]">
              Créez votre première décharge en quelques minutes. Les preuves
              suivent automatiquement.
            </p>
            <Link href="/login" className="btn-primary">
              Commencer gratuitement
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-[var(--color-border)] bg-[var(--color-surface-2)]/35">
        <div className="mx-auto flex max-w-5xl flex-col gap-6 px-6 py-8 sm:py-9">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex max-w-sm flex-col gap-2.5">
              <BrandLogo />
              <p className="text-[15px] font-medium leading-snug tracking-tight text-[var(--color-foreground)]/88">
                La plateforme de gestion des décharges de responsabilité.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-8 sm:gap-14">
              <div className="flex flex-col gap-2">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-foreground)]/55">
                  Produit
                </p>
                <a
                  href="#comment-ca-marche"
                  className="text-sm font-medium text-[var(--color-foreground)]/75 transition-colors hover:text-[var(--color-foreground)]"
                >
                  Comment ça marche
                </a>
                <a
                  href="#tarifs"
                  className="text-sm font-medium text-[var(--color-foreground)]/75 transition-colors hover:text-[var(--color-foreground)]"
                >
                  Tarifs
                </a>
              </div>
              <div className="flex flex-col gap-2">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-foreground)]/55">
                  Légal
                </p>
                <a
                  href="mailto:contact@paova.fr"
                  className="text-sm font-medium text-[var(--color-foreground)]/75 transition-colors hover:text-[var(--color-foreground)]"
                >
                  Contact
                </a>
                <Link
                  href="/mentions-legales"
                  className="text-sm text-[var(--color-muted)] transition-colors hover:text-[var(--color-foreground)]"
                >
                  Mentions légales
                </Link>
                <Link
                  href="/confidentialite"
                  className="text-sm text-[var(--color-muted)] transition-colors hover:text-[var(--color-foreground)]"
                >
                  Confidentialité
                </Link>
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-2 border-t border-[var(--color-border)] pt-5 text-sm text-[var(--color-muted)] sm:flex-row sm:items-center sm:justify-between">
            <span>© {new Date().getFullYear()} Paova</span>
            <p className="text-[12.5px] leading-relaxed">
              Hébergé en UE · Conçu pour le RGPD
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
