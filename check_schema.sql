-- Check signing_group columns
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'signing_group'
AND column_name IN ('signature_mode', 'closing_mode', 'start_time', 'end_time', 'duration_minutes')
ORDER BY column_name;
