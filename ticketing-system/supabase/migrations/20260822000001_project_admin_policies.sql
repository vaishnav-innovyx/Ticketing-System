-- Step 2: Configure project-scoped approval enforcement and RLS policies for project_admin

-- Update client scope check on profiles
alter table profiles drop constraint if exists profiles_client_scope_chk;
alter table profiles add constraint profiles_client_scope_chk check (
  (role in ('client_admin', 'project_admin', 'client_raiser', 'client_viewer') and client_id is not null)
  or (role in ('super_admin', 'poc', 'specialist', 'delivery_lead') and client_id is null)
);

-- Trigger: strictly enforce that only assigned project_admins (or super_admin) can approve/reject raised tickets
create or replace function enforce_admin_approval_fields() returns trigger as $$
begin
  if (
    new.admin_approved_at is distinct from old.admin_approved_at
    or new.admin_approved_by is distinct from old.admin_approved_by
    or new.admin_rejected_at is distinct from old.admin_rejected_at
    or new.admin_rejection_reason is distinct from old.admin_rejection_reason
  ) then
    if auth_role() = 'super_admin' then
      -- super_admin allowed
    elsif auth_role() = 'project_admin' and exists (
      select 1 from project_members pm
      where pm.project_id = new.project_id and pm.user_id = auth.uid()
    ) then
      -- project_admin assigned to the ticket's project allowed
    else
      raise exception 'Only an assigned project admin can approve or reject a raised ticket';
    end if;
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

-- tickets_select: include project_admin for assigned projects
drop policy if exists tickets_select on tickets;

create policy tickets_select on tickets for select using (
  auth_role() = 'super_admin'
  or (
    auth_role() in ('poc', 'specialist', 'delivery_lead')
    and (not requires_admin_approval or admin_approved_at is not null)
    and exists (
      select 1 from project_members pm
      where pm.project_id = tickets.project_id and pm.user_id = auth.uid()
    )
  )
  or (
    auth_role() in ('client_admin', 'project_admin', 'client_raiser', 'client_viewer')
    and exists (
      select 1 from project_members pm
      where pm.project_id = tickets.project_id and pm.user_id = auth.uid()
    )
  )
  or (auth_role() = 'client_admin' and client_id = auth_client_id())
);

-- tickets_insert: allow project_admin for assigned projects
drop policy if exists tickets_insert on tickets;

create policy tickets_insert on tickets for insert with check (
  auth_role() = 'super_admin'
  or (
    auth_role() in ('client_admin', 'project_admin', 'client_raiser', 'poc', 'specialist', 'delivery_lead')
    and exists (
      select 1 from project_members pm
      where pm.project_id = tickets.project_id and pm.user_id = auth.uid()
    )
  )
);

-- tickets_update: allow project_admin for assigned projects
drop policy if exists tickets_update on tickets;

create policy tickets_update on tickets for update using (
  auth_role() = 'super_admin'
  or (
    auth_role() in ('poc', 'specialist', 'delivery_lead')
    and (not requires_admin_approval or admin_approved_at is not null)
    and exists (
      select 1 from project_members pm
      where pm.project_id = tickets.project_id and pm.user_id = auth.uid()
    )
  )
  or (
    auth_role() in ('client_admin', 'project_admin', 'client_raiser')
    and exists (
      select 1 from project_members pm
      where pm.project_id = tickets.project_id and pm.user_id = auth.uid()
    )
  )
) with check (
  auth_role() = 'super_admin'
  or (
    auth_role() in ('poc', 'specialist', 'delivery_lead')
    and (not requires_admin_approval or admin_approved_at is not null)
    and exists (
      select 1 from project_members pm
      where pm.project_id = tickets.project_id and pm.user_id = auth.uid()
    )
  )
  or (
    auth_role() in ('client_admin', 'project_admin', 'client_raiser')
    and exists (
      select 1 from project_members pm
      where pm.project_id = tickets.project_id and pm.user_id = auth.uid()
    )
  )
);
