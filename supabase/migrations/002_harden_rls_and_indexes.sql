-- =============================================================
-- 002 — Hardening RLS, view security, indici FK
-- =============================================================
-- Risolve gli advisor Supabase:
--   - ERROR security_definer_view  → set security_invoker=true
--   - WARN  auth_rls_initplan       → wrap auth.uid() in (select auth.uid())
--   - INFO  unindexed_foreign_keys  → create index
-- =============================================================

-- 1) v_client_progress: SECURITY DEFINER → INVOKER
alter view public.v_client_progress set (security_invoker = true);

-- 2) Rifacciamo le policy con (select auth.uid()) + consolidamento

-- --- profiles
drop policy if exists profiles_self_select on public.profiles;
drop policy if exists profiles_self_update on public.profiles;
drop policy if exists profiles_admin_all  on public.profiles;

create policy profiles_select_own_or_admin on public.profiles
  for select to authenticated
  using (id = (select auth.uid()) or public.is_admin());

create policy profiles_update_own_or_admin on public.profiles
  for update to authenticated
  using (id = (select auth.uid()) or public.is_admin())
  with check (id = (select auth.uid()) or public.is_admin());

create policy profiles_admin_insert on public.profiles
  for insert to authenticated
  with check (public.is_admin());

create policy profiles_admin_delete on public.profiles
  for delete to authenticated
  using (public.is_admin());

-- --- modules
drop policy if exists modules_read_all      on public.modules;
drop policy if exists modules_admin_write   on public.modules;

create policy modules_select_authenticated on public.modules
  for select to authenticated
  using (true);

-- --- checklist_items
drop policy if exists chkitems_read_all    on public.checklist_items;
drop policy if exists chkitems_admin_write on public.checklist_items;

create policy chkitems_select_authenticated on public.checklist_items
  for select to authenticated
  using (true);

-- --- progress
drop policy if exists progress_self_rw on public.progress;

create policy progress_self_rw on public.progress
  for all to authenticated
  using (user_id = (select auth.uid()) or public.is_admin())
  with check (user_id = (select auth.uid()) or public.is_admin());

-- --- user_checklist
drop policy if exists user_chk_self_rw on public.user_checklist;

create policy user_chk_self_rw on public.user_checklist
  for all to authenticated
  using (user_id = (select auth.uid()) or public.is_admin())
  with check (user_id = (select auth.uid()) or public.is_admin());

-- --- video_views
drop policy if exists views_self_insert on public.video_views;
drop policy if exists views_self_select on public.video_views;

create policy views_self_insert on public.video_views
  for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy views_self_select on public.video_views
  for select to authenticated
  using (user_id = (select auth.uid()) or public.is_admin());

-- 3) Indici FK mancanti
create index if not exists idx_invites_invited_by    on public.admin_invites(invited_by);
create index if not exists idx_invites_resulting_user on public.admin_invites(resulting_user);
create index if not exists idx_userchk_item          on public.user_checklist(item_id);
create index if not exists idx_views_module          on public.video_views(module_id);
