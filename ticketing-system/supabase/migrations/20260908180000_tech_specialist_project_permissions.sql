-- Migration: 20260908180000_tech_specialist_project_permissions.sql
-- Grants Tech Specialists ('specialist') permission to create, edit, and view projects in Supabase RLS.

-- 1. projects_write: allow super_admin, specialist, or client_admin (for own client)
drop policy if exists projects_write on projects;

create policy projects_write on projects for all using (
  auth_role() in ('super_admin', 'specialist')
  or (auth_role() = 'client_admin' and client_id = auth_client_id())
) with check (
  auth_role() in ('super_admin', 'specialist')
  or (auth_role() = 'client_admin' and client_id = auth_client_id())
);

-- 2. projects_select: allow super_admin, specialist, own client, or assigned project members
drop policy if exists projects_select on projects;

create policy projects_select on projects for select using (
  auth_role() in ('super_admin', 'specialist')
  or client_id = auth_client_id()
  or is_project_member(id)
);

-- 3. clients_select: allow internal staff (super_admin, specialist) to view client metadata
drop policy if exists clients_select on clients;

create policy clients_select on clients for select using (
  auth_role() in ('super_admin', 'specialist')
  or id = auth_client_id()
  or exists (
    select 1 from projects pr
    where pr.client_id = clients.id and is_project_member(pr.id)
  )
);
