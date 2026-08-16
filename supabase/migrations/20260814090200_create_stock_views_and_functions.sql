-- Step 3 — derived read surfaces. See docs/ARCHITECTURE.md 3.4.

-- One row per (active medication × pharmacy), annotated with the most
-- recent stock report for that pair, or 'none' when there is no report.
-- The cross join is what produces the "no reports yet" rows: a left join
-- from stock_reports alone could never show a pharmacy that has never
-- been reported on.
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
  r.id                             as report_id
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
  'Derived current stock status. status is the enum value of the latest report cast to text, or the synthetic value ''none'' when no report exists. Invariant: status = ''none'' if and only if reported_at is null. Always query with a medication_id filter.';

alter view public.pharmacy_medication_status set (security_invoker = on);

revoke all on public.pharmacy_medication_status from anon, authenticated;
grant select on public.pharmacy_medication_status to service_role;

-- Fuzzy medication search.
--
-- Filtering uses word_similarity(), not similarity(): search_text is a
-- concatenation of name + generic_name + aliases, and plain similarity()
-- of a short query against a long string is always near zero.
-- word_similarity() scores the query against the best continuous extent
-- of the target, which is the question actually being asked.
--
-- Ranking is computed per field rather than against search_text, so a
-- brand-name hit outranks an alias hit at equal similarity. The weights
-- (1.00 name / 0.95 generic / 0.90 alias / 0.35 substring floor) and the
-- 0.4 candidate threshold are tuning constants — change them here, not
-- in application code.
create or replace function public.search_medications(
  q           text,
  max_results integer default 8
)
returns table (
  id           uuid,
  slug         text,
  name         text,
  generic_name text,
  form         text,
  category     text,
  score        real
)
language sql
stable
set search_path = ''
as $$
  with normalised as (
    select public.mawjoud_normalize(coalesce(q, '')) as q_norm
  ),
  candidates as (
    select
      m.id, m.slug, m.name, m.generic_name, m.form, m.category,
      greatest(
        extensions.word_similarity(n.q_norm, public.mawjoud_normalize(m.name)),
        0.95 * extensions.word_similarity(n.q_norm, public.mawjoud_normalize(m.generic_name)),
        0.90 * coalesce((
          select max(extensions.word_similarity(n.q_norm, public.mawjoud_normalize(a)))
          from unnest(m.aliases) as a
        ), 0),
        case when m.search_text like '%' || n.q_norm || '%' then 0.35 else 0 end
      )::real as score
    from public.medications m
    cross join normalised n
    where m.is_active
      and length(n.q_norm) >= 3
      and (
        m.search_text like '%' || n.q_norm || '%'
        or extensions.word_similarity(n.q_norm, m.search_text) >= 0.4
      )
  )
  select id, slug, name, generic_name, form, category, score
  from candidates
  order by score desc, name asc
  limit least(greatest(coalesce(max_results, 8), 1), 25);
$$;

comment on function public.search_medications(text, integer) is
  'Trigram medication search. Returns at most max_results (1..25) matches ordered by descending relevance. Queries shorter than 3 normalised characters return zero rows.';

-- CREATE FUNCTION grants EXECUTE to PUBLIC by default, which would let
-- anyone holding the anon key call this over PostgREST RPC.
revoke all on function public.search_medications(text, integer) from public, anon, authenticated;
grant execute on function public.search_medications(text, integer) to service_role;

revoke all on function public.mawjoud_normalize(text) from public, anon, authenticated;
grant execute on function public.mawjoud_normalize(text) to service_role;
