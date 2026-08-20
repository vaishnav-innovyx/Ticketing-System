-- Row Level Security: 3-tier isolation + RBAC (§4)

-- security-definer helpers avoid RLS recursion on `profiles` itself
create or replace function auth_role() returns user_role as $$
  select role from profiles where id = auth.uid();
$$ language sql stable security definer set search_path = public;

create or replace function auth_client_id() returns uuid as $$
  select client_id from profiles where id = auth.uid();
$$ language sql stable security definer set search_path = public;

-- clients ---------------------------------------------------------------
alter table clients enable row level security;

create policy clients_select on clients for select using (
  auth_role() = 'super_admin'
  or id = auth_client_id()
  or exists (
    select 1 from project_members pm
    join projects pr on pr.id = pm.project_id
    where pr.client_id = clients.id and pm.user_id = auth.uid()
  )
);

create policy clients_write on clients for all
  using (auth_role() = 'super_admin')
  with check (auth_role() = 'super_admin');

-- projects ---------------------------------------------------------------
alter table projects enable row level security;

create policy projects_select on projects for select using (
  auth_role() = 'super_admin'
  or client_id = auth_client_id()
  or exists (
    select 1 from project_members pm
    where pm.project_id = projects.id and pm.user_id = auth.uid()
  )
);

create policy projects_write on projects for all
  using (auth_role() = 'super_admin')
  with check (auth_role() = 'super_admin');

-- profiles ---------------------------------------------------------------
alter table profiles enable row level security;

create policy profiles_select on profiles for select using (
  id = auth.uid()
  or auth_role() = 'super_admin'
  or (auth_role() in ('poc', 'specialist', 'delivery_lead') and exists (
        select 1 from project_members pm_self
        join project_members pm_target on pm_target.project_id = pm_self.project_id
        where pm_self.user_id = auth.uid() and pm_target.user_id = profiles.id
     ))
  or (auth_role() = 'client_admin' and client_id = auth_client_id())
);

create policy profiles_insert on profiles for insert with check (
  auth_role() = 'super_admin'
  or (auth_role() = 'client_admin' and client_id = auth_client_id())
);

create policy profiles_update on profiles for update using (
  id = auth.uid()
  or auth_role() = 'super_admin'
  or (auth_role() = 'client_admin' and client_id = auth_client_id())
) with check (
  id = auth.uid()
  or auth_role() = 'super_admin'
  or (auth_role() = 'client_admin' and client_id = auth_client_id())
);

create policy profiles_delete on profiles for delete using (
  auth_role() = 'super_admin'
  or (auth_role() = 'client_admin' and client_id = auth_client_id())
);

-- project_members ---------------------------------------------------------
alter table project_members enable row level security;

create policy project_members_select on project_members for select using (
  auth_role() = 'super_admin'
  or user_id = auth.uid()
  or (auth_role() = 'client_admin' and exists (
        select 1 from projects pr where pr.id = project_members.project_id and pr.client_id = auth_client_id()
     ))
  or exists (
    select 1 from project_members pm2
    where pm2.project_id = project_members.project_id and pm2.user_id = auth.uid()
  )
);

create policy project_members_write on project_members for all using (
  auth_role() = 'super_admin'
  or (auth_role() = 'client_admin' and exists (
        select 1 from projects pr where pr.id = project_members.project_id and pr.client_id = auth_client_id()
     ))
) with check (
  auth_role() = 'super_admin'
  or (auth_role() = 'client_admin' and exists (
        select 1 from projects pr where pr.id = project_members.project_id and pr.client_id = auth_client_id()
     ))
);

-- tickets ------------------------------------------------------------------
alter table tickets enable row level security;

create policy tickets_select on tickets for select using (
  auth_role() = 'super_admin'
  or exists (
    select 1 from project_members pm
    where pm.project_id = tickets.project_id and pm.user_id = auth.uid()
  )
  or (auth_role() = 'client_admin' and client_id = auth_client_id())
);

create policy tickets_insert on tickets for insert with check (
  auth_role() = 'super_admin'
  or (
    auth_role() in ('client_raiser', 'poc', 'specialist', 'delivery_lead')
    and exists (
      select 1 from project_members pm
      where pm.project_id = tickets.project_id and pm.user_id = auth.uid()
    )
  )
);

create policy tickets_update on tickets for update using (
  auth_role() = 'super_admin'
  or exists (
    select 1 from project_members pm
    where pm.project_id = tickets.project_id and pm.user_id = auth.uid()
  )
) with check (
  auth_role() = 'super_admin'
  or exists (
    select 1 from project_members pm
    where pm.project_id = tickets.project_id and pm.user_id = auth.uid()
  )
);

-- client_viewer gets no insert/update policy above -> read-only by omission.

-- ticket_events --------------------------------------------------------------
alter table ticket_events enable row level security;

create policy ticket_events_select on ticket_events for select using (
  auth_role() = 'super_admin'
  or exists (
    select 1 from tickets t
    join project_members pm on pm.project_id = t.project_id
    where t.id = ticket_events.ticket_id and pm.user_id = auth.uid()
  )
);
-- no insert/update/delete policies: only the security-definer trigger
-- (log_ticket_status_change) or the service role may write here.

-- email_notifications ----------------------------------------------------
alter table email_notifications enable row level security;

create policy email_notifications_select on email_notifications for select using (
  auth_role() = 'super_admin'
  or exists (
    select 1 from tickets t
    join project_members pm on pm.project_id = t.project_id
    where t.id = email_notifications.ticket_id and pm.user_id = auth.uid()
  )
);
-- no insert/update/delete policies: only the security-definer dispatcher
-- trigger (§0004) or the service role may write here.
