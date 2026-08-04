-- Get the exact definition of the signing_group_kind_check constraint
SELECT 
    conname AS constraint_name,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint 
WHERE conname = 'signing_group_kind_check'
  AND conrelid = 'signing_group'::regclass;

-- Get all distinct kind values currently in the table
SELECT DISTINCT kind, COUNT(*) as count
FROM signing_group
GROUP BY kind
ORDER BY kind;

-- Get a sample of each kind to understand their purpose
SELECT kind, name, requires_signature, signature_mode, created_at
FROM signing_group
ORDER BY kind, created_at DESC
LIMIT 20;
