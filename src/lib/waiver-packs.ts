/**
 * Waiver packs — UX starter kits for a single waiver engine.
 *
 * Packs are NOT separate product types or engines. They only configure:
 * who signs, for whom, recommended fields, labels, and default copy.
 * After creation, the template remains a generic editable waiver.
 */

export type SignerRole = "self" | "legal_representative";

/** Who the signature covers beyond the signer. */
export type SubjectMode = "none" | "participants" | "minors";

export type PackFieldType =
  | "text"
  | "textarea"
  | "number"
  | "tel"
  | "date"
  | "checkbox"
  | "select"
  | "participants";

export type PackField = {
  label: string;
  type: PackFieldType;
  required: boolean;
  options?: string[];
};

export type WaiverPackIntent = {
  /** Who is expected to sign. */
  signerRole: SignerRole;
  /** Whether the form collects additional people / minors. */
  subjects: SubjectMode;
};

export type WaiverPack = {
  id: string;
  /** Short label shown in the picker. */
  label: string;
  /** One-line context the user recognizes. */
  description: string;
  /**
   * primary = showcase in create/onboarding first screen
   * secondary = under “Voir plus de contextes”
   */
  visibility: "primary" | "secondary";
  /** System configuration applied when the pack is chosen. */
  intent: WaiverPackIntent;
  title: string;
  legalText: string;
  signerNameLabel?: string;
  fields: PackField[];
};

export const DEFAULT_LEGAL_TEXT =
  "Je reconnais avoir été informé(e) des risques liés à l'activité et je décharge l'établissement de toute responsabilité en cas d'accident. Je certifie l'exactitude des informations fournies et m'engage à respecter les consignes du personnel.";

/**
 * Showcase packs first (simple contexts), then secondary niches.
 * Keep primary ≤ 7 so the first screen stays scannable.
 */
