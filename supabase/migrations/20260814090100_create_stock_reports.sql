-- Step 3 — community stock reports. Append-only; the latest row per
-- (pharmacy, medication) IS the current status. See ARCHITECTURE.md 3.3.

do $$
begin
  if not exists (
    select 1 from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where t.typname = 'stock_status' and n.nspname = 'public'
  ) then
    create type public.stock_status as enum ('in_stock', 'out_of_stock', 'unsure');
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1 from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where t.typname = 'report_source' and n.nspname = 'public'
  ) then
    create type public.report_source as enum ('patient', 'pharmacist');
  end if;
end
$$;

create table if not exists public.stock_reports (
  id            uuid                 primary key default gen_random_uuid(),
  pharmacy_id   uuid                 not null references public.pharmacies(id)  on delete cascade,
  medication_id uuid                 not null references public.medications(id) on delete cascade,
  status        public.stock_status  not null,
  reported_by   public.report_source not null,
  reported_at   timestamptz          not null default now(),
  created_at    timestamptz          not null default now(),
  updated_at    timestamptz          not null default now(),

  constraint stock_reports_not_in_future
    check (reported_at <= now() + interval '5 minutes')
);

comment on table public.stock_reports is
  'Append-only log of community stock reports. The most recent row per (pharmacy_id, medication_id) is the current status; absence of a row means "no report yet". Never update or delete rows. Read/written only through the FastAPI backend (service role).';
comment on column public.stock_reports.reported_at is
  'When the observation was made. This is what the UI displays ("signalé il y a 2 heures"). created_at is the row insert time and exists only for audit; the two are equal for every report the app writes.';
comment on column public.stock_reports.reported_by is
  'Who observed it. Every step-3 seed row is ''patient'' — no pharmacist accounts exist until step 5.';

-- THE index for step 3's read pattern: "for medication X, the latest
-- report per pharmacy". Equality on medication_id, then ordered by
-- pharmacy_id, then reported_at desc — exactly a `distinct on
-- (pharmacy_id) … order by pharmacy_id, reported_at desc` plan, and
-- exactly the lateral top-1 in the view.
create index if not exists stock_reports_medication_pharmacy_recent
  on public.stock_reports (medication_id, pharmacy_id, reported_at desc);

drop trigger if exists stock_reports_set_updated_at on public.stock_reports;
create trigger stock_reports_set_updated_at
  before update on public.stock_reports
  for each row execute function public.set_updated_at();

alter table public.stock_reports enable row level security;

revoke all on table public.stock_reports from anon, authenticated;
grant select, insert on table public.stock_reports to service_role;
