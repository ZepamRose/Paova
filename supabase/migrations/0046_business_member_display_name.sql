-- ===========================================================================
-- Paova — an editable display name, scoped to the business.
--
-- Two sources of a name existed and neither could be corrected from the app:
--   * pending invites carried invited_name (migration 0045),
--   * active members got theirs from auth metadata, which belongs to the
--     person, not to this business, and which the app has no right to rewrite.
--
-- display_name replaces both as the thing the team page shows and an owner or
-- administrator can edit. Auth metadata stays the fallback for members who
-- never had one set, so nothing disappears from the list on the day this runs.
--
-- Written to survive being applied before or after 0045: the backfill only
-- runs if invited_name is actually there.
-- ===========================================================================

alter table public.business_member
  add column if not exists display_name text;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'business_member'
      and column_name = 'invited_name'
  ) then
    execute
      'update public.business_member
          set display_name = invited_name
        where display_name is null
          and invited_name is not null';
  end if;
end
$$;

comment on column public.business_member.display_name is
  'Name shown for this member inside this business. Editable by owners and admins. Falls back to auth metadata, then to the invited email.';
