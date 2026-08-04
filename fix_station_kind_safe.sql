-- Step 1: Check what kind values currently exist
SELECT DISTINCT kind FROM signing_group;

-- Step 2: Drop the old constraint
ALTER TABLE signing_group 
DROP CONSTRAINT IF EXISTS signing_group_kind_check;

-- Step 3: Add new constraint including ALL existing values plus "station"
-- Adjust this list based on what Step 1 returns
ALTER TABLE signing_group 
ADD CONSTRAINT signing_group_kind_check 
CHECK (kind IN ('session', 'express', 'station', 'roster', 'free'));