export const WAIVER_PACKS: WaiverPack[] = [
  {
    id: "standard",
    label: "Décharge standard",
    description: "Cas général : le participant signe pour lui-même.",
    visibility: "primary",
    intent: { signerRole: "self", subjects: "none" },
    title: "Décharge de responsabilité",
    legalText: DEFAULT_LEGAL_TEXT,
    fields: [
      { label: "Téléphone", type: "tel", required: true },
      {
        label: "Je confirme avoir l'âge minimum requis",
        type: "checkbox",
        required: true,
      },
      {
        label: "J'accepte le règlement intérieur",
        type: "checkbox",
        required: true,
      },
    ],
  },
  {
    id: "parental",
    label: "Autorisation parentale",
    description: "Un parent ou représentant légal signe pour un ou plusieurs enfants.",
    visibility: "primary",
    intent: { signerRole: "legal_representative", subjects: "minors" },
    title: "Autorisation parentale et décharge — Activité enfant",
    legalText:
      "En tant que représentant(e) légal(e), j'autorise le(s) enfant(s) désigné(s) ci-dessous à participer à l'activité. Je reconnais avoir été informé(e) des modalités et des risques éventuels. J'accepte le règlement intérieur et je décharge l'établissement de toute responsabilité en cas d'accident, dans les limites autorisées par la loi. Je certifie l'exactitude des informations fournies.",
    signerNameLabel: "Nom du parent / responsable",
    fields: [
      { label: "Enfant(s)", type: "participants", required: true },
      { label: "Téléphone du responsable", type: "tel", required: true },
      {
        label: "Lien de parenté",
        type: "select",
        required: true,
        options: ["Père", "Mère", "Tuteur légal", "Autre représentant légal"],
      },
      {
        label: "Personne(s) autorisée(s) à récupérer l'enfant",
        type: "text",
        required: false,
      },
      {
        label: "Je certifie être le représentant légal du/des enfant(s)",
        type: "checkbox",
        required: true,
      },
      {
        label: "J'autorise l'utilisation de photos/vidéos de l'enfant",
        type: "checkbox",
        required: false,
      },
    ],
  },
  {
    id: "sport",
    label: "Activité sportive",
    description: "Salles, coachs, clubs, cours collectifs.",
    visibility: "primary",
    intent: { signerRole: "self", subjects: "none" },
    title: "Décharge de responsabilité — Activité sportive",
    legalText:
      "Je reconnais que la pratique d'une activité physique comporte des risques. Je déclare être en bonne condition physique et ne pas avoir de contre-indication médicale connue à la pratique. Je m'engage à informer immédiatement le personnel en cas de malaise ou de douleur. Je décharge l'établissement de toute responsabilité en cas d'accident ou de blessure dans les limites autorisées par la loi. Je certifie l'exactitude des informations fournies.",
    fields: [
      { label: "Téléphone", type: "tel", required: true },
      {
        label: "Contact d'urgence — nom",
        type: "text",
        required: false,
      },
      {
        label: "Contact d'urgence — téléphone",
        type: "tel",
        required: false,
      },
      {
        label: "Particularités médicales à signaler",
        type: "textarea",
        required: false,
      },
      {
        label: "Je déclare ne pas avoir de contre-indication médicale",
        type: "checkbox",
        required: true,
      },
      {
        label: "J'accepte le règlement intérieur de l'établissement",
        type: "checkbox",
        required: true,
      },
    ],
  },
  {
    id: "evenement",
    label: "Événement",
    description: "Festivals, concerts, foires, soirées, journées portes ouvertes.",
    visibility: "primary",
    intent: { signerRole: "self", subjects: "none" },
    title: "Décharge de responsabilité — Participation à un événement",
    legalText:
      "Je reconnais participer à l'événement de mon plein gré. Je m'engage à respecter le règlement du lieu, les consignes de sécurité et les instructions de l'organisation. Je déclare être en capacité d'y assister et j'accepte les éventuelles contraintes liées à l'affluence ou à l'organisation. Je décharge l'organisateur de toute responsabilité en cas d'accident résultant du non-respect de ces consignes, dans les limites autorisées par la loi. Je certifie l'exactitude des informations fournies.",
    fields: [
      { label: "Téléphone", type: "tel", required: true },
      {
        label: "Nom de l'événement / session",
        type: "text",
        required: false,
      },
      {
        label: "Je confirme avoir l'âge minimum requis",
        type: "checkbox",
        required: true,
      },
      {
        label: "J'accepte le règlement de l'événement",
        type: "checkbox",
        required: true,
      },
      {
        label:
          "J'autorise l'utilisation de photos/vidéos prises pendant l'événement",
        type: "checkbox",
        required: false,
      },
    ],
  },
  {
    id: "location",
    label: "Location de matériel",
    description: "Vélos, trottinettes, ski, matériel sportif…",
    visibility: "primary",
    intent: { signerRole: "self", subjects: "none" },
    title: "Contrat de location et décharge — Matériel",
    legalText:
      "Je reconnais prendre possession du matériel décrit en bon état de fonctionnement. Je m'engage à l'utiliser conformément à sa destination, à le restituer à la date convenue et à signaler immédiatement tout incident. Je suis responsable du matériel pendant la durée de la location. Je décharge le loueur de toute responsabilité en cas d'accident lié à une mauvaise utilisation, dans les limites autorisées par la loi.",
    fields: [
      { label: "Téléphone", type: "tel", required: true },
      {
        label: "Matériel loué / référence",
        type: "text",
        required: true,
      },
      {
        label: "Date / heure de restitution prévue",
        type: "text",
        required: false,
      },
      {
        label: "J'ai vérifié l'état du matériel à la prise en charge",
        type: "checkbox",
        required: true,
      },
      {
        label: "J'accepte les conditions de location",
        type: "checkbox",
        required: true,
      },
      {
        label: "Observations à la prise en charge",
        type: "textarea",
        required: false,
      },
    ],
  },
  {
    id: "escape",
    label: "Escape game / Loisirs",
    description: "Escape rooms, laser game, bowling, VR…",
    visibility: "primary",
    intent: { signerRole: "self", subjects: "none" },
    title: "Décharge de responsabilité — Activité de loisirs",
    legalText:
      "Je reconnais avoir pris connaissance des consignes de sécurité et du règlement intérieur. Je m'engage à les respecter ainsi que les instructions du personnel. Je déclare être en capacité de participer à l'activité. Je décharge l'établissement de toute responsabilité en cas d'accident résultant du non-respect de ces consignes. Je certifie l'exactitude des informations fournies.",
    fields: [
      { label: "Téléphone", type: "tel", required: true },
      {
        label: "Je confirme avoir l'âge minimum requis pour l'activité",
        type: "checkbox",
        required: true,
      },
      {
        label: "Contact d'urgence — nom",
        type: "text",
        required: false,
      },
      {
        label: "Contact d'urgence — téléphone",
        type: "tel",
        required: false,
      },
      {
        label: "J'accepte le règlement intérieur",
        type: "checkbox",
        required: true,
      },
      {
        label:
          "J'autorise l'utilisation de photos/vidéos prises pendant l'activité",
        type: "checkbox",
        required: false,
      },
    ],
  },
  {
    id: "association",
    label: "Association / Sortie",
    description: "Sorties, week-ends, activités associatives.",
    visibility: "primary",
    intent: { signerRole: "self", subjects: "none" },
    title: "Décharge de responsabilité — Activité associative",
    legalText:
      "Je reconnais participer à l'activité organisée par l'association en connaissance de cause. Je m'engage à respecter les consignes des organisateurs et le règlement applicable. Je déclare avoir signalé toute particularité utile à ma participation. Je décharge l'association et ses responsables de toute responsabilité en cas d'accident dans les limites autorisées par la loi. Je certifie l'exactitude des informations fournies.",
    fields: [
      { label: "Téléphone", type: "tel", required: true },
      {
        label: "Activité / sortie concernée",
        type: "text",
        required: false,
      },
      {
        label: "Contact d'urgence — nom",
        type: "text",
        required: false,
      },
      {
        label: "Contact d'urgence — téléphone",
        type: "tel",
        required: false,
      },
      {
        label: "Particularités à signaler",
        type: "textarea",
        required: false,
      },
      {
        label: "J'accepte le règlement de l'association",
        type: "checkbox",
        required: true,
      },
    ],
  },

  // —— Secondary niches (same engine, less common entry points) ——
  {
    id: "beaute",
    label: "Beauté / Tatouage",
    description: "Instituts, tatoueurs, barbiers, soins esthétiques.",
    visibility: "secondary",
    intent: { signerRole: "self", subjects: "none" },
    title: "Consentement et décharge — Prestation esthétique",
    legalText:
      "Je consens à la prestation après avoir été informé(e) de son déroulement et de ses éventuelles suites. Je certifie être majeur(e), avoir signalé toute allergie, traitement en cours ou contre-indication, et avoir fourni des informations exactes. Je décharge l'établissement de toute responsabilité en cas de réaction liée à une information non déclarée, dans les limites autorisées par la loi.",
    fields: [
      { label: "Téléphone", type: "tel", required: true },
      { label: "Date de naissance", type: "date", required: true },
      { label: "Type de prestation", type: "text", required: false },
      {
        label: "Allergies, traitements ou contre-indications",
        type: "textarea",
        required: false,
      },
      {
        label: "Je certifie être majeur(e)",
        type: "checkbox",
        required: true,
      },
      {
        label: "Je consens à la prestation telle que présentée",
        type: "checkbox",
        required: true,
      },
      {
        label: "J'autorise l'utilisation de photos avant/après (anonymisées)",
        type: "checkbox",
        required: false,
      },
    ],
  },
  {
    id: "aventure",
    label: "Sport extrême / Aventure",
    description: "Accrobranche, rafting, tyrolienne, outdoor…",
    visibility: "secondary",
    intent: { signerRole: "self", subjects: "none" },
    title: "Décharge de responsabilité — Activité à risque",
    legalText:
      "Je reconnais que cette activité présente des risques inhérents pouvant entraîner des blessures. Je déclare être physiquement apte à la pratiquer, avoir informé l'encadrement de toute particularité utile, et m'engage à suivre scrupuleusement les consignes de sécurité. Je décharge l'établissement de toute responsabilité dans les limites autorisées par la loi. Je certifie l'exactitude des informations fournies.",
    fields: [
      { label: "Téléphone", type: "tel", required: true },
      { label: "Poids (kg)", type: "number", required: false },
      {
        label: "Contact d'urgence — nom",
        type: "text",
        required: true,
      },
      {
        label: "Contact d'urgence — téléphone",
        type: "tel",
        required: true,
      },
      {
        label: "Je reconnais les risques liés à l'activité",
        type: "checkbox",
        required: true,
      },
      {
        label: "Je déclare être physiquement apte à la pratiquer",
        type: "checkbox",
        required: true,
      },
      {
        label: "J'accepte le règlement de sécurité",
        type: "checkbox",
        required: true,
      },
    ],
  },
  {
    id: "karting",
    label: "Karting / Circuit",
    description: "Karting indoor/outdoor, stages pilotage.",
    visibility: "secondary",
    intent: { signerRole: "self", subjects: "none" },
    title: "Décharge de responsabilité — Karting",
    legalText:
      "Je reconnais que la pratique du karting comporte des risques. Je m'engage à respecter le règlement du circuit, les consignes de sécurité et les instructions des commissaires. Je déclare être en capacité de conduire et ne pas être sous l'effet de substances altérant mes réflexes. Je décharge l'établissement de toute responsabilité en cas d'accident résultant du non-respect de ces règles, dans les limites autorisées par la loi.",
    fields: [
      { label: "Téléphone", type: "tel", required: true },
      {
        label: "Je confirme avoir l'âge minimum requis",
        type: "checkbox",
        required: true,
      },
      {
        label: "Expérience karting",
        type: "select",
        required: false,
        options: ["Débutant", "Intermédiaire", "Confirmé"],
      },
      {
        label: "Contact d'urgence — téléphone",
        type: "tel",
        required: false,
      },
      {
        label: "J'accepte le règlement du circuit",
        type: "checkbox",
        required: true,
      },
      {
        label: "Je ne suis pas sous l'effet d'alcool ou de stupéfiants",
        type: "checkbox",
        required: true,
      },
    ],
  },
  {
    id: "aquatique",
    label: "Piscine / Centre aquatique",
    description: "Piscines, spa, centres aqualudiques.",
    visibility: "secondary",
    intent: { signerRole: "self", subjects: "none" },
    title: "Décharge et engagement — Activité aquatique",
    legalText:
      "Je reconnais avoir pris connaissance du règlement de l'établissement et des consignes de sécurité en milieu aquatique. Je déclare savoir nager si l'activité l'exige, ou avoir signalé mon niveau. Je m'engage à respecter les zones et horaires indiqués. Je décharge l'établissement de toute responsabilité en cas d'accident lié au non-respect du règlement, dans les limites autorisées par la loi.",
    fields: [
      { label: "Téléphone", type: "tel", required: true },
      {
        label: "Niveau de natation",
        type: "select",
        required: false,
        options: ["Débutant", "Intermédiaire", "Bon nageur"],
      },
      {
        label: "Je sais nager / je respecte les zones adaptées à mon niveau",
        type: "checkbox",
        required: true,
      },
      {
        label: "J'accepte le règlement de l'établissement",
        type: "checkbox",
        required: true,
      },
      {
        label: "Particularités médicales à signaler",
        type: "textarea",
        required: false,
      },
    ],
  },
  {
    id: "escalade",
    label: "Escalade / Bloc",
    description: "Salles d'escalade, blocs, voies.",
    visibility: "secondary",
    intent: { signerRole: "self", subjects: "none" },
    title: "Décharge de responsabilité — Pratique de l'escalade",
    legalText:
      "Je reconnais que l'escalade comporte des risques de chute et de blessure. Je déclare connaître les règles de sécurité de la salle (assurage, chute contrôlée, matériel) et m'engage à les respecter. Je confirme être en capacité physique de pratiquer. Je décharge l'établissement de toute responsabilité en cas d'accident résultant d'une mauvaise pratique ou du non-respect des consignes, dans les limites autorisées par la loi.",
    fields: [
      { label: "Téléphone", type: "tel", required: true },
      {
        label: "Niveau",
        type: "select",
        required: false,
        options: ["Débutant", "Intermédiaire", "Confirmé"],
      },
      {
        label: "Je pratique en autonomie / j'ai reçu les consignes",
        type: "checkbox",
        required: true,
      },
      {
        label: "Je reconnais les risques liés à l'escalade",
        type: "checkbox",
        required: true,
      },
      {
        label: "J'accepte le règlement de la salle",
        type: "checkbox",
        required: true,
      },
      {
        label: "Particularités médicales à signaler",
        type: "textarea",
        required: false,
      },
    ],
  },
  {
    id: "paintball",
    label: "Paintball / Airsoft",
    description: "Paintball, airsoft, softair.",
    visibility: "secondary",
    intent: { signerRole: "self", subjects: "none" },
    title: "Décharge de responsabilité — Paintball / Airsoft",
    legalText:
      "Je reconnais que cette activité comporte des risques de impacts et de blessures. Je m'engage à porter les protections fournies, à respecter les zones de jeu et les consignes des arbitres. Je déclare ne pas être sous l'effet de substances altérant mes réflexes. Je décharge l'établissement de toute responsabilité en cas d'accident lié au non-respect des règles, dans les limites autorisées par la loi.",
    fields: [
      { label: "Téléphone", type: "tel", required: true },
      {
        label: "Je confirme avoir l'âge minimum requis",
        type: "checkbox",
        required: true,
      },
      {
        label: "Contact d'urgence — téléphone",
        type: "tel",
        required: false,
      },
      {
        label: "Je porterai les protections obligatoires",
        type: "checkbox",
        required: true,
      },
      {
        label: "J'accepte le règlement de jeu",
        type: "checkbox",
        required: true,
      },
      {
        label: "Je ne suis pas sous l'effet d'alcool ou de stupéfiants",
        type: "checkbox",
        required: true,
      },
    ],
  },
  {
    id: "trampoline",
    label: "Trampoline / Parc indoor",
    description: "Trampoline parks, soft play, parcs couverts.",
    visibility: "secondary",
    intent: { signerRole: "self", subjects: "participants" },
    title: "Décharge de responsabilité — Parc de loisirs indoor",
    legalText:
      "Je reconnais que les activités du parc (trampoline, structures, jeux) comportent des risques de chute ou de collision. Je m'engage à respecter le règlement, les zones adaptées à mon âge et les consignes du personnel. Je déclare être en capacité d'y participer. Je décharge l'établissement de toute responsabilité en cas d'accident résultant du non-respect des consignes, dans les limites autorisées par la loi.",
    fields: [
      { label: "Téléphone", type: "tel", required: true },
      {
        label: "Je confirme avoir l'âge / la taille minimum requis",
        type: "checkbox",
        required: true,
      },
      {
        label: "Participants accompagnés",
        type: "participants",
        required: false,
      },
      {
        label: "J'accepte le règlement du parc",
        type: "checkbox",
        required: true,
      },
      {
        label: "J'autorise l'utilisation de photos/vidéos prises sur site",
        type: "checkbox",
        required: false,
      },
    ],
  },
  {
    id: "stage",
    label: "Stage / Atelier",
    description: "Formations, workshops, stages découverte.",
    visibility: "secondary",
    intent: { signerRole: "self", subjects: "none" },
    title: "Décharge et engagement — Stage / Atelier",
    legalText:
      "Je reconnais m'inscrire au stage ou à l'atelier en connaissance de son déroulement. Je m'engage à respecter les consignes de l'encadrant, le matériel mis à disposition et le règlement du lieu. Je déclare avoir signalé toute particularité utile. Je décharge l'organisateur de toute responsabilité en cas d'accident lié au non-respect des consignes, dans les limites autorisées par la loi. Je certifie l'exactitude des informations fournies.",
    fields: [
      { label: "Téléphone", type: "tel", required: true },
      {
        label: "Intitulé du stage / atelier",
        type: "text",
        required: false,
      },
      { label: "Dates concernées", type: "text", required: false },
      {
        label: "Particularités à signaler",
        type: "textarea",
        required: false,
      },
      {
        label: "J'accepte le règlement du stage",
        type: "checkbox",
        required: true,
      },
      {
        label: "J'autorise l'utilisation de photos/vidéos pendant le stage",
        type: "checkbox",
        required: false,
      },
    ],
  },
  {
    id: "equitation",
    label: "Équitation",
    description: "Centres équestres, poneys, balades à cheval.",
    visibility: "secondary",
    intent: { signerRole: "self", subjects: "none" },
    title: "Décharge de responsabilité — Activité équestre",
    legalText:
      "Je reconnais que la pratique de l'équitation comporte des risques inhérents liés au comportement des équidés. Je déclare avoir informé l'encadrement de mon niveau et de toute particularité utile. Je m'engage à respecter les consignes de sécurité et le règlement du centre. Je décharge l'établissement de toute responsabilité dans les limites autorisées par la loi. Je certifie l'exactitude des informations fournies.",
    fields: [
      { label: "Téléphone", type: "tel", required: true },
      {
        label: "Niveau équestre",
        type: "select",
        required: false,
        options: ["Débutant", "Galop 1-2", "Galop 3+", "Confirmé"],
      },
      { label: "Poids (kg)", type: "number", required: false },
      {
        label: "Contact d'urgence — téléphone",
        type: "tel",
        required: true,
      },
      {
        label: "Je reconnais les risques liés à l'équitation",
        type: "checkbox",
        required: true,
      },
      {
        label: "J'accepte le règlement du centre",
        type: "checkbox",
        required: true,
      },
    ],
  },
];

