-- Step 3 — medications + fuzzy search. Requires pg_trgm in the
-- `extensions` schema (see docs/ARCHITECTURE.md 3.2).

create schema if not exists extensions;
create extension if not exists pg_trgm with schema extensions;

-- Shared text normaliser: lowercase, strip French accents, replace every
-- run of non-alphanumeric characters with a single space, trim.
-- IMMUTABLE on purpose: it is safe in indexes and generated expressions.
-- The two translate() strings MUST stay the same length (29 chars each).
create or replace function public.mawjoud_normalize(input text)
returns text
language sql
immutable
strict
set search_path = ''
as $$
  select btrim(
    regexp_replace(
      translate(
        lower(input),
        'àáâãäåçèéêëìíîïñòóôõöùúûüýÿœæ',
        'aaaaaaceeeeiiiinooooouuuuyyoa'
      ),
      '[^a-z0-9]+', ' ', 'g'
    )
  );
$$;

comment on function public.mawjoud_normalize(text) is
  'Canonical search normalisation for Mawjoud. Applied to stored medication text AND to every user query, so the two are always comparable.';

create table if not exists public.medications (
  id            uuid        primary key default gen_random_uuid(),
  slug          text        not null unique,
  name          text        not null,
  generic_name  text        not null,
  form          text,
  category      text        not null,
  aliases       text[]      not null default '{}'::text[],
  is_active     boolean     not null default true,
  search_text   text        not null default '',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),

  constraint medications_slug_format
    check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  constraint medications_name_not_blank
    check (length(btrim(name)) > 0),
  constraint medications_generic_not_blank
    check (length(btrim(generic_name)) > 0),
  constraint medications_category_allowed
    check (category in ('thyroid', 'insulin', 'psychiatric', 'cancer_pain')),
  constraint medications_aliases_no_nulls
    check (array_position(aliases, null) is null)
);

comment on table public.medications is
  'The ~26 chronic / high-shortage medications Mawjoud tracks. Reference data, curated by hand. Read only through the FastAPI backend (service role); RLS denies anon/authenticated entirely.';
comment on column public.medications.slug is
  'Stable, human-readable public identifier. It is the URL key (/medicaments/<slug>) and the API path key. The uuid remains the internal FK and the write key.';
comment on column public.medications.form is
  'Presentation as dispensed, e.g. "Comprimé sécable, boîte de 30". Displayed verbatim; never parsed.';
comment on column public.medications.search_text is
  'DENORMALISED. Maintained by the medications_set_search_text trigger; never write it by hand. It is mawjoud_normalize(name || generic_name || aliases) and exists purely to back the GIN trigram index. It cannot be a GENERATED column: array_to_string() is STABLE, not IMMUTABLE.';

-- Keeps search_text in step with the columns it derives from.
create or replace function public.medications_set_search_text()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.search_text := public.mawjoud_normalize(
    coalesce(new.name, '') || ' ' ||
    coalesce(new.generic_name, '') || ' ' ||
    coalesce(array_to_string(new.aliases, ' '), '')
  );
  return new;
end;
$$;

drop trigger if exists medications_set_search_text on public.medications;
create trigger medications_set_search_text
  before insert or update of name, generic_name, aliases
  on public.medications
  for each row execute function public.medications_set_search_text();

drop trigger if exists medications_set_updated_at on public.medications;
create trigger medications_set_updated_at
  before update on public.medications
  for each row execute function public.set_updated_at();

-- The fuzzy-search index. Backs both `word_similarity` filtering and
-- `like '%…%'` containment on search_text.
create index if not exists medications_search_text_trgm
  on public.medications using gin (search_text extensions.gin_trgm_ops);

-- Cheap ordering support for the "all tracked medications" endpoint.
create index if not exists medications_category_name
  on public.medications (category, name)
  where is_active;

alter table public.medications enable row level security;

-- Intentionally ZERO policies (decision 2.12.2).
revoke all on table public.medications from anon, authenticated;
grant select on table public.medications to service_role;
