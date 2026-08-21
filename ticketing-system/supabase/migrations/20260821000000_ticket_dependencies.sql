-- Ticket-to-ticket dependency links.
-- A ticket cannot be closed while any ticket it depends on is still open.
-- Same-project links only; cycles are rejected.

create table ticket_dependencies (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references tickets(id) on delete cascade,
  depends_on_ticket_id uuid not null references tickets(id) on delete cascade,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  constraint ticket_dependencies_no_self_chk check (ticket_id <> depends_on_ticket_id),
  constraint ticket_dependencies_unique unique (ticket_id, depends_on_ticket_id)
);

create index on ticket_dependencies (ticket_id);
create index on ticket_dependencies (depends_on_ticket_id);

-- same-project enforcement (defense in depth; the UI picker already restricts to one project)
create or replace function enforce_same_project_dependency() returns trigger as $$
declare
  v_project_a uuid;
  v_project_b uuid;
begin
  select project_id into v_project_a from tickets where id = new.ticket_id;
  select project_id into v_project_b from tickets where id = new.depends_on_ticket_id;
  if v_project_a is distinct from v_project_b then
    raise exception 'Dependency links must be within the same project';
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger enforce_same_project_dependency before insert on ticket_dependencies
  for each row execute function enforce_same_project_dependency();

-- cycle prevention: reject insert if depends_on_ticket_id can already (transitively) reach ticket_id
create or replace function prevent_dependency_cycle() returns trigger as $$
begin
  if exists (
    with recursive chain(id) as (
      select new.depends_on_ticket_id
      union all
      select td.depends_on_ticket_id
      from ticket_dependencies td
      join chain c on td.ticket_id = c.id
    )
    select 1 from chain where id = new.ticket_id
  ) then
    raise exception 'Circular dependency detected';
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger prevent_dependency_cycle before insert on ticket_dependencies
  for each row execute function prevent_dependency_cycle();

-- source of truth: block close while unresolved dependencies remain, regardless of which
-- client (service-role or RLS) performs the update.
create or replace function enforce_dependencies_closed() returns trigger as $$
begin
  if new.status = 'closed' and (old.status is distinct from 'closed') then
    if exists (
      select 1
      from ticket_dependencies td
      join tickets dep on dep.id = td.depends_on_ticket_id
      where td.ticket_id = new.id and dep.status <> 'closed'
    ) then
      raise exception 'Cannot close ticket: unresolved dependencies remain open';
    end if;
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger enforce_dependencies_closed before update of status on tickets
  for each row execute function enforce_dependencies_closed();

-- RLS
alter table ticket_dependencies enable row level security;

create policy ticket_dependencies_select on ticket_dependencies for select using (
  auth_role() = 'super_admin'
  or exists (select 1 from tickets t where t.id = ticket_dependencies.ticket_id and is_project_member(t.project_id))
  or exists (select 1 from tickets t where t.id = ticket_dependencies.ticket_id and auth_role() = 'client_admin' and t.client_id = auth_client_id())
);

create policy ticket_dependencies_write on ticket_dependencies for all using (
  auth_role() = 'super_admin'
  or (
    auth_role() in ('poc', 'specialist', 'delivery_lead')
    and exists (select 1 from tickets t where t.id = ticket_dependencies.ticket_id and is_project_member(t.project_id))
  )
) with check (
  auth_role() = 'super_admin'
  or (
    auth_role() in ('poc', 'specialist', 'delivery_lead')
    and exists (select 1 from tickets t where t.id = ticket_dependencies.ticket_id and is_project_member(t.project_id))
  )
);
