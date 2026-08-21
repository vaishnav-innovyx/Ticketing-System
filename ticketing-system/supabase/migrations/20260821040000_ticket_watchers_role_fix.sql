-- ticket_watchers_write (20260818123753) was gated only by project membership,
-- not role, so client_viewer (meant to be read-only) could add/remove other
-- people's CC entries (AC-7). Mirrors the tickets_update / ticket_messages_insert fixes.

drop policy if exists ticket_watchers_write on ticket_watchers;

create policy ticket_watchers_write on ticket_watchers for all using (
  auth_role() = 'super_admin'
  or (
    auth_role() != 'client_viewer'
    and exists (
      select 1 from tickets t
      join project_members pm on pm.project_id = t.project_id
      where t.id = ticket_watchers.ticket_id and pm.user_id = auth.uid()
    )
  )
) with check (
  auth_role() = 'super_admin'
  or (
    auth_role() != 'client_viewer'
    and exists (
      select 1 from tickets t
      join project_members pm on pm.project_id = t.project_id
      where t.id = ticket_watchers.ticket_id and pm.user_id = auth.uid()
    )
  )
);
