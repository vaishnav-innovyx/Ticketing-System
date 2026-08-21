-- ticket_messages_insert (20260818123753_portal_extensions_rls.sql) only checked
-- project_members membership, not role, so client_viewer (meant to be read-only)
-- could post replies. Mirrors the tickets_update fix in 20260818124208.

drop policy if exists ticket_messages_insert on ticket_messages;

create policy ticket_messages_insert on ticket_messages for insert with check (
  auth_role() = 'super_admin'
  or (
    author_id = auth.uid()
    and auth_role() != 'client_viewer'
    and exists (
      select 1 from tickets t
      join project_members pm on pm.project_id = t.project_id
      where t.id = ticket_messages.ticket_id and pm.user_id = auth.uid()
    )
  )
);
