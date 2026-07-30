-- ===========================================================================
-- Paova — a name on the invite, so the team list reads as people.
--
-- Active members already expose a display name through
-- business_member_directory (migration 0043), which reads auth metadata. A
-- pending invite has no auth.users row yet, so there was nothing to show but
-- the email address — and a team page that is a column of email addresses is
-- harder to scan than one of names.
--
-- Nullable: invites created before this column existed keep working, and the
-- UI falls back to the email when no name was given.
-- ===========================================================================

alter table public.business_member
  add column if not exists invited_name text;

comment on column public.business_member.invited_name is
  'Display name captured when the invite was sent. Null for older invites; the UI then falls back to invited_email.';
