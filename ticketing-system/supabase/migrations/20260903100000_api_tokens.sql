-- Migration: 20260903100000_api_tokens.sql
-- Adds api_tokens: per-client-app machine credentials for the public ticket
-- ingestion API (POST /api/v1/tickets). One token = one client + one project.
-- Raw tokens are never stored -- only a SHA-256 hash, verified server-side via
-- supabaseAdmin (see src/lib/server/apiAuth.ts). This is the generic mechanism
-- that lets any future client app (internal or external) onboard by creating
-- a clients/projects row + issuing a token here, with no further schema or
-- API changes.

create table api_tokens (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  project_id uuid not null references projects(id) on delete cascade,
  name text not null,
  token_hash text not null unique,
  token_prefix text not null,
  scopes text[] not null default '{tickets:write}',
  is_active boolean not null default true,
  last_used_at timestamptz,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  revoked_at timestamptz
);

create index api_tokens_project_id_idx on api_tokens(project_id);
create index api_tokens_client_id_idx on api_tokens(client_id);

alter table api_tokens enable row level security;

-- Only super_admin may read or write tokens via the session client. All
-- runtime auth-check reads happen through supabaseAdmin (service role),
-- which bypasses RLS entirely, matching the existing clients/projects pattern.
create policy api_tokens_select on api_tokens for select using (
  auth_role() = 'super_admin'
);

create policy api_tokens_write on api_tokens for all
  using (auth_role() = 'super_admin')
  with check (auth_role() = 'super_admin');
