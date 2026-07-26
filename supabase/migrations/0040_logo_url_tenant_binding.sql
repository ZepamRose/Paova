-- ===========================================================================
-- Paova — bind logo_url to the business that owns it.
--
-- 0034 added a CHECK that logo_url must look like a Storage public URL under
-- /logos/{uuid}/, which closed the SSRF and javascript: vectors. But it never
-- verified that {uuid} is the business's OWN id, so a tenant could point
-- logo_url at another tenant's folder and display their logo — on public
-- signing pages and inside signed PDFs. Cheap impersonation.
--
-- A CHECK constraint cannot reference another column's row context reliably
-- across updates, so the binding is enforced in a BEFORE trigger.
-- ===========================================================================

-- Repoint any row already borrowing someone else's folder.
update public.business b
set logo_url = null
where b.logo_url is not null
  and b.logo_url !~* (
    '^https?://[^[:space:]]+/storage/v1/object/public/logos/' || b.id::text || '/'
  );

create or replace function public.business_logo_url_must_match_tenant()
returns trigger
language plpgsql
as $$
begin
  if NEW.logo_url is null then
    return NEW;
  end if;

  -- The path segment after /logos/ must be this business's own id.
  if NEW.logo_url !~* (
    '^https?://[^[:space:]]+/storage/v1/object/public/logos/' || NEW.id::text || '/'
  ) then
    raise exception 'logo_url must point at this business own logos folder'
      using errcode = 'check_violation';
  end if;

  return NEW;
end;
$$;

comment on function public.business_logo_url_must_match_tenant() is
  'Rejects a logo_url whose Storage folder belongs to another business.';

drop trigger if exists business_logo_url_tenant_check on public.business;
create trigger business_logo_url_tenant_check
  before insert or update of logo_url on public.business
  for each row execute function public.business_logo_url_must_match_tenant();
