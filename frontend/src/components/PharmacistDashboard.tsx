"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { ToggleUiState } from "@/components/StockToggle";
import { AccountStatusBanner } from "@/components/AccountStatusBanner";
import { DutyShiftsManager } from "@/components/DutyShiftsManager";
import { PharmacistDashboardSkeleton } from "@/components/skeletons/PharmacistDashboardSkeleton";
import { PharmacistMedicationRow } from "@/components/PharmacistMedicationRow";
import { EmptyState } from "@/components/ui/EmptyState";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { revalidateMedicationStock } from "@/lib/actions/stock";
import type {
  DashboardMedication,
  PharmacistDashboardResponse,
  ReportSource,
  StockStatus,
} from "@/lib/api";
import { getPharmacistDashboard, reportStockAsPharmacist } from "@/lib/api";
import { getDictionary } from "@/lib/i18n";
import { CATEGORY_ORDER } from "@/lib/medications";
import { classifyPharmacistError, TOGGLE_SLOW_AFTER_MS, type PharmacistErrorKind } from "@/lib/pharmacist";
import { getAccessToken, onAuthChange, signOutPharmacist } from "@/lib/supabase/auth";
import { Icon } from "@/components/ui/Icon";
import { BUTTON_BASE, BUTTON_PRIMARY, BUTTON_QUIET, CARD } from "@/lib/ui";

type Phase =
  | { kind: "checking" }
  | { kind: "loading" }
  | { kind: "ready"; data: PharmacistDashboardResponse }
  | { kind: "error"; error: PharmacistErrorKind };

type LocalReport = { status: StockStatus; reported_at: string; reported_by: ReportSource };

const TOGGLE_IDLE: ToggleUiState = { phase: "idle", slow: false };

