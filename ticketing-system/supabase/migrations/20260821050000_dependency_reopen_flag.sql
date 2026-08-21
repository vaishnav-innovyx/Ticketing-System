-- enforce_dependencies_closed (20260821000000) only validates entering 'closed',
-- not leaving it. If a dependency is reopened after both it and its dependent
-- were already closed, the dependent silently sits on a now-invalid "all
-- dependencies resolved" state with no trail (WF-4). Rather than auto-reopening
-- the dependent (too surprising), leave a flag in its event timeline so staff
-- can see and act on it; the app surfaces this as a warning on closed tickets.

create or replace function flag_dependents_on_reopen() returns trigger as $$
begin
  if old.status = 'closed' and new.status <> 'closed' then
    insert into ticket_events (ticket_id, actor_id, from_status, to_status, notes)
    select
      dependent.id,
      null,
      dependent.status,
      dependent.status,
      'Dependency ' || coalesce(new.token, new.id::text) || ' was reopened after this ticket was closed — its resolution may need re-verification.'
    from ticket_dependencies td
    join tickets dependent on dependent.id = td.ticket_id
    where td.depends_on_ticket_id = new.id and dependent.status = 'closed';
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger flag_dependents_on_reopen after update of status on tickets
  for each row execute function flag_dependents_on_reopen();
