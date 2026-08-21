-- profiles_select (20260818114627_rls.sql) only let internal roles (poc/specialist/
-- delivery_lead) view co-project-members' profiles. Client roles had no equivalent
-- clause, so any embedded `profiles(...)` join on an internal staffer's row (message
-- authors, assigned POC/specialist/delivery_lead) silently returned null under RLS —
-- showing as "Unknown"/"Unassigned" in the portal even when correctly set.
--
-- Broaden the clause to apply to whoever shares a project, regardless of role — the
-- reciprocal direction (client visible to internal staff) already worked this way.

drop policy if exists profiles_select on profiles;

create policy profiles_select on profiles for select using (
  id = auth.uid()
  or auth_role() = 'super_admin'
  or exists (
        select 1 from project_members pm_self
        join project_members pm_target on pm_target.project_id = pm_self.project_id
        where pm_self.user_id = auth.uid() and pm_target.user_id = profiles.id
     )
  or (auth_role() = 'client_admin' and client_id = auth_client_id())
);
