-- Notification dispatcher: ticket_events -> email_notifications (§5)
--
-- Event mapping is derived from the to_status/from_status of each
-- ticket_events row. 'closed' fires both 'delivered' and 'closed' since
-- the 7-stage lifecycle collapses those two notification_event values
-- into a single terminal status transition.

create or replace function dispatch_ticket_notification() returns trigger as $$
declare
  v_ticket tickets%rowtype;
  v_event notification_event;
  v_recipient text;
begin
  select * into v_ticket from tickets where id = new.ticket_id;

  case
    when new.to_status = 'raised' then
      v_event := 'ticket_raised';
      select email into v_recipient from profiles where id = v_ticket.raised_by;
    when new.to_status = 'poc_triage' then
      v_event := 'poc_triaged';
      select email into v_recipient from profiles where id = v_ticket.raised_by;
    when new.to_status = 'client_approval' then
      v_event := 'estimate_submitted';
      select email into v_recipient from profiles where id = v_ticket.raised_by;
    when new.to_status = 'development' and new.from_status = 'client_approval' then
      v_event := 'estimate_approved';
      select email into v_recipient from profiles where id = v_ticket.specialist_id;
    when new.to_status = 'requirement_estimation' and new.from_status = 'client_approval' then
      v_event := 'estimate_rejected';
      select email into v_recipient from profiles where id = v_ticket.specialist_id;
    when new.to_status = 'delivery' then
      v_event := 'development_completed';
      select email into v_recipient from profiles where id = v_ticket.delivery_lead_id;
    else
      v_event := null;
  end case;

  if v_event is not null and v_recipient is not null then
    insert into email_notifications (ticket_id, event, recipient_email, subject, body)
    values (
      v_ticket.id, v_event, v_recipient,
      format('[%s] %s - %s', v_ticket.token, v_ticket.title, v_event),
      format('Ticket %s changed status to %s.', v_ticket.token, new.to_status)
    );
  end if;

  if new.to_status = 'closed' then
    select email into v_recipient from profiles where id = v_ticket.raised_by;
    if v_recipient is not null then
      insert into email_notifications (ticket_id, event, recipient_email, subject, body)
      values (
        v_ticket.id, 'delivered', v_recipient,
        format('[%s] %s - delivered', v_ticket.token, v_ticket.title),
        format('Ticket %s has been delivered.', v_ticket.token)
      );
      insert into email_notifications (ticket_id, event, recipient_email, subject, body)
      values (
        v_ticket.id, 'closed', v_recipient,
        format('[%s] %s - closed', v_ticket.token, v_ticket.title),
        format('Ticket %s has been closed.', v_ticket.token)
      );
    end if;
  end if;

  return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger dispatch_ticket_notification after insert on ticket_events
  for each row execute function dispatch_ticket_notification();
