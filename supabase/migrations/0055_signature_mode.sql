-- Migration: Mode de signature au niveau de l'activité
-- Date: 2026-08-03
-- Description: Permet de choisir entre signature individuelle ou signature du représentant du groupe

-- 1. Ajouter signature_mode à signing_group
ALTER TABLE signing_group 
ADD COLUMN signature_mode TEXT NOT NULL DEFAULT 'individual' 
CHECK (signature_mode IN ('individual', 'group_representative'));

COMMENT ON COLUMN signing_group.signature_mode IS 
  'Mode de signature: individual (chaque participant signe) ou group_representative (un représentant signe pour tout le groupe)';

-- 2. Ajouter signature_type à submission
ALTER TABLE submission
ADD COLUMN signature_type TEXT NOT NULL DEFAULT 'participant'
CHECK (signature_type IN ('participant', 'group_representative'));

COMMENT ON COLUMN submission.signature_type IS 
  'Type de signature: participant (signature individuelle) ou group_representative (signature du représentant)';

-- 3. Ajouter champ fonction représentant (optionnel, null pour les participants)
ALTER TABLE submission
ADD COLUMN representative_role TEXT;

COMMENT ON COLUMN submission.representative_role IS 
  'Fonction du représentant (ex: Instituteur, Responsable RH, Coach). NULL pour les signatures de participants.';

-- 4. Lier le représentant au groupe directement
-- Ce champ n'est rempli QUE pour les signatures de type group_representative
ALTER TABLE submission
ADD COLUMN represented_group_id UUID REFERENCES signing_group(id) ON DELETE CASCADE;

CREATE INDEX idx_submission_represented_group_id ON submission(represented_group_id);

COMMENT ON COLUMN submission.represented_group_id IS 
  'Groupe représenté par cette signature. Utilisé uniquement pour signature_type = group_representative. NULL pour les signatures de participants.';

-- Note de rétrocompatibilité:
-- - Toutes les activités existantes ont signature_mode = 'individual' (valeur par défaut)
-- - Toutes les submissions existantes ont signature_type = 'participant' (valeur par défaut)
-- - representative_role et represented_group_id sont NULL pour toutes les données existantes
-- - Aucun changement de comportement pour les activités existantes
