-- The perpetual licence replaces the former trial status as a commercial state.
-- Keep school access status separate: only explicit suspension blocks the school.
update public.schools set status = 'active', updated_at = now() where status = 'trial';

create or replace function public.initialize_school_commercial_access()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'trial' then
    update public.schools set status = 'active', updated_at = now() where id = new.id;
  end if;

  insert into public.school_licenses(school_id, license_type, status)
  values (new.id, 'perpetual', 'pending')
  on conflict (school_id) do nothing;

  insert into public.school_modules(school_id, module_key, enabled, purchased, purchase_type, purchased_at)
  select new.id, m.module_key, m.default_enabled, m.default_enabled,
         case when m.default_enabled then 'base' else 'addon' end,
         case when m.default_enabled then now() else null end
  from public.module_catalog m
  on conflict (school_id, module_key) do nothing;
  return new;
end;
$$;
revoke all on function public.initialize_school_commercial_access() from public, anon, authenticated;
