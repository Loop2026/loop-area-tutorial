-- =============================================================
-- 003 — Split admin write policies (evita overlap con SELECT pubblica)
-- =============================================================
-- Evita il WARN "multiple_permissive_policies" causato da FOR ALL
-- che si sovrappone alla policy di SELECT autenticata.
-- =============================================================

-- modules
create policy modules_admin_insert on public.modules
  for insert to authenticated with check (public.is_admin());
create policy modules_admin_update on public.modules
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy modules_admin_delete on public.modules
  for delete to authenticated using (public.is_admin());

-- checklist_items
create policy chkitems_admin_insert on public.checklist_items
  for insert to authenticated with check (public.is_admin());
create policy chkitems_admin_update on public.checklist_items
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy chkitems_admin_delete on public.checklist_items
  for delete to authenticated using (public.is_admin());
