-- Certificate-based pharmacy verification, reviewed by admins.
--   * ONE live account per pharmacy (a shared pharmacy e-mail; several
--     people may use it). A rejected request frees the pharmacy again.
--   * Every registration carries a certificate (private Storage bucket),
--     reviewed on /admin by someone listed in public.admin_users.
--   * A pharmacist may propose a pharmacy missing from the directory: it
--     is created hidden (is_public = false) and published on approval.
-- RLS posture UNCHANGED: service-role-only through FastAPI.
-- Idempotent: safe to re-run.

-- ---------------------------------------------------------------------
-- 1. Admins
-- ---------------------------------------------------------------------
create table if not exists public.admin_users (
  id            uuid        primary key default gen_random_uuid(),
  email         text        not null unique,
  auth_user_id  uuid        unique references auth.users(id) on delete set null,
  created_at    timestamptz not null default now(),

  constraint admin_users_email_normalised
    check (email = lower(btrim(email)) and email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$')
);

comment on table public.admin_users is
  'People allowed to open /admin and review pharmacist registrations. Add one with: insert into public.admin_users (email) values (''you@example.com''); — the Supabase Auth user (Authentication > Users > Add user) is linked on first sign-in.';

alter table public.admin_users enable row level security;
revoke all on table public.admin_users from anon, authenticated;
grant select, insert, update on table public.admin_users to service_role;

-- ---------------------------------------------------------------------
-- 2. Pharmacies: hidden until approved
-- ---------------------------------------------------------------------
alter table public.pharmacies add column if not exists is_public boolean not null default true;

comment on column public.pharmacies.is_public is
  'false = proposed by a pharmacist during registration and not yet approved. Hidden from every patient-facing read; published when an admin approves the request.';

create index if not exists pharmacies_public_governorate
  on public.pharmacies (governorate_slug, name) where is_public;

-- ---------------------------------------------------------------------
-- 3. Accounts: certificate + review trail + one per pharmacy
-- ---------------------------------------------------------------------
alter table public.pharmacist_accounts add column if not exists certificate_path         text;
alter table public.pharmacist_accounts add column if not exists certificate_content_type text;
alter table public.pharmacist_accounts add column if not exists certificate_uploaded_at  timestamptz;
alter table public.pharmacist_accounts add column if not exists reviewed_at              timestamptz;
alter table public.pharmacist_accounts add column if not exists reviewed_by_admin_id     uuid;
alter table public.pharmacist_accounts add column if not exists review_note              text;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'pharmacist_accounts_reviewed_by_fk'
                 and conrelid = 'public.pharmacist_accounts'::regclass) then
    alter table public.pharmacist_accounts add constraint pharmacist_accounts_reviewed_by_fk
      foreign key (reviewed_by_admin_id) references public.admin_users(id) on delete set null;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'pharmacist_accounts_review_note_len'
                 and conrelid = 'public.pharmacist_accounts'::regclass) then
    alter table public.pharmacist_accounts add constraint pharmacist_accounts_review_note_len
      check (review_note is null or length(review_note) <= 1000);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'pharmacist_accounts_certificate_type'
                 and conrelid = 'public.pharmacist_accounts'::regclass) then
    alter table public.pharmacist_accounts add constraint pharmacist_accounts_certificate_type
      check (certificate_content_type is null
             or certificate_content_type in ('application/pdf', 'image/jpeg', 'image/png', 'image/webp'));
  end if;
end
$$;

comment on column public.pharmacist_accounts.certificate_path is
  'Object path in the private pharmacy-certificates Storage bucket. Kept while the account exists; removed with it.';
comment on column public.pharmacist_accounts.review_note is
  'Reason given by the admin when rejecting or suspending. Shown to the pharmacist on their dashboard.';

