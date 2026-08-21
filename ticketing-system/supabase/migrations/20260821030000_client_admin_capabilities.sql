-- client_admin is the highest-privileged client role but was excluded from
-- raising tickets (AC-4) and from the project-creation policy the app-level
-- code already assumed it had (AC-6). Bring both in line.

drop policy if exists tickets_insert on tickets;

create policy tickets_insert on tickets for insert with check (
  auth_role() = 'super_admin'
  or (
    auth_role() in ('client_admin', 'client_raiser', 'poc', 'specialist', 'delivery_lead')
    and exists (
      select 1 from project_members pm
      where pm.project_id = tickets.project_id and pm.user_id = auth.uid()
    )
  )
);

drop policy if exists projects_write on projects;

create policy projects_write on projects for all using (
  auth_role() = 'super_admin'
  or (auth_role() = 'client_admin' and client_id = auth_client_id())
) with check (
  auth_role() = 'super_admin'
  or (auth_role() = 'client_admin' and client_id = auth_client_id())
);
