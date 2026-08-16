-- Step 5 — append medication metadata to pharmacy_medication_status so
-- the pharmacist dashboard can read its whole board in one query, without
-- a second copy of the "latest report wins" lateral.
-- The first 14 columns are byte-identical to step 3's definition and MUST
-- keep their names, types and order: create or replace view can only
-- append. See docs/ARCHITECTURE.md 5.7.
-- Idempotent: safe to re-run.

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
  -- appended in step 5:
  m.slug                           as medication_slug,
  m.name                           as medication_name,
  m.generic_name                   as generic_name,
  m.form                           as form,
  m.category                       as category
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
where m.is_active;

comment on view public.pharmacy_medication_status is
  'Derived current stock status. status is the enum value of the latest report cast to text, or the synthetic value ''none'' when no report exists. Invariant: status = ''none'' if and only if reported_at is null. Query it with a medication_id filter (patient results page) or a pharmacy_id filter (pharmacist dashboard) — never unfiltered.';

alter view public.pharmacy_medication_status set (security_invoker = on);

revoke all on public.pharmacy_medication_status from anon, authenticated;
grant select on public.pharmacy_medication_status to service_role;
