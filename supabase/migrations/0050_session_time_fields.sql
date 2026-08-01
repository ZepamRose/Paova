-- PAOVA V2 Phase 2: Session Time Fields
-- Add start_time, end_time, duration to signing_group table

-- Add time fields to signing_group
ALTER TABLE signing_group
ADD COLUMN IF NOT EXISTS start_time timestamptz,
ADD COLUMN IF NOT EXISTS end_time timestamptz,
ADD COLUMN IF NOT EXISTS duration_minutes integer;

-- Add comment explaining the fields
COMMENT ON COLUMN signing_group.start_time IS 'Session start time (when the session actually begins)';
COMMENT ON COLUMN signing_group.end_time IS 'Session end time (when the session actually ends)';
COMMENT ON COLUMN signing_group.duration_minutes IS 'Planned duration of the session in minutes';

-- Add index for querying sessions by start_time
CREATE INDEX IF NOT EXISTS idx_signing_group_start_time ON signing_group(start_time) WHERE archived_at IS NULL;

-- Add check constraint: end_time must be after start_time if both are set
ALTER TABLE signing_group
ADD CONSTRAINT chk_signing_group_time_order
CHECK (
  (start_time IS NULL OR end_time IS NULL) OR
  (end_time > start_time)
);

-- Add check constraint: duration must be positive
ALTER TABLE signing_group
ADD CONSTRAINT chk_signing_group_duration_positive
CHECK (duration_minutes IS NULL OR duration_minutes > 0);
