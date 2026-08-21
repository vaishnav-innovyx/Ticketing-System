-- Per-user, per-ticket read tracking for the internal Communication inbox
-- (unread badge in the sidebar, unread counts per conversation).

create table ticket_message_reads (
  user_id uuid not null references profiles(id) on delete cascade,
  ticket_id uuid not null references tickets(id) on delete cascade,
  last_read_at timestamptz not null default now(),
  primary key (user_id, ticket_id)
);

alter table ticket_message_reads enable row level security;

create policy ticket_message_reads_select on ticket_message_reads for select using (
  user_id = auth.uid()
);

create policy ticket_message_reads_write on ticket_message_reads for all using (
  user_id = auth.uid()
) with check (
  user_id = auth.uid()
);
