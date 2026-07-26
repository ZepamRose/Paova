-- ===========================================================================
-- Paova — make ownership transfer possible.
--
-- The hierarchy trigger (0034) refuses to promote anyone to owner
-- ("transfer must demote the current owner first") AND refuses to demote the
-- current owner unless another owner row already exists. The unique index
-- `business_member_one_owner_uidx` guarantees a second owner can never exist,
-- so both doors are locked against each other: no transfer path exists at all.
--
-- For a B2B product this is not an edge case — an owner leaving, losing their
-- mailbox, or selling the business is routine, and today the only remedy is
-- manual SQL in production.
--
-- Fix: one SECURITY DEFINER procedure performing demote + promote inside a
-- single transaction, callable only by the current owner. The trigger keeps
-- guarding every ordinary write and simply learns to recognise this one
-- sanctioned path via a transaction-local flag.
-- ===========================================================================

create or replace function public.transfer_business_ownership(
  p_business_id uuid,
  p_new_owner_member_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := auth.uid();
  v_current_owner_member_id uuid;
  v_target_user_id uuid;
  v_target_status text;
begin
  if v_actor is null then
    raise exception 'Authentication required'
      using errcode = 'insufficient_privilege';
  end if;

  select bm.id
    into v_current_owner_member_id
  from public.business_member bm
  where bm.business_id = p_business_id
    and bm.user_id = v_actor
    and bm.role = 'owner'
    and bm.status = 'active';

  if v_current_owner_member_id is null then
    raise exception 'Only the current owner can transfer ownership'
      using errcode = 'insufficient_privilege';
  end if;

  if v_current_owner_member_id = p_new_owner_member_id then
    raise exception 'Already the owner'
      using errcode = 'invalid_parameter_value';
  end if;

  select bm.user_id, bm.status
    into v_target_user_id, v_target_status
  from public.business_member bm
  where bm.id = p_new_owner_member_id
    and bm.business_id = p_business_id;

  if v_target_user_id is null then
    raise exception 'Target member not found in this business'
      using errcode = 'invalid_parameter_value';
  end if;

  if v_target_status <> 'active' then
    raise exception 'Target member must be active to become owner'
      using errcode = 'invalid_parameter_value';
  end if;

  perform set_config('paova.ownership_transfer', 'on', true);

  update public.business_member
  set role = 'admin'
  where id = v_current_owner_member_id;

  update public.business_member
  set role = 'owner'
  where id = p_new_owner_member_id;

  update public.business
  set owner_id = v_target_user_id
  where id = p_business_id;

  perform set_config('paova.ownership_transfer', 'off', true);
end;
$$;

-- Teach the hierarchy trigger about the sanctioned transfer path.
create or replace function public.business_member_enforce_hierarchy()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_role text;
  v_business_id uuid;
begin
  -- Service role / postgres: auth.uid() is null and RLS is bypassed.
  if auth.uid() is null then
    return coalesce(NEW, OLD);
  end if;

  -- Sanctioned ownership transfer (transfer_business_ownership) — that
  -- function already verified the caller is the active owner.
  if coalesce(current_setting('paova.ownership_transfer', true), 'off') = 'on' then
    return coalesce(NEW, OLD);
  end if;

  v_business_id := coalesce(NEW.business_id, OLD.business_id);

  if TG_OP = 'UPDATE'
     and OLD.user_id is null
     and OLD.status = 'invited'
     and NEW.user_id = auth.uid()
     and NEW.status = 'active'
     and NEW.role is not distinct from OLD.role
     and NEW.business_id is not distinct from OLD.business_id then
    return NEW;
  end if;

  if TG_OP = 'INSERT'
     and NEW.role = 'owner'
     and NEW.user_id = auth.uid()
     and exists (
       select 1 from public.business b
       where b.id = NEW.business_id and b.owner_id = auth.uid()
     )
     and not exists (
       select 1 from public.business_member bm
       where bm.business_id = NEW.business_id and bm.role = 'owner'
     ) then
    return NEW;
  end if;

  select bm.role
    into v_actor_role
  from public.business_member bm
  where bm.user_id = auth.uid()
    and bm.business_id = v_business_id
    and bm.status = 'active'
  limit 1;

  if v_actor_role is null then
    raise exception 'Not an active member of this business'
      using errcode = 'insufficient_privilege';
  end if;

  if TG_OP = 'INSERT' then
    if NEW.role = 'owner' then
      raise exception 'Cannot insert an additional owner'
        using errcode = 'insufficient_privilege';
    end if;

    if v_actor_role = 'owner' then
      if NEW.role not in ('admin', 'employee') then
        raise exception 'Owner can only invite admin or employee'
          using errcode = 'insufficient_privilege';
      end if;
      return NEW;
    end if;

    if v_actor_role = 'admin' then
      if NEW.role <> 'employee' then
        raise exception 'Admin can only invite employees'
          using errcode = 'insufficient_privilege';
      end if;
      return NEW;
    end if;

    raise exception 'Insufficient privilege to insert members'
      using errcode = 'insufficient_privilege';
  end if;

  if TG_OP = 'UPDATE' then
    if v_actor_role = 'owner' then
      -- Direct promotion/demotion of the owner seat is still refused here:
      -- use transfer_business_ownership, which moves both sides atomically.
      if NEW.role = 'owner' and OLD.role is distinct from 'owner' then
        raise exception 'Use transfer_business_ownership to move the owner seat'
          using errcode = 'insufficient_privilege';
      end if;
      if OLD.role = 'owner' and NEW.role is distinct from 'owner' then
        raise exception 'Use transfer_business_ownership to move the owner seat'
          using errcode = 'insufficient_privilege';
      end if;
      return NEW;
    end if;

    if v_actor_role = 'admin' then
      if OLD.role in ('owner', 'admin') then
        raise exception 'Admin cannot modify owners or other admins'
          using errcode = 'insufficient_privilege';
      end if;
      if NEW.role is distinct from 'employee' then
        raise exception 'Admin cannot change roles to admin or owner'
          using errcode = 'insufficient_privilege';
      end if;
      if NEW.business_id is distinct from OLD.business_id then
        raise exception 'Cannot move members across businesses'
          using errcode = 'insufficient_privilege';
      end if;
      return NEW;
    end if;

    raise exception 'Insufficient privilege to update members'
      using errcode = 'insufficient_privilege';
  end if;

  if TG_OP = 'DELETE' then
    if v_actor_role = 'owner' then
      if OLD.role = 'owner' then
        raise exception 'Cannot delete the owner membership'
          using errcode = 'insufficient_privilege';
      end if;
      return OLD;
    end if;

    if v_actor_role = 'admin' then
      if OLD.role <> 'employee' then
        raise exception 'Admin can only remove employees'
          using errcode = 'insufficient_privilege';
      end if;
      return OLD;
    end if;

    raise exception 'Insufficient privilege to delete members'
      using errcode = 'insufficient_privilege';
  end if;

  return coalesce(NEW, OLD);
end;
$$;
