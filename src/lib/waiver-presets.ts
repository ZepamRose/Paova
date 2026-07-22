export type PresetFieldType =
  | "text"
  | "textarea"
  | "number"
  | "tel"
  | "date"
  | "checkbox"
  | "select"
  | "participants";

export type PresetField = {
  label: string;
  type: PresetFieldType;
  required: boolean;
  options?: string[];
};

export type WaiverPreset = {
  id: string;
  label: string;
  description: string;
  title: string;
  legalText: string;
  signerNameLabel?: string;
  fields: PresetField[];
};

export const DEFAULT_LEGAL_TEXT =
  "Je reconnais avoir été informé(e) des risques liés à l'activité et je décharge l'établissement de toute responsabilité en cas d'accident. Je certifie l'exactitude des informations fournies et m'engage à respecter les consignes du personnel.";

export const WAIVER_PRESETS: WaiverPreset[] = [
  {
    id: "escape",
    label: "Escape game / Loisirs",
    description: "Escape rooms, laser game, bowling, VR…",
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
    id: "sport",
    label: "Salle de sport / Coaching",
    description: "Salles, coachs sportifs, cours collectifs.",
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
    id: "enfant",
    label: "Activité enfants",
    description: "Autorisation parentale, plusieurs enfants possibles.",
    title: "Autorisation parentale et décharge — Activité enfant",
    legalText:
      "En tant que représentant(e) légal(e), j'autorise le(s) enfant(s) désigné(s) ci-dessous à participer à l'activité. Je reconnais avoir été informé(e) des modalités et des risques éventuels. J'accepte le règlement intérieur et je décharge l'établissement de toute responsabilité en cas d'accident, dans les limites autorisées par la loi. Je certifie l'exactitude des informations fournies.",
    signerNameLabel: "Nom du parent / responsable",
    fields: [
      { label: "Enfant(s)", type: "participants", required: true },
      { label: "Téléphone du responsable", type: "tel", required: true },
      {
        label: "Personne(s) autorisée(s) à récupérer l'enfant",
        type: "text",
        required: false,
      },
      {
        label: "Allergies ou particularités à connaître",
        type: "textarea",
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
    id: "beaute",
    label: "Beauté / Tatouage",
    description: "Instituts, tatoueurs, barbiers, soins esthétiques.",
    title: "Consentement et décharge — Prestation esthétique",
    legalText:
      "Je consens à la prestation après avoir été informé(e) de son déroulement et de ses éventuelles suites. Je certifie être majeur(e), avoir signalé toute allergie, traitement en cours ou contre-indication, et avoir fourni des informations exactes. Je décharge l'établissement de toute responsabilité en cas de réaction liée à une information non déclarée, dans les limites autorisées par la loi.",
    fields: [
      { label: "Téléphone", type: "tel", required: true },
      { label: "Date de naissance", type: "date", required: true },
      {
        label: "Type de prestation",
        type: "text",
        required: false,
      },
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
    title: "Décharge de responsabilité — Activité à risque",
    legalText:
      "Je reconnais que cette activité présente des risques inhérents pouvant entraîner des blessures. Je déclare être physiquement apte à la pratiquer, avoir informé l'encadrement de toute particularité utile, et m'engage à suivre scrupuleusement les consignes de sécurité. Je décharge l'établissement de toute responsabilité dans les limites autorisées par la loi. Je certifie l'exactitude des informations fournies.",
    fields: [
      { label: "Téléphone", type: "tel", required: true },
      {
        label: "Poids (kg)",
        type: "number",
        required: false,
      },
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
    id: "location",
    label: "Location de matériel",
    description: "Vélos, trottinettes, ski, matériel sportif…",
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
];

export function getPresetById(id: string): WaiverPreset | undefined {
  return WAIVER_PRESETS.find((p) => p.id === id);
}
