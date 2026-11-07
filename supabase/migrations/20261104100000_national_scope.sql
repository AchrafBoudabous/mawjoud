-- National scope — Mawjoud covers all 24 governorates of Tunisia, not
-- just Bizerte. Adds:
--   * public.governorates (reference data, 24 rows)
--   * pharmacies.governorate_slug / is_24h / source / osm_ref / name_ar
--   * public.pharmacy_duty_shifts (pharmacies de garde)
--   * Arabic-aware search normalisation
--   * confidence + on-duty columns on pharmacy_medication_status
--   * governorate-scoped search stats, observatory read functions
-- RLS posture UNCHANGED: every object is service-role-only through
-- FastAPI; anon/authenticated get nothing.
-- Idempotent: safe to re-run.

-- ---------------------------------------------------------------------
-- 1. Governorates
-- ---------------------------------------------------------------------
create table if not exists public.governorates (
  slug        text         primary key,
  iso_code    text         not null unique,
  name_fr     text         not null,
  name_ar     text         not null,
  -- Seat of the governorate. Used by the browser to pick the nearest
  -- governorate from the user's position, client-side only.
  lat         numeric(9,6) not null,
  lng         numeric(9,6) not null,
  sort_order  integer      not null,

  constraint governorates_slug_format check (slug ~ '^[a-z]+(-[a-z]+)*$'),
  constraint governorates_iso_format  check (iso_code ~ '^TN-[0-9]{2}$')
);

comment on table public.governorates is
  'The 24 governorates of Tunisia. Reference data. lat/lng is the governorate seat, used only for client-side "nearest governorate".';

insert into public.governorates (slug, iso_code, name_fr, name_ar, lat, lng, sort_order) values
  ('tunis',       'TN-11', 'Tunis',       'تونس',       36.806500, 10.181500,  1),
  ('ariana',      'TN-12', 'Ariana',      'أريانة',     36.862500, 10.195600,  2),
  ('ben-arous',   'TN-13', 'Ben Arous',   'بن عروس',    36.753100, 10.218900,  3),
  ('manouba',     'TN-14', 'Manouba',     'منوبة',      36.810100, 10.095600,  4),
  ('nabeul',      'TN-21', 'Nabeul',      'نابل',       36.456100, 10.737600,  5),
  ('zaghouan',    'TN-22', 'Zaghouan',    'زغوان',      36.402900, 10.142900,  6),
  ('bizerte',     'TN-23', 'Bizerte',     'بنزرت',      37.274400,  9.873900,  7),
  ('beja',        'TN-31', 'Béja',        'باجة',       36.725600,  9.181700,  8),
  ('jendouba',    'TN-32', 'Jendouba',    'جندوبة',     36.501100,  8.780200,  9),
  ('le-kef',      'TN-33', 'Le Kef',      'الكاف',      36.182600,  8.714900, 10),
  ('siliana',     'TN-34', 'Siliana',     'سليانة',     36.084900,  9.370800, 11),
  ('kairouan',    'TN-41', 'Kairouan',    'القيروان',   35.678100, 10.096300, 12),
  ('kasserine',   'TN-42', 'Kasserine',   'القصرين',    35.167600,  8.836500, 13),
  ('sidi-bouzid', 'TN-43', 'Sidi Bouzid', 'سيدي بوزيد', 35.038200,  9.484900, 14),
  ('sousse',      'TN-51', 'Sousse',      'سوسة',       35.825600, 10.608400, 15),
  ('monastir',    'TN-52', 'Monastir',    'المنستير',   35.764300, 10.811300, 16),
  ('mahdia',      'TN-53', 'Mahdia',      'المهدية',    35.504700, 11.062200, 17),
  ('sfax',        'TN-61', 'Sfax',        'صفاقس',      34.740600, 10.760300, 18),
  ('gafsa',       'TN-71', 'Gafsa',       'قفصة',       34.425000,  8.784200, 19),
  ('tozeur',      'TN-72', 'Tozeur',      'توزر',       33.919700,  8.133500, 20),
  ('kebili',      'TN-73', 'Kébili',      'قبلي',       33.704400,  8.969000, 21),
  ('gabes',       'TN-81', 'Gabès',       'قابس',       33.881500, 10.098200, 22),
  ('medenine',    'TN-82', 'Médenine',    'مدنين',      33.354900, 10.505500, 23),
  ('tataouine',   'TN-83', 'Tataouine',   'تطاوين',     32.929700, 10.451800, 24)
