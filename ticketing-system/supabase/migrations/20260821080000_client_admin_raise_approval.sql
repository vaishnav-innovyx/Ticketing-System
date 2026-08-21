-- A ticket raised by a client_raiser should not be visible to internal staff
-- until their client_admin approves it. Tickets raised by client_admin or
-- internal staff skip this gate (requires_admin_approval stays false).

alter table tickets add column requires_admin_approval boolean not null default false;
alter table tickets add column admin_approved_at timestamptz;
alter table tickets add column admin_approved_by uuid references profiles(id);
alter table tickets add column admin_rejected_at timestamptz;
alter table tickets add column admin_rejection_reason text;

-- Only a client admin (or super_admin) may set the approval/rejection fields,
-- regardless of which client writes to the row otherwise.
create or replace function enforce_admin_approval_fields() returns trigger as $$
begin
  if (
    new.admin_approved_at is distinct from old.admin_approved_at
    or new.admin_approved_by is distinct from old.admin_approved_by
    or new.admin_rejected_at is distinct from old.admin_rejected_at
    or new.admin_rejection_reason is distinct from old.admin_rejection_reason
  ) and auth_role() not in ('super_admin', 'client_admin') then
    raise exception 'Only a client admin can approve or reject a raised ticket';
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger enforce_admin_approval_fields before update on tickets
  for each row execute function enforce_admin_approval_fields();

-- tickets_select: internal roles (poc/specialist/delivery_lead) only see tickets
-- that don't require approval, or have already been approved. Client roles and
-- super_admin are unaffected — they need to see pending/rejected tickets too.
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
    auth_role() in ('client_admin', 'client_raiser', 'client_viewer')
    and exists (
      select 1 from project_members pm
      where pm.project_id = tickets.project_id and pm.user_id = auth.uid()
    )
  )
  or (auth_role() = 'client_admin' and client_id = auth_client_id())
);

-- tickets_update: same internal-role gate, mirrored for defense in depth.
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
    auth_role() in ('client_admin', 'client_raiser')
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
    auth_role() in ('client_admin', 'client_raiser')
    and exists (
      select 1 from project_members pm
      where pm.project_id = tickets.project_id and pm.user_id = auth.uid()
    )
  )
);
