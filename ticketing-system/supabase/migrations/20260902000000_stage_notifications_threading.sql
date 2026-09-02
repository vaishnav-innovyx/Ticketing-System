-- Migration: 20260902000000_stage_notifications_threading.sql
-- Adds root_message_id and in_reply_to columns to email_notifications table,
-- and updates dispatch_ticket_notification() trigger to cover all 7 stages,
-- multi-admin routing (including project_admin), and P0 watcher conditions.

-- 1. Alter email_notifications table to add threading headers
alter table public.email_notifications
  add column if not exists root_message_id text,
  add column if not exists in_reply_to text;

-- 2. Overhaul trigger function to populate notifications for all recipients
create or replace function dispatch_ticket_notification() returns trigger as $$
declare
  v_ticket tickets%rowtype;
  v_event notification_event;
  v_recipients text[];
  v_recipient text;
  v_root_msg_id text;
  v_in_reply_to text;
  v_domain text := 'innovyxtechlabs.com';
begin
  select * into v_ticket from tickets where id = new.ticket_id;
  if not found then
    return new;
  end if;

  -- Establish threading IDs
  v_root_msg_id := format('<ticket-%s-root@%s>', v_ticket.id, v_domain);

  -- Map stage transition to notification event
  case
    when new.to_status = 'raised' then
      v_event := 'ticket_raised';
      v_in_reply_to := null;
    when new.to_status = 'poc_triage' then
      v_event := 'poc_triaged';
      v_in_reply_to := v_root_msg_id;
    when new.to_status = 'requirement_estimation' then
      if new.from_status = 'client_approval' then
        v_event := 'estimate_rejected';
      else
        v_event := 'poc_triaged';
      end if;
      v_in_reply_to := v_root_msg_id;
    when new.to_status = 'client_approval' then
      v_event := 'estimate_submitted';
      v_in_reply_to := v_root_msg_id;
    when new.to_status = 'development' then
      if new.from_status = 'client_approval' then
        v_event := 'estimate_approved';
      elsif new.from_status = 'closed' then
        v_event := 'ticket_raised'; -- Reopened
      else
        v_event := 'estimate_approved';
      end if;
      v_in_reply_to := v_root_msg_id;
    when new.to_status = 'delivery' then
      v_event := 'development_completed';
      v_in_reply_to := v_root_msg_id;
    when new.to_status = 'closed' then
      v_event := 'closed';
      v_in_reply_to := v_root_msg_id;
    else
      v_event := null;
  end case;

  if v_event is null then
    return new;
  end if;

  -- Build unique recipient list:
  -- 1. Raiser
  -- 2. Specialist / Developer
  -- 3. Delivery Lead
  -- 4. Ticket POC & Project Default POC
  -- 5. Project Admins (project_members with role 'project_admin')
  -- 6. Client Admins
  -- 7. Watchers (ONLY IF priority = 'critical')
  with all_recipients as (
    -- Raiser
    select email from profiles where id = v_ticket.raised_by
    union
    -- Specialist
    select email from profiles where id = v_ticket.specialist_id
    union
    -- Delivery Lead
    select email from profiles where id = v_ticket.delivery_lead_id
    union
    -- Ticket POC
    select email from profiles where id = v_ticket.poc_id
    union
    -- Project Default POC
    select p.email from projects pr join profiles p on p.id = pr.default_poc_id where pr.id = v_ticket.project_id
    union
    -- Assigned Project Admins
    select p.email from project_members pm join profiles p on p.id = pm.user_id where pm.project_id = v_ticket.project_id and p.role = 'project_admin'
    union
    -- Client Admins
    select email from profiles where client_id = v_ticket.client_id and role = 'client_admin'
    union
    -- Watchers (P0 Critical Only)
    select email from ticket_watchers where ticket_id = v_ticket.id and v_ticket.priority = 'critical'
  )
  select array_agg(distinct lower(email)) into v_recipients from all_recipients where email is not null and trim(email) <> '';

  if v_recipients is not null then
    foreach v_recipient in array v_recipients loop
      insert into email_notifications (
        ticket_id, event, recipient_email, subject, body, root_message_id, in_reply_to
      )
      values (
        v_ticket.id,
        v_event,
        v_recipient,
        case
          when new.to_status = 'raised' then format('[%s] %s', v_ticket.token, v_ticket.title)
          else format('Re: [%s] %s', v_ticket.token, v_ticket.title)
        end,
        format('Ticket %s moved to stage: %s.', v_ticket.token, new.to_status),
        v_root_msg_id,
        v_in_reply_to
      );
    end loop;
  end if;

  return new;
end;
$$ language plpgsql security definer set search_path = public;
