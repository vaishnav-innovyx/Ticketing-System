-- =============================================================================
-- RESET DATABASE SCRIPT FOR RESOLV (TICKETING SYSTEM)
-- File: reset_db.sql
-- Location: /Users/shelvinsunilphilip/Documents/GitHub/Ticketing-System/ticketing-system/reset_db.sql
--
-- Instructions:
-- Run this script in your Supabase SQL Editor or via psql:
--   psql -h localhost -p 54322 -U postgres -d postgres -f reset_db.sql
-- =============================================================================

BEGIN;

-- 1. Truncate all application tables (CASCADE automatically handles dependent foreign keys)
TRUNCATE TABLE
  ticket_dependency_notes,
  ticket_dependencies,
  ticket_message_reads,
  ticket_messages,
  ticket_attachments,
  ticket_watchers,
  ticket_events,
  email_notifications,
  api_tokens,
  tickets,
  project_members,
  projects,
  clients,
  profiles
RESTART IDENTITY CASCADE;

-- 2. Wipe Supabase Auth users
DELETE FROM auth.users;

-- 3. Re-provision Default Super Admin Account
DO $$
DECLARE
  v_user_id uuid := gen_random_uuid();
  v_email text := 'admin@innovyxtechlabs.com';
  v_password text := 'ChangeMe123!';
  v_full_name text := 'System Super Admin';
BEGIN
  -- Insert super admin into auth.users
  INSERT INTO auth.users (
    id, instance_id, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at, role, aud
  ) VALUES (
    v_user_id, '00000000-0000-0000-0000-000000000000',
    lower(v_email), crypt(v_password, gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}',
    jsonb_build_object('full_name', v_full_name),
    now(), now(), 'authenticated', 'authenticated'
  );

  -- Insert profile for super admin
  INSERT INTO profiles (id, email, full_name, role, client_id)
  VALUES (v_user_id, lower(v_email), v_full_name, 'super_admin', NULL);

  -- 4. Re-provision Default Client, Project, and API Token for FPI Task Dashboard Integration
  INSERT INTO clients (id, code, name)
  VALUES ('95f59bd8-56d0-467f-aecc-32d2274da514', 'FPI', 'Future Pipe Industries')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO projects (id, client_id, code, name)
  VALUES ('4ad74d9a-a71e-4def-b8b1-9cc487820383', '95f59bd8-56d0-467f-aecc-32d2274da514', 'FPITASK', 'Future Pipe Industries Task Dashboard')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO api_tokens (id, client_id, project_id, name, token_hash, token_prefix, scopes, is_active, created_by)
  VALUES (
    '20d3bfc0-5763-47c0-9d34-bdfd504681be',
    '95f59bd8-56d0-467f-aecc-32d2274da514',
    '4ad74d9a-a71e-4def-b8b1-9cc487820383',
    'Future Pipe Industries Default API Key',
    '503ab11af959c9224fe5b62d0077315bc698941e55c60739ea35997c130d0d4b',
    'tk_fpi_8',
    ARRAY['tickets:write'],
    true,
    v_user_id
  )
  ON CONFLICT (id) DO UPDATE SET
    token_hash = EXCLUDED.token_hash,
    token_prefix = EXCLUDED.token_prefix,
    is_active = true;

END $$;

COMMIT;

-- =============================================================================
-- Reset Complete!
-- Default Super Admin Credentials:
--   Email:    admin@innovyxtechlabs.com
--   Password: ChangeMe123!
-- =============================================================================
