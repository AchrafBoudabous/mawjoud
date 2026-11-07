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
   - `migrations/20261104090000_dedupe_search_events.sql`
   - `migrations/20261104100000_national_scope.sql`
   - `migrations/20261104110000_certificate_verification.sql`
3. Apply `seed.sql` (medications + demo data).
4. Apply `seed_osm_pharmacies.sql` (real pharmacies for all 24
   governorates, from OpenStreetMap). It retires the 12 fictional demo
   pharmacies unless a pharmacist account is attached to one.

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
psql "$SUPABASE_DB_URL" -f supabase/migrations/20261104090000_dedupe_search_events.sql
psql "$SUPABASE_DB_URL" -f supabase/migrations/20261104100000_national_scope.sql
psql "$SUPABASE_DB_URL" -f supabase/migrations/20261104110000_certificate_verification.sql
psql "$SUPABASE_DB_URL" -f supabase/seed.sql
psql "$SUPABASE_DB_URL" -f supabase/seed_osm_pharmacies.sql
```

## Rules

- Every migration is written to be **re-runnable** (`create ... if not
  exists`, `create or replace`, `drop trigger if exists`, etc.). Nobody
  is tracking which migrations have already run against the hosted
  project, so idempotency is the safety net.
- **Exception — views.** `pharmacy_medication_status` has been extended
  three times (step 3, step 5, national scope). `create or replace view`
  cannot drop columns, so once a later migration has extended it, an
  *earlier* view migration can no longer be re-run on that database
  ("cannot drop columns from view"). Re-run only the newest migrations;
  the full set in order is always fine on a fresh database.
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
- `pharmacist_accounts.status` is the only activation gate. Change it
  from the **/admin** page, not by hand: the page records who decided,
  when and why, and refuses to approve a request without a certificate.
- **One live account per pharmacy** (unique index on `pharmacy_id` where
  `status <> 'rejected'`). The account e-mail is shared by the pharmacy's
  team; a rejected request frees the pharmacy for a new one.
- `pharmacies.is_public = false` marks a pharmacy proposed during
  registration. Every patient-facing read skips it until an admin
  approves the request.

## Reviewing pharmacist registrations (admin)

### One-time setup: make yourself an admin

1. Supabase dashboard → **Authentication → Users → Add user** → your
   e-mail (no password needed; you sign in with the e-mail code).
2. SQL editor:
   ```sql
   insert into public.admin_users (email) values ('you@example.com');
   ```
   The Supabase user is linked automatically on your first sign-in.
   Remove the row to revoke access — it is re-checked on every request.
3. Recommended: **Authentication → Sign In / Providers → "Allow new
   users to sign up" → off.** Pharmacist login users are created by the
   backend at registration (admin API), and admins are added from the
   dashboard, so nobody needs public sign-up — and turning it off stops
   anyone with the public key from creating auth users or sending
   sign-in e-mails to arbitrary addresses.
4. Make sure **Authentication → URL Configuration → Redirect URLs**
   allows `https://<your-site>/pharmacien/validation**` (and
   `http://localhost:3000/pharmacien/validation**` for local use) — the
   admin link carries `?next=/admin`.

### The flow

1. A pharmacist registers at `/pharmacien/inscription`: picks a listed
   pharmacy **or** proposes a missing one (name, address, map position),
   uploads the pharmacy's certificate (PDF/JPG/PNG/WEBP, ≤ 5 MB, type
   checked from the file's own bytes), and gives the pharmacy's shared
   e-mail. The request is created `pending`; a proposed pharmacy is
   created hidden.
2. The file goes to the **private** Storage bucket
   `pharmacy-certificates` (no access policy: only the backend's service
   role can read or write it). It is kept as long as the account exists.
3. On **/admin** you see pending requests (oldest first), open the
   certificate (a link valid 2 minutes) and check: name and address match
   the pharmacy, the document is official, legible and current. When in
   doubt, phone the pharmacy at a number found elsewhere (its sign, a
   directory) — never the registrant's own number.
4. **Approve** → the account becomes `active`, `pharmacies.verified`
   flips to true by trigger, and a proposed pharmacy is published.
   **Reject** / **Suspend** require a reason, which the pharmacist sees on
   their dashboard. **Reactivate** restores a suspended account. A
   rejected request can be approved later or deleted (certificate and,
   for a never-approved proposal, the hidden pharmacy too).
5. Once a pharmacy is verified, the OpenStreetMap import no longer
   changes its name, address or phone.

There is no e-mail notification on decisions yet (Resend, build-order
step 6): the pharmacist sees the new status on their next visit.

## Refreshing pharmacies from OpenStreetMap

`seed_osm_pharmacies.sql` is generated — never edit it by hand. To
refresh it from the latest OpenStreetMap data (Geofabrik's daily
Tunisia extract):

```
python -m venv .osm-venv
.osm-venv/Scripts/pip install -r scripts/requirements.txt    # bin/pip on macOS/Linux
curl -L -o tunisia-latest.osm.pbf https://download.geofabrik.de/africa/tunisia-latest.osm.pbf
.osm-venv/Scripts/python scripts/import_osm_pharmacies.py tunisia-latest.osm.pbf
```

Then apply the regenerated file. Rows are upserted on `osm_ref`, so
`verified` status, pharmacist links, stock reports and gardes survive a
refresh. A pharmacy deleted from OSM is **not** deleted here (it may have
a pharmacist account); remove it by hand if needed.

Coverage is uneven (about 800 of Tunisia's ~2,300 pharmacies, and only a
handful in some interior governorates), and only ~1 in 5 has a phone
number. Improving OSM itself — or adding rows with `source = 'manual'` —
is the way to close the gap. Data © OpenStreetMap contributors, ODbL.

## Gardes (on-duty pharmacies)

`pharmacy_duty_shifts` is written only by a pharmacy's own **active**
pharmacist, from the dashboard. Nothing is imported: Tunisia publishes
no machine-readable garde roster. Pharmacies named "Pharmacie de nuit"
in OSM are flagged `is_24h` by the importer and shown as "Ouverte la nuit".
