# Supabase — schema & seed data

Plain `.sql` files, applied manually. No Supabase CLI, no ORM, no
migration runner — this project deliberately keeps that dependency out
for now (see `docs/ARCHITECTURE.md`, step 2, section 2.1).

## How to apply

1. Open the hosted Supabase project → **SQL Editor**.
2. Apply every file in `migrations/` **in filename order** (the
   timestamp prefix is the order). Currently:
   - `migrations/20260813120000_create_pharmacies.sql`
   - `migrations/20260814090000_create_medications.sql`
   - `migrations/20260814090100_create_stock_reports.sql`
   - `migrations/20260814090200_create_stock_views_and_functions.sql`
   - `migrations/20260814100000_add_stock_report_abuse_controls.sql`
   - `migrations/20260815090000_create_pharmacist_accounts.sql`
   - `migrations/20260815090100_add_stock_report_pharmacist_attribution.sql`
   - `migrations/20260815090200_create_search_events.sql`
   - `migrations/20260815090300_extend_pharmacy_medication_status.sql`
3. Apply `seed.sql` last.

Alternatively, from a machine with `psql` and the project's connection
string:

```
psql "$SUPABASE_DB_URL" -f supabase/migrations/20260813120000_create_pharmacies.sql
psql "$SUPABASE_DB_URL" -f supabase/migrations/20260814090000_create_medications.sql
psql "$SUPABASE_DB_URL" -f supabase/migrations/20260814090100_create_stock_reports.sql
psql "$SUPABASE_DB_URL" -f supabase/migrations/20260814090200_create_stock_views_and_functions.sql
psql "$SUPABASE_DB_URL" -f supabase/migrations/20260814100000_add_stock_report_abuse_controls.sql
psql "$SUPABASE_DB_URL" -f supabase/migrations/20260815090000_create_pharmacist_accounts.sql
psql "$SUPABASE_DB_URL" -f supabase/migrations/20260815090100_add_stock_report_pharmacist_attribution.sql
psql "$SUPABASE_DB_URL" -f supabase/migrations/20260815090200_create_search_events.sql
psql "$SUPABASE_DB_URL" -f supabase/migrations/20260815090300_extend_pharmacy_medication_status.sql
psql "$SUPABASE_DB_URL" -f supabase/seed.sql
```

## Rules

- Every migration is written to be **re-runnable** (`create ... if not
  exists`, `create or replace`, `drop trigger if exists`, etc.). Nobody
  is tracking which migrations have already run against the hosted
  project, so idempotency is the safety net.
- `seed.sql` is idempotent too (`on conflict ... do update`) — safe to
  re-run.
- **Never edit a migration that has already been applied to the hosted
  project.** Add a new migration file instead, with a new timestamp
  prefix.
- File names follow the Supabase CLI convention
  (`migrations/<YYYYMMDDHHMMSS>_<name>.sql`, `seed.sql` at the
  `supabase/` root) so adopting `supabase db push` later, if ever
  needed, is a no-op.
- `pg_trgm` must live in the `extensions` schema; every reference to it
  in this project is schema-qualified (see `docs/ARCHITECTURE.md`,
  step 3, section 3.2).
- `stock_reports.reporter_fingerprint` is a keyed hash — never store, log
  or expose a raw IP address. The same applies to
  `pharmacist_accounts.registration_fingerprint` and
  `search_events.viewer_fingerprint` (step 5).
- `pharmacies.verified` is derived by trigger from
  `pharmacist_accounts.status`. Do not set it by hand.
- `pharmacist_accounts.status` is the only activation gate. Set it to
  `'active'` only after phoning the number in `pharmacies.phone` — never
  the number the registrant supplied.

## Activating a pharmacist account (manual procedure)

There is no admin UI. Activation is a deliberate, human, out-of-band step
(see `docs/ARCHITECTURE.md` 5.2):

1. A new row appears in `public.pharmacist_accounts` with
   `status = 'pending'`.
2. The operator reads `full_name`, `email`, `phone` and the joined
   `pharmacies.name` / `pharmacies.phone`.
3. **The operator calls the pharmacy's own landline** — the number in
   `pharmacies.phone`, *not* the number the registrant supplied — and
   asks for the named person. That asymmetry is the entire verification:
   anyone can type a phone number into a form; only someone who works
   there answers the pharmacy's line.
4. In the Supabase table editor:
   ```sql
   update public.pharmacist_accounts
      set status = 'active',
          status_note = 'appel du 2026-08-20, titulaire confirmé'
    where email = '…';
   ```
5. `activated_at` is stamped by a trigger and `pharmacies.verified` flips
   to `true` automatically.

**Launch blocker:** the seeded pharmacy phone numbers in `seed.sql` are
syntactically valid but fictional. Do not activate any account for a
pharmacy whose phone number has not been replaced with a sourced, real
one — otherwise `verified` certifies nothing and the "Pharmacie inscrite"
badge is a lie. For local QA, the operator may knowingly activate their
own test account.