/** Legacy id used by older onboarding / audit payloads. */
const PACK_ID_ALIASES: Record<string, string> = {
  enfant: "parental",
};

export function getPackById(id: string): WaiverPack | undefined {
  const resolved = PACK_ID_ALIASES[id] ?? id;
  return WAIVER_PACKS.find((pack) => pack.id === resolved);
}

/** Persist only known pack ids; ignore tampered / unknown values. */
export function resolveStarterPackId(
  raw: string | null | undefined,
): string | null {
  if (!raw) return null;
  const pack = getPackById(raw.trim());
  return pack?.id ?? null;
}

export function getPrimaryPacks(): WaiverPack[] {
  return WAIVER_PACKS.filter((pack) => pack.visibility === "primary");
}

export function getSecondaryPacks(): WaiverPack[] {
  return WAIVER_PACKS.filter((pack) => pack.visibility === "secondary");
}

/** Fields + copy applied when a pack is chosen (engine input). */
export function packToFormSeed(pack: WaiverPack) {
  return {
    title: pack.title,
    legalText: pack.legalText,
    signerNameLabel: pack.signerNameLabel ?? "",
    fields: pack.fields.map((field) => ({ ...field })),
    intent: pack.intent,
  };
}

/** Blank create state when no pack is chosen (same engine, empty seed). */
export function emptyFormSeed() {
  return {
    title: "",
    legalText: DEFAULT_LEGAL_TEXT,
    signerNameLabel: "",
    fields: [] as PackField[],
    intent: {
      signerRole: "self" as const,
      subjects: "none" as const,
    },
  };
}

