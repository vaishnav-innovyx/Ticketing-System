-- Same class of gap as ticket_messages_insert / ticket_watchers_write: no role
-- exclusion for client_viewer, so a read-only account could upload attachments.

drop policy if exists ticket_attachments_insert on ticket_attachments;

create policy ticket_attachments_insert on ticket_attachments for insert with check (
  auth_role() = 'super_admin'
  or (
    uploaded_by = auth.uid()
    and auth_role() != 'client_viewer'
    and exists (
      select 1 from tickets t
      join project_members pm on pm.project_id = t.project_id
      where t.id = ticket_attachments.ticket_id and pm.user_id = auth.uid()
    )
  )
);
