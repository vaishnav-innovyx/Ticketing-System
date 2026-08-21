-- createTicket / CreateTicketModal already read & write a "target_date" form field
-- (WF-1 audit finding), but no such column ever existed, so picking a date broke
-- ticket creation outright. Add the column the app already expects.

alter table tickets add column target_date date;
