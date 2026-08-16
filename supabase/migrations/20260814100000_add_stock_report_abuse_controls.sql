-- Step 4 — abuse controls for public (unauthenticated) stock reporting.
-- Adds a coarse, non-reversible reporter fingerprint to stock_reports and
-- the one index the rate-limit lookup needs.
-- RLS posture is UNCHANGED: still zero policies, still revoked from
-- anon/authenticated, still service-role-only through FastAPI
-- (decisions 2.12.1 / 2.12.2). See docs/ARCHITECTURE.md 4.2–4.4.
-- Idempotent: safe to re-run.

alter table public.stock_reports
  add column if not exists reporter_fingerprint text;

comment on column public.stock_reports.reporter_fingerprint is
  'Coarse, non-reversible reporter identity: lowercase hex HMAC-SHA256 of "v1|<normalised client IP>" keyed with REPORT_FINGERPRINT_SECRET (IPv4 = exact address, IPv6 = /64 prefix). A RAW IP IS NEVER STORED. Used only to rate-limit the anonymous write path (ARCHITECTURE.md 4.4). NULL for every row not written by the public reporting endpoint: all seed rows, and every pharmacist report from step 5 onward.';

-- Format guard. Only rows the app writes carry a value, and it is always
-- a 64-character sha256 hex digest.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'stock_reports_fingerprint_format'
      and conrelid = 'public.stock_reports'::regclass
  ) then
    alter table public.stock_reports
      add constraint stock_reports_fingerprint_format
      check (
        reporter_fingerprint is null
        or reporter_fingerprint ~ '^[0-9a-f]{64}$'
      );
  end if;
end
$$;

-- THE index for the rate-limit lookup: "every report this fingerprint
-- made in the last 24 hours, newest first". Equality on the fingerprint
-- then created_at desc is exactly the query in ARCHITECTURE.md 4.5.
-- Partial, because the overwhelming majority of rows (seed data, and
-- later every pharmacist report) have no fingerprint and must not bloat
-- the index.
--
-- created_at, NOT reported_at: reported_at is the observation time and
-- step 5's pharmacist path may legitimately backdate it. created_at is
-- the insert time and is the only thing a rate limit may be based on.
create index if not exists stock_reports_fingerprint_recent
  on public.stock_reports (reporter_fingerprint, created_at desc)
  where reporter_fingerprint is not null;

-- Defensive no-op: adding a column does not re-grant anything, but the
-- deny-all posture is cheap to restate and expensive to lose.
revoke all on table public.stock_reports from anon, authenticated;
grant select, insert on table public.stock_reports to service_role;
