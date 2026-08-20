-- Triggers, ticket token generator, seat quota enforcement,
-- status-change logging, ticket_metrics view (§3.3-3.4)

-- updated_at bookkeeping
create or replace function set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger set_updated_at before update on clients
  for each row execute function set_updated_at();
create trigger set_updated_at before update on projects
  for each row execute function set_updated_at();
create trigger set_updated_at before update on profiles
  for each row execute function set_updated_at();
create trigger set_updated_at before update on tickets
  for each row execute function set_updated_at();

-- ticket token: [CLIENT_CODE]-[PROJECT_CODE]-TK-[SEQ]
create sequence if not exists ticket_token_seq;

create or replace function generate_ticket_token() returns trigger as $$
declare
  v_client_code text;
  v_project_code text;
  v_seq bigint;
begin
  if new.token is not null then
    return new;
  end if;

  select code into v_client_code from clients where id = new.client_id;
  select code into v_project_code from projects where id = new.project_id;
  v_seq := nextval('ticket_token_seq');

  new.token := v_client_code || '-' || v_project_code || '-TK-' || lpad(v_seq::text, 4, '0');
  return new;
end;
$$ language plpgsql;

create trigger generate_ticket_token before insert on tickets
  for each row execute function generate_ticket_token();

-- seat quota: reject a new/updated client-side profile once the client's seat_quota is reached
create or replace function enforce_seat_quota() returns trigger as $$
declare
  v_quota int;
  v_count int;
begin
  if new.client_id is null then
    return new;
  end if;

  select seat_quota into v_quota from clients where id = new.client_id;

  -- null or <= 0 indicates infinite / unlimited seat quota
  if v_quota is null or v_quota <= 0 then
    return new;
  end if;

  select count(*) into v_count
  from profiles
  where client_id = new.client_id
    and id <> coalesce(new.id, '00000000-0000-0000-0000-000000000000'::uuid);

  if v_count >= v_quota then
    raise exception 'Seat quota exceeded for client %', new.client_id;
  end if;

  return new;
end;
$$ language plpgsql;

create trigger enforce_seat_quota before insert or update of client_id on profiles
  for each row execute function enforce_seat_quota();

-- ticket_events audit trail, drives the notification dispatcher (§5)
create or replace function log_ticket_status_change() returns trigger as $$
begin
  if tg_op = 'INSERT' then
    insert into ticket_events (ticket_id, actor_id, from_status, to_status, notes)
    values (new.id, new.raised_by, null, new.status, 'Ticket raised');
  elsif tg_op = 'UPDATE' and new.status is distinct from old.status then
    insert into ticket_events (ticket_id, actor_id, from_status, to_status)
    values (new.id, auth.uid(), old.status, new.status);
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger log_ticket_status_change after insert or update of status on tickets
  for each row execute function log_ticket_status_change();

-- Executive Analytics Dashboard metrics
create view ticket_metrics as
select
  t.id as ticket_id, t.token, t.client_id, t.project_id, t.status, t.category,
  (t.poc_responded_at - t.raised_at)                         as poc_tat,
  (t.requirement_completed_at - t.poc_responded_at)          as estimation_duration,
  (t.client_approved_at - t.requirement_completed_at)        as client_approval_delay,
  t.estimated_hours, t.actual_hours,
  case when t.estimated_hours > 0 and t.actual_hours is not null
       then round(((t.actual_hours - t.estimated_hours) / t.estimated_hours) * 100, 2)
  end as effort_variance_pct,
  (t.closed_at - t.raised_at) as total_cycle_time
from tickets t;
