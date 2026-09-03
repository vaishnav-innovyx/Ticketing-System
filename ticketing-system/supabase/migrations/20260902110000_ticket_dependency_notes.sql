-- Structured, informational notes a raiser can attach at ticket creation to flag
-- other people or modules/systems the issue is understood to affect. Distinct from
-- ticket_dependencies (which links two existing tickets and blocks closing) -- these
-- are context captured at intake, before any related ticket necessarily exists.

create type ticket_dependency_note_kind as enum ('person', 'module');

create table ticket_dependency_notes (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references tickets(id) on delete cascade,
  kind ticket_dependency_note_kind not null,
  label text not null,
  detail text,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

create index on ticket_dependency_notes (ticket_id);

alter table ticket_dependency_notes enable row level security;

create policy ticket_dependency_notes_select on ticket_dependency_notes for select using (
  auth_role() = 'super_admin'
  or exists (select 1 from tickets t where t.id = ticket_dependency_notes.ticket_id and is_project_member(t.project_id))
  or exists (select 1 from tickets t where t.id = ticket_dependency_notes.ticket_id and t.client_id = auth_client_id())
);

create policy ticket_dependency_notes_write on ticket_dependency_notes for all using (
  auth_role() = 'super_admin'
  or exists (select 1 from tickets t where t.id = ticket_dependency_notes.ticket_id and is_project_member(t.project_id))
  or exists (
    select 1 from tickets t
    where t.id = ticket_dependency_notes.ticket_id and t.client_id = auth_client_id() and t.raised_by = auth.uid()
  )
) with check (
  auth_role() = 'super_admin'
  or exists (select 1 from tickets t where t.id = ticket_dependency_notes.ticket_id and is_project_member(t.project_id))
  or exists (
    select 1 from tickets t
    where t.id = ticket_dependency_notes.ticket_id and t.client_id = auth_client_id() and t.raised_by = auth.uid()
  )
);
