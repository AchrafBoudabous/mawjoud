-- Step 5 — pharmacist accounts. Claimed against existing pharmacies;
-- activated manually out of band. See docs/ARCHITECTURE.md 5.1-5.4.
-- Idempotent: safe to re-run.

do $$
begin
  if not exists (
    select 1 from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where t.typname = 'pharmacist_account_status' and n.nspname = 'public'
  ) then
    create type public.pharmacist_account_status as enum
      ('pending', 'active', 'rejected', 'suspended');
  end if;
end
$$;

create table if not exists public.pharmacist_accounts (
  id                       uuid        primary key default gen_random_uuid(),
  pharmacy_id              uuid        not null references public.pharmacies(id) on delete cascade,
  auth_user_id             uuid        unique references auth.users(id) on delete set null,
  email                    text        not null unique,
  full_name                text        not null,
  phone                    text        not null,
  status                   public.pharmacist_account_status not null default 'pending',
  status_note              text,
  activated_at             timestamptz,
  registration_fingerprint text,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now(),

  -- Stored already normalised, so PostgREST .eq("email", …) is a correct
  -- lookup without a functional index or a lower() filter.
  constraint pharmacist_accounts_email_normalised
    check (email = lower(btrim(email)) and length(email) between 5 and 254),
  constraint pharmacist_accounts_email_shape
    check (email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'),
  constraint pharmacist_accounts_full_name_length
    check (length(btrim(full_name)) between 2 and 120),
  constraint pharmacist_accounts_phone_tn_e164
    check (phone ~ '^\+216[0-9]{8}$'),
  constraint pharmacist_accounts_fingerprint_format
    check (registration_fingerprint is null or registration_fingerprint ~ '^[0-9a-f]{64}$'),
  -- An active account must carry an activation timestamp. Suspending or
  -- rejecting later keeps the historical value; only 'active' requires it.
  constraint pharmacist_accounts_activated_at_present
    check (status <> 'active' or activated_at is not null)
);

comment on table public.pharmacist_accounts is
  'One row per pharmacist. Claims an existing public.pharmacies row; never creates one. status starts at ''pending'' and is set to ''active'' MANUALLY by an operator after phoning the pharmacy''s own landline (ARCHITECTURE.md 5.2). Read/written only through the FastAPI backend (service role); RLS denies anon/authenticated entirely.';
comment on column public.pharmacist_accounts.auth_user_id is
  'Supabase auth.users id. NULL until the pharmacist first signs in; bound then by the FastAPI identity dependency, matching on the verified e-mail address (ARCHITECTURE.md 5.9.3).';
comment on column public.pharmacist_accounts.phone is
  'Phone the registrant supplied. Used ONLY as a fallback contact. Verification is done by calling pharmacies.phone, not this number. Never exposed by any endpoint.';
comment on column public.pharmacist_accounts.status_note is
  'Free-text operator note about the verification call. Never exposed by any endpoint.';
comment on column public.pharmacist_accounts.registration_fingerprint is
  'Same keyed-hash scheme as stock_reports.reporter_fingerprint (ARCHITECTURE.md 4.2). Rate-limits the unauthenticated registration endpoint. A RAW IP IS NEVER STORED.';

create index if not exists pharmacist_accounts_pharmacy_status
  on public.pharmacist_accounts (pharmacy_id, status);

-- Registration rate-limit lookup (ARCHITECTURE.md 5.10.1). Partial: most
-- rows over time will have had their fingerprint nulled or never had one.
create index if not exists pharmacist_accounts_registration_recent
  on public.pharmacist_accounts (registration_fingerprint, created_at desc)
  where registration_fingerprint is not null;

-- Stamp activated_at on the transition into 'active'.
create or replace function public.pharmacist_accounts_stamp_activation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status = 'active' and new.activated_at is null then
    new.activated_at := now();
  end if;
  return new;
end;
$$;

drop trigger if exists pharmacist_accounts_stamp_activation on public.pharmacist_accounts;
create trigger pharmacist_accounts_stamp_activation
  before insert or update of status on public.pharmacist_accounts
  for each row execute function public.pharmacist_accounts_stamp_activation();

drop trigger if exists pharmacist_accounts_set_updated_at on public.pharmacist_accounts;
create trigger pharmacist_accounts_set_updated_at
  before update on public.pharmacist_accounts
  for each row execute function public.set_updated_at();

-- pharmacies.verified is now DERIVED: true iff the pharmacy has at least
-- one active pharmacist account (ARCHITECTURE.md 5.2). Do not set it by
-- hand; the next account status change recomputes it.
create or replace function public.pharmacies_recompute_verified(p_pharmacy_id uuid)
returns void
language plpgsql
set search_path = ''
as $$
declare
  has_active boolean;
begin
  if p_pharmacy_id is null then
    return;
  end if;
  select exists (
    select 1 from public.pharmacist_accounts a
    where a.pharmacy_id = p_pharmacy_id and a.status = 'active'
  ) into has_active;
  update public.pharmacies
     set verified = has_active
   where id = p_pharmacy_id
     and verified is distinct from has_active;
end;
$$;

create or replace function public.pharmacist_accounts_refresh_verified()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  -- NEW and OLD are referenced only under the tg_op that defines them:
  -- touching NEW in a DELETE trigger raises at runtime.
  if tg_op in ('INSERT', 'UPDATE') then
    perform public.pharmacies_recompute_verified(new.pharmacy_id);
  end if;
  if tg_op in ('UPDATE', 'DELETE') then
    perform public.pharmacies_recompute_verified(old.pharmacy_id);
  end if;
  return null;
end;
$$;

drop trigger if exists pharmacist_accounts_refresh_verified on public.pharmacist_accounts;
create trigger pharmacist_accounts_refresh_verified
  after insert or delete or update of status, pharmacy_id
  on public.pharmacist_accounts
  for each row execute function public.pharmacist_accounts_refresh_verified();

alter table public.pharmacist_accounts enable row level security;

-- Intentionally ZERO policies (decision 2.12.2). Enabling Supabase Auth
-- does NOT grant the authenticated role anything: a signed-in pharmacist
-- still cannot read this table (or any other) directly.
revoke all on table public.pharmacist_accounts from anon, authenticated;
grant select, insert, update on table public.pharmacist_accounts to service_role;

revoke all on function public.pharmacies_recompute_verified(uuid) from public, anon, authenticated;