/** Short user-facing sentence explaining what the pack configures. */
export function describePackIntent(pack: WaiverPack): string {
  const who =
    pack.intent.signerRole === "legal_representative"
      ? "Un parent ou représentant légal signe"
      : "Le participant signe pour lui-même";

  if (pack.intent.subjects === "minors") {
    return `${who} pour un ou plusieurs enfants.`;
  }
  if (pack.intent.subjects === "participants") {
    return `${who} et peut ajouter des accompagnants.`;
  }
  return `${who}.`;
}

type IntentFieldHint = {
  type: string;
  label?: string;
};

/**
 * Soft inference from template content until pack_id is persisted.
 * Same engine — only labels / framing change on the public form.
 */
export function inferTemplateIntent(input: {
  fields: IntentFieldHint[];
  signerNameLabel?: string | null;
}): WaiverPackIntent {
  const hasParticipants = input.fields.some(
    (field) => field.type === "participants",
  );
  const label = (input.signerNameLabel ?? "").trim().toLowerCase();
  const looksParental =
    label.length > 0 &&
    /parent|responsable|tuteur|légal|legal|représentant|representant|enfant/.test(
      label,
    );

  // Participants field labeled like children → minors framing.
  const participantsLookLikeMinors = input.fields.some((field) => {
    if (field.type !== "participants") return false;
    const fieldLabel = (field.label ?? "").toLowerCase();
    return /enfant|mineur|élève|eleve/.test(fieldLabel);
  });

  if (looksParental || participantsLookLikeMinors) {
    return {
      signerRole: "legal_representative",
      subjects: hasParticipants ? "minors" : "none",
    };
  }
  if (hasParticipants) {
    return { signerRole: "self", subjects: "participants" };
  }
  return { signerRole: "self", subjects: "none" };
}

