-- Step 5 — search-visibility counters for the pharmacist dashboard.
-- One row per patient opening a medication availability page.
-- Deliberately minimal: medication, keyed IP hash, timestamp. Nothing else.
-- See docs/ARCHITECTURE.md 5.6.
-- Idempotent: safe to re-run.

create table if not exists public.search_events (
  id                 uuid        primary key default gen_random_uuid(),
  medication_id      uuid        not null references public.medications(id) on delete cascade,
  viewer_fingerprint text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),

  constraint search_events_fingerprint_format
    check (viewer_fingerprint is null or viewer_fingerprint ~ '^[0-9a-f]{64}$')
);

comment on table public.search_events is
  'Append-only log: one row each time a patient opens /medicaments/<slug>. Backs the "N recherches cette semaine" counter on the pharmacist dashboard. created_at IS the event time — there is no separate occurred_at because the two would always be equal. Read/written only through the FastAPI backend (service role).';
comment on column public.search_events.viewer_fingerprint is
  'Same keyed-hash scheme as stock_reports.reporter_fingerprint (ARCHITECTURE.md 4.2). NULL when no client IP could be resolved — this path fails OPEN (the event is still counted) because a metric must never break a page. Only used for count(distinct …); never exposed, never joined to a person.';

create index if not exists search_events_medication_recent
  on public.search_events (medication_id, created_at desc);

drop trigger if exists search_events_set_updated_at on public.search_events;
create trigger search_events_set_updated_at
  before update on public.search_events
  for each row execute function public.set_updated_at();

alter table public.search_events enable row level security;

-- Intentionally ZERO policies (decision 2.12.2).
revoke all on table public.search_events from anon, authenticated;
grant select, insert on table public.search_events to service_role;

-- Single round trip: resolve the slug and insert in one statement. An
-- unknown or inactive slug inserts nothing and is not an error — the
-- endpoint returns 204 either way, so a probe learns nothing.
create or replace function public.log_medication_view(
  p_slug        text,
  p_fingerprint text default null
)
returns void
language sql
volatile
set search_path = ''
as $$
  insert into public.search_events (medication_id, viewer_fingerprint)
  select m.id, p_fingerprint
  from public.medications m
  where m.slug = p_slug and m.is_active;
$$;

comment on function public.log_medication_view(text, text) is
  'Records one medication-page view. No-op for unknown or inactive slugs.';

revoke all on function public.log_medication_view(text, text) from public, anon, authenticated;
grant execute on function public.log_medication_view(text, text) to service_role;

-- Distinct viewers per medication over the last 7 days, one row per
-- active medication including zeros. A view rather than an RPC because
-- no parameter shapes the result (decision 3.18.9).
create or replace view public.medication_search_stats_7d as
select
  m.id                                   as medication_id,
  count(distinct e.viewer_fingerprint)   as viewers_7d,
  count(e.id)                            as views_7d
from public.medications m
left join public.search_events e
  on e.medication_id = m.id
 and e.created_at >= now() - interval '7 days'
where m.is_active
group by m.id;

comment on view public.medication_search_stats_7d is
  'viewers_7d = count(distinct viewer_fingerprint), which ignores NULLs. It is the number the dashboard displays. views_7d is raw and is NOT displayed anywhere; it exists for debugging. Per-medication distinct counts CANNOT be summed into a site-wide total (ARCHITECTURE.md 5.14).';

alter view public.medication_search_stats_7d set (security_invoker = on);

revoke all on public.medication_search_stats_7d from anon, authenticated;
grant select on public.medication_search_stats_7d to service_role;
