-- Fix signing_group_kind_check constraint to allow "station" value

-- First, check the current constraint
SELECT conname, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conname = 'signing_group_kind_check';

-- Drop the old constraint
ALTER TABLE signing_group 
DROP CONSTRAINT IF EXISTS signing_group_kind_check;

-- Add the new constraint with "station" included
ALTER TABLE signing_group 
ADD CONSTRAINT signing_group_kind_check 
CHECK (kind IN ('session', 'express', 'station'));
