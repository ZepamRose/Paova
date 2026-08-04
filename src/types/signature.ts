/**
 * Mode de signature d'une activité
 */
export type SignatureMode = 'individual' | 'group_representative';

/**
 * Type de signature dans une submission
 */
export type SignatureType = 'participant' | 'group_representative';

/**
 * Labels lisibles pour les modes de signature
 */
export const SIGNATURE_MODE_LABELS: Record<SignatureMode, string> = {
  individual: 'Chaque participant',
  group_representative: 'Un représentant du groupe',
};

/**
 * Descriptions pour les modes de signature
 */
export const SIGNATURE_MODE_DESCRIPTIONS: Record<SignatureMode, string> = {
  individual: 'Chaque participant (ou son représentant légal) signe individuellement.',
  group_representative: 'Une seule personne signe pour l\'ensemble du groupe (instituteur, responsable RH, coach, guide, accompagnateur, etc.).',
};

/**
 * Icônes pour les modes de signature
 */
export const SIGNATURE_MODE_ICONS: Record<SignatureMode, string> = {
  individual: '👤',
  group_representative: '👥',
};
