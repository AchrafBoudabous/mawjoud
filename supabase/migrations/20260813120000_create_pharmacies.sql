-- Step 2 — pharmacy directory. First real schema in the project.

-- Shared trigger helper; reused by every future table with updated_at.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.pharmacies (
  id           uuid         primary key default gen_random_uuid(),
  name         text         not null,
  address      text         not null,
  city         text         not null default 'Bizerte',
  governorate  text         not null default 'Bizerte',
  lat          numeric(9,6) not null,
  lng          numeric(9,6) not null,
  phone        text,
  verified     boolean      not null default false,
  created_at   timestamptz  not null default now(),
  updated_at   timestamptz  not null default now(),

  constraint pharmacies_name_not_blank    check (length(btrim(name)) > 0),
  constraint pharmacies_address_not_blank check (length(btrim(address)) > 0),
  constraint pharmacies_city_not_blank    check (length(btrim(city)) > 0),
  constraint pharmacies_lat_tunisia       check (lat between 30 and 38),
  constraint pharmacies_lng_tunisia       check (lng between 7 and 12),
  constraint pharmacies_phone_tn_e164     check (phone is null or phone ~ '^\+216[0-9]{8}$')
);

comment on table public.pharmacies is
  'Pharmacies shown in the Mawjoud directory. Read only through the FastAPI backend (service role). RLS denies anon/authenticated entirely.';
comment on column public.pharmacies.phone is
  'Canonical E.164 Tunisian number, no spaces (e.g. +21672431210). Formatting for display happens in the frontend.';
comment on column public.pharmacies.verified is
  'True only once a human has confirmed the pharmacy exists and its details are correct. All seed rows are false.';

-- Guards against duplicate manual seeding / re-seeding typos.
create unique index if not exists pharmacies_name_address_uniq
  on public.pharmacies (lower(btrim(name)), lower(btrim(address)));

drop trigger if exists pharmacies_set_updated_at on public.pharmacies;
create trigger pharmacies_set_updated_at
  before update on public.pharmacies
  for each row execute function public.set_updated_at();

alter table public.pharmacies enable row level security;

-- Intentionally ZERO policies. RLS on + no policies = anon and
-- authenticated see and write nothing. The service role bypasses RLS, so
-- the FastAPI backend is unaffected. Revoking the grants Supabase issues
-- by default makes the same intent explicit at the privilege layer.
revoke all on table public.pharmacies from anon, authenticated;