export function PharmacistDashboard() {
  const dict = getDictionary();
  const router = useRouter();

  const [phase, setPhase] = useState<Phase>({ kind: "checking" });
  const [localReports, setLocalReports] = useState<Record<string, LocalReport>>({});
  const [toggleUi, setToggleUi] = useState<Record<string, ToggleUiState>>({});

  const load = useCallback(async () => {
    setPhase({ kind: "loading" });
    let token: string | null;
    try {
      token = await getAccessToken();
    } catch (err) {
      console.error("Supabase auth unavailable:", err);
      setPhase({ kind: "error", error: "generic" });
      return;
    }
    if (!token) {
      router.replace("/pharmacien/connexion");
      return;
    }
    try {
      const data = await getPharmacistDashboard(token);
      setPhase({ kind: "ready", data });
    } catch (error) {
      const kind = classifyPharmacistError(error);
      if (kind === "session_expired") {
        await signOutPharmacist();
        router.replace("/pharmacien/connexion");
        return;
      }
      setPhase({ kind: "error", error: kind });
    }
  }, [router]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const unsubscribe = onAuthChange((signedIn) => {
      if (!signedIn) {
        router.replace("/pharmacien/connexion");
      }
    });
    return unsubscribe;
  }, [router]);

  async function handleLogout() {
    await signOutPharmacist();
    router.replace("/pharmacien/connexion");
  }

  async function handleToggle(medication: DashboardMedication, status: StockStatus) {
    if (toggleUi[medication.id]?.phase === "saving") return; // idempotent guard

    setToggleUi((s) => ({ ...s, [medication.id]: { phase: "saving", pending: status, slow: false } }));

    const slowTimer = setTimeout(() => {
      setToggleUi((s) =>
        s[medication.id]?.phase === "saving"
          ? { ...s, [medication.id]: { ...s[medication.id], slow: true } }
          : s
      );
    }, TOGGLE_SLOW_AFTER_MS);

    try {
      const token = await getAccessToken();
      if (!token) {
        // Reset first: otherwise the row stays on "saving" if the
        // redirect is slow or blocked.
        setToggleUi((s) => ({ ...s, [medication.id]: TOGGLE_IDLE }));
        router.replace("/pharmacien/connexion");
        return;
      }
      const created = await reportStockAsPharmacist(medication.slug, status, token);
      setLocalReports((s) => ({
        ...s,
        [medication.id]: {
          status: created.status,
          reported_at: created.reported_at,
          reported_by: created.reported_by,
        },
      }));
      setToggleUi((s) => ({ ...s, [medication.id]: TOGGLE_IDLE }));
      // Best-effort: purges the PATIENT page's caches so the pharmacist's
      // update is visible to patients immediately. Never blocks or undoes
      // the feedback already given.
      try {
        await revalidateMedicationStock(medication.slug);
      } catch {
        /* ignore */
      }
    } catch (error) {
      const kind = classifyPharmacistError(error);
      if (kind === "session_expired") {
        await signOutPharmacist();
        router.replace("/pharmacien/connexion");
        return;
      }
      if (kind === "not_active") {
        // The account's status changed under us (e.g. just suspended) —
        // refetch so the banner reflects reality.
        void load();
      }
      setToggleUi((s) => ({ ...s, [medication.id]: { phase: "error", slow: false } }));
    } finally {
      clearTimeout(slowTimer);
    }
  }

  const merged = useMemo(() => {
    if (phase.kind !== "ready") return [];
    return phase.data.medications.map((m) => {
      const local = localReports[m.id];
      if (!local) return m;
      const serverAt = m.reported_at ? Date.parse(m.reported_at) : Number.NEGATIVE_INFINITY;
      if (Date.parse(local.reported_at) <= serverAt) return m;
      return { ...m, ...local };
    });
  }, [phase, localReports]);

  const topSearched = useMemo(
    () =>
      [...merged]
        .sort((a, b) => b.searches_last_7_days - a.searches_last_7_days)
        .slice(0, 3)
        .filter((m) => m.searches_last_7_days > 0),
    [merged]
  );

  if (phase.kind === "checking" || phase.kind === "loading") {
    return (
      <>
        <PharmacistDashboardSkeleton />
        <p role="status" className="sr-only">
          {dict.pharmacist.dashboard.loading}
        </p>
      </>
    );
  }

  if (phase.kind === "error") {
    if (phase.error === "no_account") {
      return (
        <EmptyState
          headingLevel={1}
          icon="pharmacy"
          title={dict.pharmacist.status.noAccountTitle}
          body={dict.pharmacist.status.noAccountBody}
          action={
            <Link href="/pharmacien/inscription" className={`${BUTTON_BASE} ${BUTTON_PRIMARY}`}>
              {dict.pharmacist.status.registerCta}
            </Link>
          }
        />
      );
    }
    return (
      <EmptyState
        headingLevel={1}
        tone="warn"
        role="alert"
        icon="alert"
        title={dict.errors.title}
        body={dict.pharmacist.dashboard.errors[phase.error]}
        action={
          <button type="button" onClick={() => void load()} className={`${BUTTON_BASE} ${BUTTON_PRIMARY}`}>
            {dict.pharmacist.dashboard.retry}
          </button>
        }
      />
    );
  }

  const { account, pharmacy } = phase.data;
  const disabled = account.status !== "active";

  const groups = CATEGORY_ORDER.map((category) => ({
    category,
    medications: merged.filter((m) => m.category === category),
  })).filter((group) => group.medications.length > 0);

  const confirmedByYou = merged.filter((m) => m.reported_by === "pharmacist").length;
  const totalSearches = merged.reduce((sum, m) => sum + m.searches_last_7_days, 0);

  return (
    <div className="flex flex-col gap-6">
      <header className={`${CARD} relative overflow-hidden p-5`}>
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-10 -top-14 size-48 rounded-full bg-brand-100/70 blur-3xl"
        />
        <div className="relative flex items-start gap-4">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-card bg-brand-600 text-white shadow-[0_10px_22px_-10px_var(--brand-600)] dark:text-brand-50">
            <Icon name="pharmacy" className="size-6" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <h1 className="text-xl font-extrabold text-ink">{pharmacy.name}</h1>
              {pharmacy.verified && <VerifiedBadge />}
            </div>
            <p className="mt-0.5 text-sm text-muted">
              {pharmacy.address}
              {pharmacy.city && pharmacy.city !== pharmacy.address && <> · {pharmacy.city}</>}
            </p>
          </div>
        </div>
        <div className="relative mt-4 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-t border-line pt-3">
          <p className="min-w-0 break-all text-sm text-muted">
            {dict.pharmacist.dashboard.signedInAs(account.email)}
          </p>
          <button type="button" onClick={handleLogout} className={BUTTON_QUIET}>
            <Icon name="logout" className="size-4" />
            {dict.pharmacist.dashboard.logout}
          </button>
        </div>
      </header>

      <AccountStatusBanner status={account.status} reviewNote={account.review_note} />

      <section aria-labelledby="stats-title">
        <h2 id="stats-title" className="text-sm font-bold text-ink">
          {dict.pharmacist.dashboard.statsTitle}
        </h2>
        <p className="mt-0.5 text-xs text-muted">
          {dict.pharmacist.dashboard.statsScope(phase.data.stats_governorate)}
        </p>
        {/* Per-medication distinct-viewer counts cannot be summed into a
            count of distinct people, so this tile is labelled as a total
            of the per-row counters, never as "N people". */}
        <dl className="mt-3 grid grid-cols-3 gap-2.5">
          {[
            { icon: "activity" as const, value: merged.length, label: dict.pharmacist.dashboard.statTracked },
            { icon: "shield-check" as const, value: confirmedByYou, label: dict.pharmacist.dashboard.statUpToDate },
            { icon: "users" as const, value: totalSearches, label: dict.pharmacist.dashboard.statSearches },
          ].map((stat) => (
            <div key={stat.label} className={`${CARD} flex flex-col gap-1 p-3.5`}>
              <Icon name={stat.icon} className="size-4 text-brand-600" />
              <dd className="mt-1 text-2xl font-extrabold leading-none text-ink tabular-nums">{stat.value}</dd>
              <dt className="text-xs text-muted">{stat.label}</dt>
            </div>
          ))}
        </dl>

        {topSearched.length > 0 && (
          <div className={`${CARD} mt-3 p-4`}>
            <h3 className="flex items-center gap-2 text-sm font-bold text-ink">
              <Icon name="sparkles" className="size-4 text-brand-600" />
              {dict.pharmacist.dashboard.topSearchedTitle}
            </h3>
            <ol className="mt-3 flex flex-col gap-2">
              {topSearched.map((m, i) => (
                <li key={m.id} className="flex items-center gap-3 text-sm">
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-brand-50 text-xs font-bold text-brand-700">
                    {i + 1}
                  </span>
                  <span className="min-w-0 flex-1 truncate font-medium text-ink">{m.name}</span>
                  <span className="shrink-0 text-muted tabular-nums">
                    {dict.pharmacist.dashboard.searchCount(m.searches_last_7_days)}
                  </span>
                </li>
              ))}
            </ol>
          </div>
        )}
      </section>

      <DutyShiftsManager
        initialShifts={phase.data.duty_shifts}
        disabled={disabled}
        is24h={pharmacy.is_24h}
        onSessionExpired={() => {
          void signOutPharmacist().then(() => router.replace("/pharmacien/connexion"));
        }}
      />

      <section aria-labelledby="board-title" className="flex flex-col gap-6">
        <div>
          <h2 id="board-title" className="text-lg font-extrabold text-ink">
            {dict.pharmacist.dashboard.boardTitle}
          </h2>
          <p className="mt-1 text-sm text-muted">{dict.pharmacist.dashboard.updatedHint}</p>
        </div>

        {groups.map((group) => (
          <div key={group.category}>
            <h3 className="flex items-center gap-2 text-sm font-bold text-ink">
              <span className="flex size-7 items-center justify-center rounded-control bg-brand-50 text-brand-600">
                <Icon name={group.category} className="size-4" />
              </span>
              {dict.medications.categories[group.category]}
            </h3>
            <ul className="mt-3 flex flex-col gap-3">
              {group.medications.map((medication) => (
                <PharmacistMedicationRow
                  key={medication.id}
                  medication={medication}
                  toggleState={toggleUi[medication.id] ?? TOGGLE_IDLE}
                  disabled={disabled}
                  onToggle={handleToggle}
                />
              ))}
            </ul>
          </div>
        ))}
      </section>
    </div>
  );
}
