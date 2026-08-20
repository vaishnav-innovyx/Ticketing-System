-- Demo data: 3 clients / 10 projects / one profile per role / tickets
-- spread across the 7-stage lifecycle (§Step 4 of backendstructure.md).
--
-- All seeded users share the password below and are pre-confirmed so you
-- can log in immediately for the demo. Change/remove before going to prod.

-- pg_temp function: creates an auth.users + auth.identities + profiles row
-- (mirrors what a real "invite via Auth" flow produces), idempotent on email.
create function pg_temp.create_seed_user(
  p_email text, p_password text, p_full_name text,
  p_role user_role, p_client_id uuid
) returns uuid as $$
declare
  v_user_id uuid;
begin
  select id into v_user_id from auth.users where email = p_email;
  if v_user_id is not null then
    return v_user_id;
  end if;

  v_user_id := gen_random_uuid();

  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, last_sign_in_at,
    raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at,
    confirmation_token, email_change, email_change_token_new, recovery_token
  ) values (
    '00000000-0000-0000-0000-000000000000', v_user_id, 'authenticated', 'authenticated',
    p_email, extensions.crypt(p_password, extensions.gen_salt('bf')),
    now(), now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('full_name', p_full_name),
    now(), now(),
    '', '', '', ''
  );

  insert into auth.identities (
    id, provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at
  ) values (
    gen_random_uuid(), v_user_id::text, v_user_id,
    jsonb_build_object('sub', v_user_id::text, 'email', p_email),
    'email', now(), now(), now()
  );

  insert into profiles (id, email, full_name, role, client_id)
  values (v_user_id, p_email, p_full_name, p_role, p_client_id)
  on conflict (id) do nothing;

  return v_user_id;
end;
$$ language plpgsql;

-- clients ------------------------------------------------------------------
insert into clients (id, code, name, seat_quota) values
  ('11111111-1111-1111-1111-111111111111', 'ACME', 'Acme Corp', 10),
  ('22222222-2222-2222-2222-222222222222', 'GLOB', 'Globex Inc', 10),
  ('33333333-3333-3333-3333-333333333333', 'TECHCO', 'TechCo Ltd', 10)
on conflict (id) do nothing;

-- projects (10 total) --------------------------------------------------------
insert into projects (client_id, code, name) values
  ('11111111-1111-1111-1111-111111111111', 'MBANK', 'Acme Mobile Banking'),
  ('11111111-1111-1111-1111-111111111111', 'POS',   'Acme Point of Sale'),
  ('11111111-1111-1111-1111-111111111111', 'CRM',   'Acme CRM'),
  ('11111111-1111-1111-1111-111111111111', 'WEB',   'Acme Website'),
  ('22222222-2222-2222-2222-222222222222', 'ERP',   'Globex ERP'),
  ('22222222-2222-2222-2222-222222222222', 'HR',    'Globex HR Portal'),
  ('22222222-2222-2222-2222-222222222222', 'LOG',   'Globex Logistics'),
  ('33333333-3333-3333-3333-333333333333', 'APP',   'TechCo Mobile App'),
  ('33333333-3333-3333-3333-333333333333', 'API',   'TechCo Public API'),
  ('33333333-3333-3333-3333-333333333333', 'INFRA', 'TechCo Infrastructure')
on conflict (client_id, code) do nothing;

-- one profile per role -------------------------------------------------------
do $$
declare
  v_super_admin   uuid;
  v_poc           uuid;
  v_specialist    uuid;
  v_delivery_lead uuid;
  v_client_admin  uuid;
  v_client_raiser uuid;
  v_client_viewer uuid;
  v_project_mbank uuid;
