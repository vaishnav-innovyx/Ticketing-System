-- tickets_update (§4/0003_rls.sql) only checked project_members membership,
-- not role, so client_viewer (meant to be read-only) could update tickets.

drop policy if exists tickets_update on tickets;

create policy tickets_update on tickets for update using (
  auth_role() = 'super_admin'
  or (
    auth_role() != 'client_viewer'
    and exists (
      select 1 from project_members pm
      where pm.project_id = tickets.project_id and pm.user_id = auth.uid()
    )
  )
) with check (
  auth_role() = 'super_admin'
  or (
    auth_role() != 'client_viewer'
    and exists (
      select 1 from project_members pm
      where pm.project_id = tickets.project_id and pm.user_id = auth.uid()
    )
  )
);
