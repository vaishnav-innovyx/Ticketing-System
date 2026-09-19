-- 20260920000000_microsoft_sso_multitenant.sql
-- Implements Microsoft Entra ID Multi-Tenant SSO, Identity Binding, User Allowlist & Audit Logging

-- 1. Status and User Type validation on clients and profiles
alter table clients
  add column if not exists microsoft_tenant_id text unique,
  add column if not exists status text not null default 'ACTIVE'
    check (status in ('PENDING', 'ACTIVE', 'SUSPENDED', 'DISABLED'));

alter table profiles
  add column if not exists microsoft_tenant_id text,
  add column if not exists microsoft_object_id text,
  add column if not exists user_type text not null default 'CLIENT'
    check (user_type in ('CLIENT', 'INTERNAL')),
  add column if not exists status text not null default 'ACTIVE'
    check (status in ('PENDING', 'ACTIVE', 'SUSPENDED', 'DISABLED'));

-- Unique constraint on Microsoft tenant + object ID
create unique index if not exists idx_profiles_microsoft_identity
  on profiles (microsoft_tenant_id, microsoft_object_id)
  where microsoft_tenant_id is not null and microsoft_object_id is not null;

-- Populate user_type for existing records
update profiles
set user_type = 'INTERNAL'
where role in ('super_admin', 'poc', 'specialist', 'delivery_lead');

update profiles
set user_type = 'CLIENT'
where role in ('client_admin', 'project_admin', 'client_raiser', 'client_viewer');

-- 2. Pending Invitations / User Allowlist table (§12-§13)
create table if not exists invitations (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  full_name text not null,
  role user_role not null,
  user_type text not null default 'CLIENT' check (user_type in ('CLIENT', 'INTERNAL')),
  client_id uuid references clients(id) on delete cascade,
  project_ids uuid[] default array[]::uuid[],
  microsoft_tenant_id text,
  status text not null default 'PENDING' check (status in ('PENDING', 'ACTIVE', 'EXPIRED', 'REVOKED')),
  created_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '30 days'),
  unique (email, client_id)
);

create index if not exists idx_invitations_email on invitations (lower(email));
create index if not exists idx_invitations_client on invitations (client_id);

-- 3. Audit Logs table (§26)
create table if not exists audit_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references clients(id) on delete set null,
  actor_user_id uuid references profiles(id) on delete set null,
  action text not null,
  resource_type text not null,
  resource_id text,
  old_value jsonb,
  new_value jsonb,
  ip_address text,
  user_agent text,
  created_at timestamptz not null default now()
);

create index if not exists idx_audit_logs_org on audit_logs (organization_id);
create index if not exists idx_audit_logs_actor on audit_logs (actor_user_id);
create index if not exists idx_audit_logs_action on audit_logs (action);
create index if not exists idx_audit_logs_created on audit_logs (created_at desc);

-- 4. Enable Row Level Security (RLS)
alter table invitations enable row level security;
alter table audit_logs enable row level security;

-- Invitations RLS:
-- Super admin can view & manage all invitations
create policy invitations_super_admin on invitations
  for all using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid() and profiles.role = 'super_admin' and profiles.status = 'ACTIVE'
    )
  );

-- Client admin can view & manage invitations for their client only
create policy invitations_client_admin on invitations
  for all using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
        and profiles.role = 'client_admin'
        and profiles.status = 'ACTIVE'
        and profiles.client_id = invitations.client_id
    )
  );

-- Audit logs RLS: Super admin can read all audit logs
create policy audit_logs_super_admin_select on audit_logs
  for select using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid() and profiles.role = 'super_admin' and profiles.status = 'ACTIVE'
    )
  );

-- Client admin can read audit logs for their organization
create policy audit_logs_client_admin_select on audit_logs
  for select using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
        and profiles.role = 'client_admin'
        and profiles.status = 'ACTIVE'
        and profiles.client_id = audit_logs.organization_id
    )
  );
