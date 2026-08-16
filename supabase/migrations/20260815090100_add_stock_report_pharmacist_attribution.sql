-- Step 5 — attribute pharmacist reports to the account that wrote them.
-- RLS posture UNCHANGED: still zero policies, still revoked from
-- anon/authenticated, still service-role-only (decisions 2.12.1/2.12.2).
-- Idempotent: safe to re-run.

alter table public.stock_reports
  add column if not exists reported_by_account_id uuid;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'stock_reports_reported_by_account_fk'
      and conrelid = 'public.stock_reports'::regclass
  ) then
    alter table public.stock_reports
      add constraint stock_reports_reported_by_account_fk
      foreign key (reported_by_account_id)
      references public.pharmacist_accounts(id)
      on delete set null;
  end if;
end
$$;

comment on column public.stock_reports.reported_by_account_id is
  'Which pharmacist account wrote this report. Set by the API on every reported_by = ''pharmacist'' insert; NULL for patient reports and for all seed rows. Never returned by any endpoint. Becomes NULL if the account row is deleted (on delete set null) — the reported_by enum remains the display-relevant fact, so no cross-column CHECK enforces the pairing.';

revoke all on table public.stock_reports from anon, authenticated;
grant select, insert on table public.stock_reports to service_role;
