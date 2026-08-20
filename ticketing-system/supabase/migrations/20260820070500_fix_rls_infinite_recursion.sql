-- Fix infinite recursion in RLS policies for projects, project_members, and tickets.
-- Creates a security-definer helper function `is_project_member` to bypass RLS recursion.

create or replace function is_project_member(p_project_id uuid, p_user_id uuid default auth.uid())
returns boolean as $$
  select exists (
    select 1 from public.project_members
    where project_id = p_project_id and user_id = p_user_id
  );
$$ language sql stable security definer set search_path = public;

-- 1. projects
drop policy if exists projects_select on projects;
create policy projects_select on projects for select using (
  auth_role() = 'super_admin'
  or client_id = auth_client_id()
  or is_project_member(id)
);

-- 2. project_members
drop policy if exists project_members_select on project_members;
create policy project_members_select on project_members for select using (
  auth_role() = 'super_admin'
  or user_id = auth.uid()
  or is_project_member(project_id)
  or (auth_role() = 'client_admin' and exists (
        select 1 from projects pr where pr.id = project_members.project_id and pr.client_id = auth_client_id()
     ))
);

-- 3. tickets
drop policy if exists tickets_select on tickets;
create policy tickets_select on tickets for select using (
  auth_role() = 'super_admin'
  or is_project_member(project_id)
  or (auth_role() = 'client_admin' and client_id = auth_client_id())
);

-- 4. clients
drop policy if exists clients_select on clients;
create policy clients_select on clients for select using (
  auth_role() = 'super_admin'
  or id = auth_client_id()
  or exists (
    select 1 from projects pr
    where pr.client_id = clients.id and is_project_member(pr.id)
  )
);
