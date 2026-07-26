-- Allow temporarily disabling team members without deleting them.
alter table public.business_member
  drop constraint if exists business_member_status_check;

alter table public.business_member
  add constraint business_member_status_check
  check (status in ('invited', 'active', 'disabled'));

comment on column public.business_member.status is
  'invited | active | disabled — disabled members keep the row but cannot access the business.';
