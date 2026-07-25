-- ===========================================================================
-- Signing groups — close date + reminder tracking
-- ===========================================================================

alter table public.signing_group
  add column if not exists closes_at timestamptz;

alter table public.signing_group_member
  add column if not exists reminder_sent_at timestamptz;

comment on column public.signing_group.closes_at is
  'Optional deadline after which the group stops accepting signatures.';

comment on column public.signing_group_member.reminder_sent_at is
  'Last time a reminder email was sent for this unsigned member.';
