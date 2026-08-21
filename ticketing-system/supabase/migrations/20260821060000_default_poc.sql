-- No per-project default assignee (WF-8), so every new ticket started fully
-- unassigned regardless of the project having an obvious default POC.

alter table projects add column default_poc_id uuid references profiles(id);
