-- Perpetual base software licence and separately purchased optional modules.
-- Existing school data and module activation are preserved.

alter table public.module_catalog
  add column if not exists one_time_price numeric(12,2),
  add column if not exists price_currency text not null default 'USD';
alter table public.module_catalog drop constraint if exists module_catalog_price_currency_check;
alter table public.module_catalog add constraint module_catalog_price_currency_check check (price_currency in ('USD','CDF'));

alter table public.school_modules
  add column if not exists purchased boolean not null default false,
  add column if not exists purchase_type text not null default 'addon',
  add column if not exists purchase_price numeric(12,2),
  add column if not exists purchase_currency text not null default 'USD',
  add column if not exists purchased_at timestamptz,
  add column if not exists purchased_by uuid references auth.users(id) on delete set null,
  add column if not exists purchase_note text;
alter table public.school_modules drop constraint if exists school_modules_purchase_type_check;
alter table public.school_modules add constraint school_modules_purchase_type_check check (purchase_type in ('base','addon'));
alter table public.school_modules drop constraint if exists school_modules_purchase_currency_check;
alter table public.school_modules add constraint school_modules_purchase_currency_check check (purchase_currency in ('USD','CDF'));

-- Every module that was already enabled remains included in the legacy base licence.
update public.school_modules
set purchased = true, purchase_type = 'base',
    purchased_at = coalesce(purchased_at, updated_at, now()),
    purchase_price = null
where enabled = true;

create table if not exists public.school_licenses (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null unique references public.schools(id) on delete cascade,
  license_type text not null default 'perpetual' check (license_type = 'perpetual'),
  status text not null default 'pending' check (status in ('pending','active','suspended')),
  purchase_amount numeric(12,2),
  currency text not null default 'USD' check (currency in ('USD','CDF')),
  purchased_at timestamptz,
  granted_by uuid references auth.users(id) on delete set null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.school_licenses enable row level security;

drop policy if exists "School and platform read perpetual licence" on public.school_licenses;
create policy "School and platform read perpetual licence"
  on public.school_licenses for select to authenticated
  using (school_id = public.my_school_id() or exists (
    select 1 from public.platform_admins pa
    where pa.user_id = (select auth.uid()) and pa.active = true
  ));

drop policy if exists "Platform admins manage perpetual licence" on public.school_licenses;
create policy "Platform admins manage perpetual licence"
  on public.school_licenses for all to authenticated
  using (exists (
    select 1 from public.platform_admins pa
    where pa.user_id = (select auth.uid()) and pa.active = true
  ))
  with check (exists (
    select 1 from public.platform_admins pa
    where pa.user_id = (select auth.uid()) and pa.active = true
  ));
grant select, insert, update, delete on public.school_licenses to authenticated;
grant all on public.school_licenses to service_role;

-- Existing schools receive a perpetual active licence; no school loses access.
insert into public.school_licenses(school_id, license_type, status, purchased_at, notes)
select s.id, 'perpetual', 'active', coalesce(s.created_at, now()),
       'Licence perpétuelle de transition — établissement existant'
from public.schools s
on conflict (school_id) do nothing;

-- Retain legacy rows for compatibility, but remove their expiration semantics.
update public.school_subscriptions
set status = 'active', ends_at = null, auto_renew = false, updated_at = now();

create or replace function public.initialize_school_commercial_access()
returns trigger language plpgsql security definer set search_path = public as $$
begin
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

drop trigger if exists trg_initialize_school_modules on public.schools;
create trigger trg_initialize_school_modules after insert on public.schools
for each row execute function public.initialize_school_commercial_access();
revoke all on function public.initialize_school_commercial_access() from public, anon, authenticated;
