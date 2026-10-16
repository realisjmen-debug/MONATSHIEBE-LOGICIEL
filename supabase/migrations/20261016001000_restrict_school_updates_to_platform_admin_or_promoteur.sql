-- Restrict school settings updates to platform admins and the existing promoteur policy.
-- The previous permissive policy allowed any authenticated user assigned to the school
-- to update the schools row directly, bypassing the application UI.

drop policy if exists "platform manage schools" on public.schools;

create policy "platform manage schools"
on public.schools
for update
to authenticated
using (
  exists (
    select 1
    from public.platform_admins pa
    where pa.user_id = auth.uid()
      and pa.active = true
  )
)
with check (
  exists (
    select 1
    from public.platform_admins pa
    where pa.user_id = auth.uid()
      and pa.active = true
  )
);
