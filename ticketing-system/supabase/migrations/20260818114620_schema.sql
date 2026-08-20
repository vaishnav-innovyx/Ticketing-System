-- Enums + core tables (§3.1-3.2 of backendstructure.md)

create extension if not exists pgcrypto;

create type user_role as enum (
  'super_admin', 'poc', 'specialist', 'delivery_lead',
  'client_admin', 'client_raiser', 'client_viewer'
);

create type ticket_category as enum ('bug', 'enhancement', 'kt', 'training');

create type ticket_status as enum (
  'raised',
  'poc_triage',
  'requirement_estimation',
  'client_approval',
  'development',
  'delivery',
  'closed'
);

create type notification_event as enum (
  'ticket_raised', 'poc_triaged', 'estimate_submitted', 'estimate_approved',
  'estimate_rejected', 'development_completed', 'delivered', 'closed'
);

create table clients (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  name text not null,
  seat_quota int default 5,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table projects (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  code text not null,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (client_id, code)
);

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  role user_role not null,
  client_id uuid references clients(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_client_scope_chk check (
    (role in ('client_admin', 'client_raiser', 'client_viewer') and client_id is not null)
    or (role in ('super_admin', 'poc', 'specialist', 'delivery_lead') and client_id is null)
  )
);

create table project_members (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (project_id, user_id)
);

create table tickets (
  id uuid primary key default gen_random_uuid(),
  token text unique,
  client_id uuid not null references clients(id) on delete cascade,
  project_id uuid not null references projects(id) on delete cascade,
  category ticket_category not null,
  status ticket_status not null default 'raised',
  title text not null,
  description text,
  raised_by uuid references profiles(id),
  poc_id uuid references profiles(id),
  specialist_id uuid references profiles(id),
  delivery_lead_id uuid references profiles(id),
  raised_at timestamptz not null default now(),
  poc_responded_at timestamptz,
  requirement_completed_at timestamptz,
  estimated_hours numeric,
  client_approved_at timestamptz,
  client_approval_notes text,
  development_completed_at timestamptz,
  actual_hours numeric,
  delivered_at timestamptz,
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table ticket_events (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references tickets(id) on delete cascade,
  actor_id uuid references profiles(id),
  from_status ticket_status,
  to_status ticket_status not null,
  notes text,
  created_at timestamptz not null default now()
);

create table email_notifications (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references tickets(id) on delete cascade,
  event notification_event not null,
  recipient_email text not null,
  subject text not null,
  body text not null,
  sent_at timestamptz not null default now()
);

create index on projects (client_id);
create index on profiles (client_id);
create index on project_members (project_id);
create index on project_members (user_id);
create index on tickets (project_id);
create index on tickets (client_id);
create index on ticket_events (ticket_id);
create index on email_notifications (ticket_id);
