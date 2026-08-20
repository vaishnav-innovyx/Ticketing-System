-- Portal UI fields not covered by the original master-plan schema:
-- priority, environment, AI summary, conversation thread, file
-- attachments, CC watchers.

create type ticket_priority as enum ('low', 'medium', 'high', 'critical');

alter table tickets
  add column priority ticket_priority not null default 'medium',
  add column environment text not null default 'production',
  add column ai_summary jsonb;

create table ticket_messages (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references tickets(id) on delete cascade,
  author_id uuid references profiles(id),
  content text not null,
  created_at timestamptz not null default now()
);

create table ticket_attachments (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references tickets(id) on delete cascade,
  message_id uuid references ticket_messages(id) on delete cascade,
  uploaded_by uuid references profiles(id),
  file_name text not null,
  file_size_bytes bigint,
  mime_type text,
  storage_path text not null,
  created_at timestamptz not null default now()
);

create table ticket_watchers (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references tickets(id) on delete cascade,
  email text not null,
  full_name text,
  created_at timestamptz not null default now(),
  unique (ticket_id, email)
);

create index on ticket_messages (ticket_id);
create index on ticket_attachments (ticket_id);
create index on ticket_attachments (message_id);
create index on ticket_watchers (ticket_id);