-- One live account per pharmacy. Fails softly (notice) if legacy data
-- already has duplicates, so the rest of the migration still applies.
do $$
begin
  if exists (
    select pharmacy_id from public.pharmacist_accounts
    where status <> 'rejected' group by pharmacy_id having count(*) > 1
  ) then
    raise notice 'Several live accounts share a pharmacy; resolve them, then re-run this migration to enforce one account per pharmacy.';
  else
    create unique index if not exists pharmacist_accounts_one_per_pharmacy
      on public.pharmacist_accounts (pharmacy_id) where status <> 'rejected';
  end if;
end
$$;

-- ---------------------------------------------------------------------
-- 4. Patient-facing reads skip hidden pharmacies
-- ---------------------------------------------------------------------
create or replace view public.pharmacy_directory as
select
  p.id, p.name, p.name_ar, p.address, p.city, p.governorate, p.governorate_slug,
  p.lat, p.lng, p.phone, p.verified, p.is_24h, p.source,
  d.on_duty_until,
  p.is_public
from public.pharmacies p
left join lateral (
  select max(ds.ends_at) as on_duty_until
  from public.pharmacy_duty_shifts ds
  where ds.pharmacy_id = p.id and now() >= ds.starts_at and now() < ds.ends_at
) d on true;

alter view public.pharmacy_directory set (security_invoker = on);
revoke all on public.pharmacy_directory from anon, authenticated;
grant select on public.pharmacy_directory to service_role;

-- Same body as the national-scope definition, one column appended.
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
  p.governorate_slug               as governorate_slug,
  p.is_24h                         as is_24h,
  coalesce(c.agree_24h, 0)         as confirmations_24h,
  coalesce(c.disagree_24h, 0)      as contradictions_24h,
  coalesce(c.pharmacist_24h, false) as pharmacist_confirmed_24h,
  d.on_duty_until                  as on_duty_until,
  -- appended for certificate verification:
  p.is_public                      as pharmacy_is_public
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

alter view public.pharmacy_medication_status set (security_invoker = on);
revoke all on public.pharmacy_medication_status from anon, authenticated;
grant select on public.pharmacy_medication_status to service_role;

create or replace view public.governorate_overview as
select g.slug, g.iso_code, g.name_fr, g.name_ar, g.lat, g.lng, g.sort_order,
       count(p.id)::integer as pharmacy_count
from public.governorates g
left join public.pharmacies p on p.governorate_slug = g.slug and p.is_public
group by g.slug;

alter view public.governorate_overview set (security_invoker = on);
revoke all on public.governorate_overview from anon, authenticated;
grant select on public.governorate_overview to service_role;

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
  join public.pharmacies p on p.id = l.pharmacy_id and p.is_public
  group by l.medication_id, p.governorate_slug;
$$;

revoke all on function public.availability_by_governorate(uuid, integer) from public, anon, authenticated;
grant execute on function public.availability_by_governorate(uuid, integer) to service_role;

-- pharmacist_accounts now also needs delete (admin removes a rejected
-- request); pharmacies needs delete for an unapproved proposed one.
grant select, insert, update, delete on table public.pharmacist_accounts to service_role;
grant select, insert, update, delete on table public.pharmacies to service_role;

-- ---------------------------------------------------------------------
-- 5. Private Storage bucket for certificates (Supabase only)
-- ---------------------------------------------------------------------
-- No storage.objects policy is created: anon/authenticated can neither
-- read nor write; the backend (service role) uploads, and admins view
-- through 2-minute signed URLs.
do $$
begin
  if exists (select 1 from information_schema.tables where table_schema = 'storage' and table_name = 'buckets') then
    insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    values ('pharmacy-certificates', 'pharmacy-certificates', false, 5242880,
            array['application/pdf', 'image/jpeg', 'image/png', 'image/webp'])
    on conflict (id) do update set
      public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;
  else
    raise notice 'storage.buckets not found (not a Supabase database?) — create the private bucket "pharmacy-certificates" by hand.';
  end if;
end
$$;
