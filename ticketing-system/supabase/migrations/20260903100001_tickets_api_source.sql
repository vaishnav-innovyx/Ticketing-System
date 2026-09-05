-- Migration: 20260903100001_tickets_api_source.sql
-- Adds columns needed for tickets created through the new public API
-- (POST /api/v1/tickets) rather than the authenticated portal form.

alter table tickets
  add column if not exists source text not null default 'portal',
  add column if not exists external_ref text,
  add column if not exists diagnostics jsonb;

alter table tickets
  add constraint tickets_source_check check (source in ('portal', 'api'));

comment on column tickets.source is 'portal | api -- how the ticket was created';
comment on column tickets.external_ref is 'Calling app''s own local record id, for correlation/debugging (API-created tickets only).';
comment on column tickets.diagnostics is 'Optional client-captured diagnostics bundle (console logs, network breadcrumbs, browser/env info) attached by API-created bug reports.';