begin
  v_super_admin   := pg_temp.create_seed_user('admin@companyx.com',    'ChangeMe123!', 'Super Admin',    'super_admin',   null);
  v_poc           := pg_temp.create_seed_user('poc@companyx.com',      'ChangeMe123!', 'PoC User',       'poc',           null);
  v_specialist    := pg_temp.create_seed_user('specialist@companyx.com','ChangeMe123!', 'Tech Specialist','specialist',    null);
  v_delivery_lead := pg_temp.create_seed_user('delivery@companyx.com', 'ChangeMe123!', 'Delivery Lead',  'delivery_lead', null);
  v_client_admin  := pg_temp.create_seed_user('admin@acme-client.com', 'ChangeMe123!', 'Acme Admin',     'client_admin',  '11111111-1111-1111-1111-111111111111');
  v_client_raiser := pg_temp.create_seed_user('raiser@acme-client.com','ChangeMe123!', 'Acme Raiser',    'client_raiser', '11111111-1111-1111-1111-111111111111');
  v_client_viewer := pg_temp.create_seed_user('viewer@acme-client.com','ChangeMe123!', 'Acme Viewer',    'client_viewer', '11111111-1111-1111-1111-111111111111');

  select id into v_project_mbank from projects
    where client_id = '11111111-1111-1111-1111-111111111111' and code = 'MBANK';

  insert into project_members (project_id, user_id) values
    (v_project_mbank, v_poc),
    (v_project_mbank, v_specialist),
    (v_project_mbank, v_delivery_lead),
    (v_project_mbank, v_client_admin),
    (v_project_mbank, v_client_raiser),
    (v_project_mbank, v_client_viewer)
  on conflict (project_id, user_id) do nothing;

  -- tickets spread across all 7 lifecycle stages, for dashboard funnel data
  insert into tickets (
    client_id, project_id, category, status, title, description,
    raised_by, poc_id, specialist_id, delivery_lead_id,
    raised_at, poc_responded_at, requirement_completed_at,
    estimated_hours, client_approved_at, development_completed_at,
    actual_hours, delivered_at, closed_at
  ) values
    ('11111111-1111-1111-1111-111111111111', v_project_mbank, 'bug', 'raised',
     'Login button unresponsive on iOS', 'Tapping login does nothing on iOS 18.',
     v_client_raiser, null, null, null, now() - interval '1 day', null, null, null, null, null, null, null, null),

    ('11111111-1111-1111-1111-111111111111', v_project_mbank, 'bug', 'poc_triage',
     'Balance shows stale value after transfer', 'Balance not refreshing post-transfer.',
     v_client_raiser, v_poc, null, null, now() - interval '3 days', now() - interval '2 days', null, null, null, null, null, null, null),

    ('11111111-1111-1111-1111-111111111111', v_project_mbank, 'enhancement', 'requirement_estimation',
     'Add biometric login', 'Support Face ID / fingerprint login.',
     v_client_raiser, v_poc, v_specialist, null, now() - interval '6 days', now() - interval '5 days', null, null, null, null, null, null, null),

    ('11111111-1111-1111-1111-111111111111', v_project_mbank, 'enhancement', 'client_approval',
     'Add spending analytics widget', 'Monthly spend breakdown chart on dashboard.',
     v_client_raiser, v_poc, v_specialist, null, now() - interval '9 days', now() - interval '8 days', now() - interval '6 days', 16, null, null, null, null, null),

    ('11111111-1111-1111-1111-111111111111', v_project_mbank, 'bug', 'development',
     'Crash on opening statements tab', 'App crashes when opening PDF statement.',
     v_client_raiser, v_poc, v_specialist, null, now() - interval '12 days', now() - interval '11 days', now() - interval '9 days', 8, now() - interval '8 days', null, null, null, null),

    ('11111111-1111-1111-1111-111111111111', v_project_mbank, 'kt', 'delivery',
     'KT: New payments module', 'Knowledge transfer session for payments rewrite.',
     v_client_raiser, v_poc, v_specialist, v_delivery_lead, now() - interval '15 days', now() - interval '14 days', now() - interval '12 days', 24, now() - interval '10 days', now() - interval '3 days', 22, null, null),

    ('11111111-1111-1111-1111-111111111111', v_project_mbank, 'training', 'closed',
     'Training: Admin console walkthrough', 'Recorded walkthrough for client admins.',
     v_client_raiser, v_poc, v_specialist, v_delivery_lead, now() - interval '20 days', now() - interval '19 days', now() - interval '17 days', 4, now() - interval '15 days', now() - interval '10 days', 5, now() - interval '9 days', now() - interval '8 days');
end $$;
