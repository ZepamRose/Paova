-- PAOVA Product Evolution: Make template_id nullable
-- Sessions without signatures do not require a template

-- Remove the NOT NULL constraint from template_id
ALTER TABLE signing_group
ALTER COLUMN template_id DROP NOT NULL;

-- Update the check constraint to allow NULL template_id when requires_signature is false
-- (The existing constraint already handles this correctly)

COMMENT ON COLUMN signing_group.template_id IS 'Waiver template used for this session. NULL when requires_signature is false.';
