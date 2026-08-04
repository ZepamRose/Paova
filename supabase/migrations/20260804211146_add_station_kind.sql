-- Migration: Ajouter le type "station" pour les QR permanents
-- Date: 2026-08-04 21:11:46
-- Description: Ajoute "station" aux valeurs autorisées de signing_group.kind
--              pour supporter les points de signature permanents avec interface kiosque
-- Note: Cette migration a été créée et appliquée via Supabase Dashboard

-- Contexte métier:
-- - roster: session avec liste de participants pré-établie
-- - express: session walk-in sans liste (signature immédiate)
-- - station: QR permanent avec interface kiosque dédiée, statistiques temps réel,
--            et affichage continu pour collecte de signatures en continu

-- Modification de la contrainte kind pour inclure "station"
ALTER TABLE signing_group
  DROP CONSTRAINT IF EXISTS signing_group_kind_check;

ALTER TABLE signing_group
  ADD CONSTRAINT signing_group_kind_check
  CHECK (kind IN ('roster', 'express', 'station'));

COMMENT ON COLUMN signing_group.kind IS 
  'Type d''activité: roster (liste préétablie), express (walk-in sans liste), station (QR permanent avec interface kiosque)';
