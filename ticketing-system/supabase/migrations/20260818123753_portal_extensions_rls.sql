-- RLS for portal extension tables + a private storage bucket for attachments.
-- Visibility mirrors ticket_events: any project_members row for the
-- ticket's project. Writes are restricted to project members too.

-- ticket_messages ------------------------------------------------------------
alter table ticket_messages enable row level security;

create policy ticket_messages_select on ticket_messages for select using (
  auth_role() = 'super_admin'
  or exists (
    select 1 from tickets t
    join project_members pm on pm.project_id = t.project_id
    where t.id = ticket_messages.ticket_id and pm.user_id = auth.uid()
  )
);

create policy ticket_messages_insert on ticket_messages for insert with check (
  auth_role() = 'super_admin'
  or (
    author_id = auth.uid()
    and exists (
      select 1 from tickets t
      join project_members pm on pm.project_id = t.project_id
      where t.id = ticket_messages.ticket_id and pm.user_id = auth.uid()
    )
  )
);

-- ticket_attachments -----------------------------------------------------------
alter table ticket_attachments enable row level security;

create policy ticket_attachments_select on ticket_attachments for select using (
  auth_role() = 'super_admin'
  or exists (
    select 1 from tickets t
    join project_members pm on pm.project_id = t.project_id
    where t.id = ticket_attachments.ticket_id and pm.user_id = auth.uid()
  )
);

create policy ticket_attachments_insert on ticket_attachments for insert with check (
  auth_role() = 'super_admin'
  or (
    uploaded_by = auth.uid()
    and exists (
      select 1 from tickets t
      join project_members pm on pm.project_id = t.project_id
      where t.id = ticket_attachments.ticket_id and pm.user_id = auth.uid()
    )
  )
);

-- ticket_watchers (CC) -----------------------------------------------------
alter table ticket_watchers enable row level security;

create policy ticket_watchers_select on ticket_watchers for select using (
  auth_role() = 'super_admin'
  or exists (
    select 1 from tickets t
    join project_members pm on pm.project_id = t.project_id
    where t.id = ticket_watchers.ticket_id and pm.user_id = auth.uid()
  )
);

create policy ticket_watchers_write on ticket_watchers for all using (
  auth_role() = 'super_admin'
  or exists (
    select 1 from tickets t
    join project_members pm on pm.project_id = t.project_id
    where t.id = ticket_watchers.ticket_id and pm.user_id = auth.uid()
  )
) with check (
  auth_role() = 'super_admin'
  or exists (
    select 1 from tickets t
    join project_members pm on pm.project_id = t.project_id
    where t.id = ticket_watchers.ticket_id and pm.user_id = auth.uid()
  )
);

-- storage bucket for ticket attachments -----------------------------------
-- objects are keyed as "{ticket_id}/{filename}" so policies can join back
-- to project_members via the ticket.
insert into storage.buckets (id, name, public)
values ('ticket-attachments', 'ticket-attachments', false)
on conflict (id) do nothing;

create policy ticket_attachments_storage_select on storage.objects for select using (
  bucket_id = 'ticket-attachments'
  and (
    auth_role() = 'super_admin'
    or exists (
      select 1 from tickets t
      join project_members pm on pm.project_id = t.project_id
      where t.id::text = (storage.foldername(name))[1] and pm.user_id = auth.uid()
    )
  )
);

create policy ticket_attachments_storage_insert on storage.objects for insert with check (
  bucket_id = 'ticket-attachments'
  and (
    auth_role() = 'super_admin'
    or exists (
      select 1 from tickets t
      join project_members pm on pm.project_id = t.project_id
      where t.id::text = (storage.foldername(name))[1] and pm.user_id = auth.uid()
    )
  )
);
