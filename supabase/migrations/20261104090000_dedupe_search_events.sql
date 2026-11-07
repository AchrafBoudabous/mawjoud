-- Hardening — bound the growth of public.search_events.
--
-- Before: every POST /api/medications/{slug}/views inserted a row, with
-- no rate limit. One client in a loop could grow the table without bound
-- (the Supabase free tier caps the database at 500 MB) while the
-- dashboard number stayed correct only because it counts DISTINCT
-- fingerprints.
--
-- After: at most one row per (medication, fingerprint) per 30 minutes.
-- viewers_7d = count(distinct viewer_fingerprint) is mathematically
-- unchanged by this dedupe; only the raw, undisplayed views_7d shrinks.
-- Rows with a NULL fingerprint (no resolvable client IP — rare) are still
-- inserted, preserving the fail-open contract.
-- Idempotent: safe to re-run.

create index if not exists search_events_fingerprint_recent
  on public.search_events (viewer_fingerprint, medication_id, created_at desc)
  where viewer_fingerprint is not null;

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
  where m.slug = p_slug
    and m.is_active
    and (
      p_fingerprint is null
      or not exists (
        select 1
        from public.search_events e
        where e.viewer_fingerprint = p_fingerprint
          and e.medication_id = m.id
          and e.created_at > now() - interval '30 minutes'
      )
    );
$$;

comment on function public.log_medication_view(text, text) is
  'Records one medication-page view, deduplicated to one row per (medication, fingerprint) per 30 minutes. No-op for unknown or inactive slugs.';

revoke all on function public.log_medication_view(text, text) from public, anon, authenticated;
grant execute on function public.log_medication_view(text, text) to service_role;