/**
 * Prefer persisted pack intent when available; otherwise infer from content.
 */
export function resolveTemplateIntent(input: {
  starterPackId?: string | null;
  fields: IntentFieldHint[];
  signerNameLabel?: string | null;
}): WaiverPackIntent {
  const pack = input.starterPackId
    ? getPackById(input.starterPackId)
    : undefined;
  if (pack) return pack.intent;
  return inferTemplateIntent({
    fields: input.fields,
    signerNameLabel: input.signerNameLabel,
  });
}

/** Public-form fallback when the template has no custom signer label. */
export function defaultSignerNameLabel(intent: WaiverPackIntent): string {
  return intent.signerRole === "legal_representative"
    ? "Nom du parent / responsable"
    : "Nom complet";
}

/**
 * Resolve the label shown above the signer name field.
 * Never fall back to parental wording for self-signing adults.
 */
export function resolveSignerNameLabel(input: {
  signerNameLabel?: string | null;
  intent: WaiverPackIntent;
}): string {
  const custom = (input.signerNameLabel ?? "").trim();
  if (!custom) return defaultSignerNameLabel(input.intent);

  // Stale parental label on an adult template — prefer the adult wording.
  if (
    input.intent.signerRole === "self" &&
    /parent|tuteur|légal|legal|représentant|representant/.test(
      custom.toLowerCase(),
    )
  ) {
    return defaultSignerNameLabel(input.intent);
  }

  return custom;
}
