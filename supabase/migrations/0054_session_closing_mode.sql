-- Session closing mode
-- Replaces the implicit "duration only" closing logic with an explicit,
-- extensible closing strategy per session.

ALTER TABLE public.signing_group
  ADD COLUMN IF NOT EXISTS closing_mode text NOT NULL DEFAULT 'manual'
    CONSTRAINT chk_signing_group_closing_mode
    CHECK (closing_mode IN ('duration', 'business_close', 'fixed_time', 'manual')),
  ADD COLUMN IF NOT EXISTS closed_at timestamptz;

COMMENT ON COLUMN public.signing_group.closing_mode IS
  'Session closing strategy:
   duration       – auto-close after duration_minutes from start_time.
   business_close – auto-close at the business closing hour of the session day.
   fixed_time     – auto-close at a specific end_time set by the user.
   manual         – remain open until explicitly closed by a staff member.';

COMMENT ON COLUMN public.signing_group.closed_at IS
  'Actual timestamp when the session was closed (manual or automatic).
   Distinct from end_time (planned end) — enables real duration analytics.
   NULL means the session is still open or was never formally closed.';

-- Index for querying recently closed sessions
CREATE INDEX IF NOT EXISTS idx_signing_group_closed_at
  ON public.signing_group (closed_at DESC)
  WHERE closed_at IS NOT NULL;
