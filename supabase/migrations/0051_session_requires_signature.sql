-- PAOVA Product Evolution Phase 1: Session-Centric Model
-- Add requires_signature field to signing_group table
-- This field separates two orthogonal concepts:
--   1. Which template to use (template_id)
--   2. Whether signatures are enabled (requires_signature)
--
-- By default, requires_signature = TRUE to preserve existing behavior.
-- All current sessions use signatures, so this migration is fully backward compatible.

-- Add requires_signature field
ALTER TABLE signing_group
ADD COLUMN IF NOT EXISTS requires_signature BOOLEAN NOT NULL DEFAULT true;

-- Add comment explaining the field
COMMENT ON COLUMN signing_group.requires_signature IS 'Whether this session requires participant signatures. When false, the session is signature-free. When true, template_id must be set.';

-- Add check constraint: if requires_signature is true, template_id must be set
ALTER TABLE signing_group
ADD CONSTRAINT chk_signing_group_requires_signature
CHECK (
  (requires_signature = false) OR 
  (requires_signature = true AND template_id IS NOT NULL)
);

-- Add index for querying signature-enabled sessions
CREATE INDEX IF NOT EXISTS idx_signing_group_requires_signature 
ON signing_group(requires_signature) 
WHERE archived_at IS NULL;

-- Backfill: all existing sessions have template_id set, so requires_signature = true
-- This UPDATE is technically redundant (DEFAULT true handles it), but we include it
-- for clarity and auditability.
UPDATE signing_group 
SET requires_signature = true 
WHERE requires_signature IS NULL;