on conflict (slug) do update set
  iso_code = excluded.iso_code, name_fr = excluded.name_fr, name_ar = excluded.name_ar,
  lat = excluded.lat, lng = excluded.lng, sort_order = excluded.sort_order;

alter table public.governorates enable row level security;
revoke all on table public.governorates from anon, authenticated;
grant select on table public.governorates to service_role;

-- ---------------------------------------------------------------------
-- 2. Pharmacies: governorate, provenance, 24 h flag
-- ---------------------------------------------------------------------
alter table public.pharmacies add column if not exists governorate_slug text;
alter table public.pharmacies add column if not exists is_24h  boolean not null default false;
alter table public.pharmacies add column if not exists source  text    not null default 'manual';
alter table public.pharmacies add column if not exists osm_ref text;
alter table public.pharmacies add column if not exists name_ar text;

comment on column public.pharmacies.source is
  '''demo'' = fictional development rows from seed.sql; ''osm'' = imported from OpenStreetMap (ODbL, see scripts/import_osm_pharmacies.py); ''manual'' = added by an operator.';
comment on column public.pharmacies.osm_ref is
  'OpenStreetMap element reference, e.g. node/123456. Upsert key for the OSM import.';
comment on column public.pharmacies.is_24h is
  'Open around the clock (OSM opening_hours=24/7, or set by an operator).';

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'pharmacies_source_allowed'
                 and conrelid = 'public.pharmacies'::regclass) then
    alter table public.pharmacies
      add constraint pharmacies_source_allowed check (source in ('demo', 'osm', 'manual'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'pharmacies_governorate_fk'
                 and conrelid = 'public.pharmacies'::regclass) then
    alter table public.pharmacies
      add constraint pharmacies_governorate_fk foreign key (governorate_slug)
      references public.governorates(slug);
  end if;
end
$$;

-- The step-2 seed rows are fiction; flag them so the OSM import can
-- retire them without touching anything real.
update public.pharmacies
   set source = 'demo'
 where id::text like '00000000-0000-4000-8000-%' and source = 'manual';

-- Backfill from the free-text governorate name.
update public.pharmacies p
   set governorate_slug = g.slug
  from public.governorates g
 where p.governorate_slug is null
   and lower(public.mawjoud_normalize(p.governorate)) = lower(public.mawjoud_normalize(g.name_fr));

-- governorate (display name) is now derived from governorate_slug.
create or replace function public.pharmacies_sync_governorate()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.governorate_slug is not null then
    select g.name_fr into new.governorate
      from public.governorates g where g.slug = new.governorate_slug;
  end if;
  return new;
end;
$$;

drop trigger if exists pharmacies_sync_governorate on public.pharmacies;
create trigger pharmacies_sync_governorate
  before insert or update of governorate_slug on public.pharmacies
  for each row execute function public.pharmacies_sync_governorate();

do $$
begin
  if not exists (select 1 from public.pharmacies where governorate_slug is null) then
    alter table public.pharmacies alter column governorate_slug set not null;
  else
    raise notice 'Some pharmacies have no governorate_slug; NOT NULL deferred until they are fixed.';
  end if;
end
$$;

create unique index if not exists pharmacies_osm_ref_uniq
  on public.pharmacies (osm_ref) where osm_ref is not null;

-- OSM data routinely has several "Pharmacie" entries with the same
-- fallback address; the name+address guard only makes sense for rows
-- typed in by hand.
drop index if exists public.pharmacies_name_address_uniq;
create unique index if not exists pharmacies_name_address_uniq
  on public.pharmacies (lower(btrim(name)), lower(btrim(address)))
  where source <> 'osm';

create index if not exists pharmacies_governorate_name
  on public.pharmacies (governorate_slug, name);

-- ---------------------------------------------------------------------
-- 3. Pharmacies de garde
-- ---------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_type t join pg_namespace n on n.oid = t.typnamespace
                 where t.typname = 'duty_kind' and n.nspname = 'public') then
    create type public.duty_kind as enum ('night', 'weekend', 'holiday');
  end if;
end
$$;

create table if not exists public.pharmacy_duty_shifts (
  id                      uuid             primary key default gen_random_uuid(),
  pharmacy_id             uuid             not null references public.pharmacies(id) on delete cascade,
  kind                    public.duty_kind not null,
  starts_at               timestamptz      not null,
  ends_at                 timestamptz      not null,
  created_by_account_id   uuid             references public.pharmacist_accounts(id) on delete set null,
  created_at              timestamptz      not null default now(),
  updated_at              timestamptz      not null default now(),

  constraint duty_shifts_order    check (ends_at > starts_at),
  -- A garde is a night or a weekend/holiday block, never a month.
  constraint duty_shifts_max_len  check (ends_at - starts_at <= interval '72 hours')
);

comment on table public.pharmacy_duty_shifts is
  'Declared on-duty ("de garde") periods. Written by the pharmacy''s own active pharmacist through FastAPI. A pharmacy is on duty when now() is between starts_at and ends_at.';

create index if not exists duty_shifts_pharmacy_window
  on public.pharmacy_duty_shifts (pharmacy_id, ends_at desc, starts_at);
create index if not exists duty_shifts_window
  on public.pharmacy_duty_shifts (ends_at, starts_at);

drop trigger if exists duty_shifts_set_updated_at on public.pharmacy_duty_shifts;
create trigger duty_shifts_set_updated_at
  before update on public.pharmacy_duty_shifts
  for each row execute function public.set_updated_at();

alter table public.pharmacy_duty_shifts enable row level security;
revoke all on table public.pharmacy_duty_shifts from anon, authenticated;
grant select, insert, delete on table public.pharmacy_duty_shifts to service_role;

-- Pharmacy directory read surface: pharmacies + current garde.
create or replace view public.pharmacy_directory as
select
  p.id, p.name, p.name_ar, p.address, p.city, p.governorate, p.governorate_slug,
  p.lat, p.lng, p.phone, p.verified, p.is_24h, p.source,
  d.on_duty_until
from public.pharmacies p
left join lateral (
  select max(ds.ends_at) as on_duty_until
  from public.pharmacy_duty_shifts ds
  where ds.pharmacy_id = p.id and now() >= ds.starts_at and now() < ds.ends_at
) d on true;

alter view public.pharmacy_directory set (security_invoker = on);
revoke all on public.pharmacy_directory from anon, authenticated;
grant select on public.pharmacy_directory to service_role;

-- ---------------------------------------------------------------------
-- 4. Arabic-aware search normalisation
-- ---------------------------------------------------------------------
-- Latin: lowercase, strip French accents. Arabic: unify alef/hamza
-- forms, taa marbuta -> haa, alef maqsura -> yaa, Arabic-Indic digits ->
-- ASCII, drop tashkeel and tatweel. Every run of anything that is not a
-- Latin letter, digit or Arabic letter becomes one space.
-- The two translate() strings MUST stay the same length.
create or replace function public.mawjoud_normalize(input text)
returns text
language sql
immutable
strict
set search_path = ''
as $$
  select btrim(
    regexp_replace(
      regexp_replace(
        translate(
          lower(input),
          'àáâãäåçèéêëìíîïñòóôõöùúûüýÿœæ' || 'أإآٱةىؤئ' || '٠١٢٣٤٥٦٧٨٩',
          'aaaaaaceeeeiiiinooooouuuuyyoa' || 'ااااهيوي' || '0123456789'
        ),
        '[ً-ٰٟـ]', '', 'g'
      ),
      '[^a-z0-9ء-ي]+', ' ', 'g'
    )
  );
$$;

comment on function public.mawjoud_normalize(text) is
  'Canonical search normalisation (French + Arabic). Applied to stored medication text AND every user query.';

revoke all on function public.mawjoud_normalize(text) from public, anon, authenticated;
grant execute on function public.mawjoud_normalize(text) to service_role;

-- Recompute search_text with the new normaliser (the trigger fires on
-- update of aliases).
update public.medications set aliases = aliases;

-- ---------------------------------------------------------------------
-- 5. Current status, with confidence and garde
-- ---------------------------------------------------------------------
-- The first 19 columns are byte-identical to the step-5 definition and
-- MUST keep their names, types and order (create or replace view can
-- only append).
create or replace view public.pharmacy_medication_status as
select
  m.id                             as medication_id,
  p.id                             as pharmacy_id,
  p.name                           as pharmacy_name,
  p.address                        as address,
  p.city                           as city,
  p.governorate                    as governorate,
  p.lat                            as lat,
  p.lng                            as lng,
  p.phone                          as phone,
  p.verified                       as verified,
  coalesce(r.status::text, 'none') as status,
  r.reported_at                    as reported_at,
  r.reported_by::text              as reported_by,
  r.id                             as report_id,
  m.slug                           as medication_slug,
  m.name                           as medication_name,
  m.generic_name                   as generic_name,
  m.form                           as form,
  m.category                       as category,
  -- appended for national scope:
  p.governorate_slug               as governorate_slug,
  p.is_24h                         as is_24h,
  -- Distinct reporters in the last 24 h who agree / disagree with the
  -- current status. A pharmacist account counts as one reporter; a
  -- report with no identity (seed data) counts as one each.
  coalesce(c.agree_24h, 0)         as confirmations_24h,
  coalesce(c.disagree_24h, 0)      as contradictions_24h,
  coalesce(c.pharmacist_24h, false) as pharmacist_confirmed_24h,
  d.on_duty_until                  as on_duty_until
from public.medications m
cross join public.pharmacies p
left join lateral (
  select sr.id, sr.status, sr.reported_by, sr.reported_at
  from public.stock_reports sr
  where sr.medication_id = m.id
    and sr.pharmacy_id   = p.id
  order by sr.reported_at desc, sr.id desc
  limit 1
) r on true
left join lateral (
  select
    count(distinct coalesce(sr.reporter_fingerprint, sr.reported_by_account_id::text, sr.id::text))
      filter (where sr.status = r.status)  as agree_24h,
    count(distinct coalesce(sr.reporter_fingerprint, sr.reported_by_account_id::text, sr.id::text))
      filter (where sr.status <> r.status) as disagree_24h,
    bool_or(sr.reported_by = 'pharmacist' and sr.status = r.status) as pharmacist_24h
  from public.stock_reports sr
  where r.id is not null
    and sr.medication_id = m.id
    and sr.pharmacy_id   = p.id
    and sr.reported_at  >= now() - interval '24 hours'
) c on true
left join lateral (
  select max(ds.ends_at) as on_duty_until
  from public.pharmacy_duty_shifts ds
  where ds.pharmacy_id = p.id and now() >= ds.starts_at and now() < ds.ends_at
) d on true
where m.is_active;

comment on view public.pharmacy_medication_status is
  'Derived current stock status + 24 h confidence + current garde. Query with a medication_id AND governorate_slug filter (patient page) or a pharmacy_id filter (dashboard) — never unfiltered.';

alter view public.pharmacy_medication_status set (security_invoker = on);
revoke all on public.pharmacy_medication_status from anon, authenticated;
grant select on public.pharmacy_medication_status to service_role;

-- ---------------------------------------------------------------------
-- 6. Search events scoped by governorate
-- ---------------------------------------------------------------------
alter table public.search_events add column if not exists governorate_slug text;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'search_events_governorate_fk'
                 and conrelid = 'public.search_events'::regclass) then
    alter table public.search_events add constraint search_events_governorate_fk
      foreign key (governorate_slug) references public.governorates(slug) on delete set null;
  end if;
end
$$;

create index if not exists search_events_gov_recent
  on public.search_events (governorate_slug, medication_id, created_at desc);

-- Replace the 2-argument version: keeping both overloads would make the
-- PostgREST named-argument call ambiguous.
drop function if exists public.log_medication_view(text, text);

create or replace function public.log_medication_view(
  p_slug        text,
  p_fingerprint text default null,
  p_governorate text default null
)
returns void
language sql
volatile
set search_path = ''
as $$
  insert into public.search_events (medication_id, viewer_fingerprint, governorate_slug)
  select m.id, p_fingerprint, g.slug
  from public.medications m
  left join public.governorates g on g.slug = p_governorate
  where m.slug = p_slug
    and m.is_active
    and (
      p_fingerprint is null
      or not exists (
        select 1 from public.search_events e
        where e.viewer_fingerprint = p_fingerprint
          and e.medication_id = m.id
          and e.governorate_slug is not distinct from g.slug
          and e.created_at > now() - interval '30 minutes'
      )
    );
$$;

comment on function public.log_medication_view(text, text, text) is
  'Records one medication-page view (optionally for a governorate), deduplicated per (medication, fingerprint, governorate) per 30 minutes. No-op for unknown or inactive slugs; an unknown governorate is stored as NULL.';

revoke all on function public.log_medication_view(text, text, text) from public, anon, authenticated;
grant execute on function public.log_medication_view(text, text, text) to service_role;

-- Distinct viewers per (medication, governorate) over 7 days. Backs the
-- pharmacist dashboard's "N recherches près de chez vous".
create or replace view public.medication_search_stats_7d_by_governorate as
select
  e.medication_id,
  e.governorate_slug,
  count(distinct e.viewer_fingerprint) as viewers_7d
from public.search_events e
where e.created_at >= now() - interval '7 days'
  and e.governorate_slug is not null
group by e.medication_id, e.governorate_slug;

alter view public.medication_search_stats_7d_by_governorate set (security_invoker = on);
revoke all on public.medication_search_stats_7d_by_governorate from anon, authenticated;
grant select on public.medication_search_stats_7d_by_governorate to service_role;

-- ---------------------------------------------------------------------
-- 7. Observatory + national overview read functions
-- ---------------------------------------------------------------------
-- Latest report per (pharmacy, medication) within p_max_age_days,
-- counted per governorate. Cheap: reads stock_reports only, never the
-- medications x pharmacies cross join.
create or replace function public.availability_by_governorate(
  p_medication_id uuid    default null,
  p_max_age_days  integer default 30
)
returns table (
  medication_id    uuid,
  governorate_slug text,
  in_stock         integer,
  out_of_stock     integer,
  unsure           integer,
  last_report_at   timestamptz
)
language sql
stable
set search_path = ''
as $$
  with latest as (
    select distinct on (sr.pharmacy_id, sr.medication_id)
      sr.pharmacy_id, sr.medication_id, sr.status, sr.reported_at
    from public.stock_reports sr
    join public.medications m on m.id = sr.medication_id and m.is_active
    where sr.reported_at >= now() - make_interval(days => least(greatest(coalesce(p_max_age_days, 30), 1), 365))
      and (p_medication_id is null or sr.medication_id = p_medication_id)
    order by sr.pharmacy_id, sr.medication_id, sr.reported_at desc, sr.id desc
  )
  select
    l.medication_id,
    p.governorate_slug,
    count(*) filter (where l.status = 'in_stock')::integer,
    count(*) filter (where l.status = 'out_of_stock')::integer,
    count(*) filter (where l.status = 'unsure')::integer,
    max(l.reported_at)
  from latest l
  join public.pharmacies p on p.id = l.pharmacy_id
  group by l.medication_id, p.governorate_slug;
$$;

-- Weekly series per medication: reports by status + distinct viewers
-- (demand). Weeks start on Monday, Tunis time (fixed UTC+1: no DST since
-- 2009 — same convention as frontend/src/lib/format.ts).
create or replace function public.observatory_weekly(p_weeks integer default 12)
returns table (
  medication_id        uuid,
  week_start           date,
  in_stock_reports     integer,
  out_of_stock_reports integer,
  viewers              integer
)
language sql
stable
set search_path = ''
as $$
  with bounds as (
    select least(greatest(coalesce(p_weeks, 12), 1), 52) as n,
           date_trunc('week', (now() at time zone interval '+01:00'))::date as this_week
  ),
  weeks as (
    select (b.this_week - (i * 7))::date as week_start
    from bounds b, generate_series(0, (select n from bounds) - 1) as i
  ),
  reports as (
    select sr.medication_id,
           date_trunc('week', sr.reported_at at time zone interval '+01:00')::date as week_start,
           count(*) filter (where sr.status = 'in_stock')     as ins,
           count(*) filter (where sr.status = 'out_of_stock') as outs
    from public.stock_reports sr
    where sr.reported_at >= (select min(week_start) from weeks)::timestamp at time zone interval '+01:00'
    group by 1, 2
  ),
  views as (
    select e.medication_id,
           date_trunc('week', e.created_at at time zone interval '+01:00')::date as week_start,
           count(distinct e.viewer_fingerprint) as viewers
    from public.search_events e
    where e.created_at >= (select min(week_start) from weeks)::timestamp at time zone interval '+01:00'
    group by 1, 2
  )
  select m.id, w.week_start,
         coalesce(r.ins, 0)::integer, coalesce(r.outs, 0)::integer, coalesce(v.viewers, 0)::integer
  from public.medications m
  cross join weeks w
  left join reports r on r.medication_id = m.id and r.week_start = w.week_start
  left join views   v on v.medication_id = m.id and v.week_start = w.week_start
  where m.is_active
  order by m.id, w.week_start;
$$;

-- Pharmacies per governorate, for the governorate picker.
create or replace view public.governorate_overview as
select g.slug, g.iso_code, g.name_fr, g.name_ar, g.lat, g.lng, g.sort_order,
       count(p.id)::integer as pharmacy_count
from public.governorates g
left join public.pharmacies p on p.governorate_slug = g.slug
group by g.slug;

alter view public.governorate_overview set (security_invoker = on);
revoke all on public.governorate_overview from anon, authenticated;
grant select on public.governorate_overview to service_role;

revoke all on function public.availability_by_governorate(uuid, integer) from public, anon, authenticated;
grant execute on function public.availability_by_governorate(uuid, integer) to service_role;
revoke all on function public.observatory_weekly(integer) from public, anon, authenticated;
grant execute on function public.observatory_weekly(integer) to service_role;
revoke all on function public.pharmacies_sync_governorate() from public, anon, authenticated;
