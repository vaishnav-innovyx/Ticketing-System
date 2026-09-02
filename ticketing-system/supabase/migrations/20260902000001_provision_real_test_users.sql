-- Migration: 20260902000001_provision_real_test_users.sql
-- Provisions 5 real test accounts mapped to system roles for Acme Corp & Acme Mobile Banking (MBANK).

create or replace function pg_temp.provision_test_user(
  p_email text, p_password text, p_full_name text,
  p_role user_role, p_client_id uuid
) returns uuid as $$
declare
  v_user_id uuid;
begin
  select id into v_user_id from auth.users where lower(email) = lower(p_email);
  if v_user_id is not null then
    -- Update existing profile role and client_id if needed
    update profiles set role = p_role, client_id = p_client_id, full_name = p_full_name where id = v_user_id;
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
  values (v_user_id, lower(p_email), p_full_name, p_role, p_client_id)
  on conflict (id) do update set role = EXCLUDED.role, client_id = EXCLUDED.client_id, full_name = EXCLUDED.full_name;

  return v_user_id;
end;
$$ language plpgsql;

do $$
declare
  v_client_acme   uuid := '11111111-1111-1111-1111-111111111111';
  v_project_mbank uuid;
  v_u_raiser      uuid;
  v_u_admin       uuid;
  v_u_spec        uuid;
  v_u_del         uuid;
  v_u_watcher     uuid;
begin
  -- Provision 5 real user accounts
  v_u_raiser  := pg_temp.provision_test_user('shelvinsunilphilip@gmail.com', 'ChangeMe123!', 'Shelvin Raiser', 'client_raiser', v_client_acme);
  v_u_admin   := pg_temp.provision_test_user('shelvin.sp@innovyxtechlabs.com', 'ChangeMe123!', 'Shelvin Project Admin', 'project_admin', v_client_acme);
  v_u_spec    := pg_temp.provision_test_user('sspgaming2020@gmail.com', 'ChangeMe123!', 'Shelvin Specialist Dev', 'specialist', null);
  v_u_del     := pg_temp.provision_test_user('shelvin4gta5@gmail.com', 'ChangeMe123!', 'Shelvin Delivery Lead', 'delivery_lead', null);
  v_u_watcher := pg_temp.provision_test_user('shelvinrcss@gmail.com', 'ChangeMe123!', 'Shelvin Watcher User', 'client_viewer', v_client_acme);

  -- Get project MBANK
  select id into v_project_mbank from projects
    where client_id = v_client_acme and code = 'MBANK';

  if v_project_mbank is not null then
    insert into project_members (project_id, user_id) values
      (v_project_mbank, v_u_raiser),
      (v_project_mbank, v_u_admin),
      (v_project_mbank, v_u_spec),
      (v_project_mbank, v_u_del),
      (v_project_mbank, v_u_watcher)
    on conflict (project_id, user_id) do nothing;
  end if;
end $$;
