"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { ToggleUiState } from "@/components/StockToggle";
import { AccountStatusBanner } from "@/components/AccountStatusBanner";
import { PharmacistMedicationRow } from "@/components/PharmacistMedicationRow";
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
    const token = await getAccessToken();
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
    return <p className="text-sm text-muted">{dict.pharmacist.dashboard.loading}</p>;
  }

  if (phase.kind === "error") {
    if (phase.error === "no_account") {
      return (
        <div className="flex flex-col gap-3">
          <h1 className="text-xl font-bold text-ink">{dict.pharmacist.status.noAccountTitle}</h1>
          <p className="text-sm text-muted">{dict.pharmacist.status.noAccountBody}</p>
          <Link href="/pharmacien/inscription" className="text-sm text-brand-600 underline">
            {dict.pharmacist.status.registerCta}
          </Link>
        </div>
      );
    }
    return (
      <div className="flex flex-col gap-3">
        <p role="alert" className="text-sm text-warn-text">
          {dict.pharmacist.dashboard.errors[phase.error]}
        </p>
        <button
          type="button"
          onClick={() => void load()}
          className="inline-block w-fit text-sm text-brand-600 underline"
        >
          {dict.pharmacist.dashboard.retry}
        </button>
      </div>
    );
  }

  const { account, pharmacy } = phase.data;
  const disabled = account.status !== "active";

  const groups = CATEGORY_ORDER.map((category) => ({
    category,
    medications: merged.filter((m) => m.category === category),
  })).filter((group) => group.medications.length > 0);

  return (
    <div className="flex flex-col gap-6">
      <header>
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-xl font-bold text-ink">{pharmacy.name}</h2>
          {pharmacy.verified && <VerifiedBadge />}
        </div>
        <p className="text-sm text-muted">{pharmacy.address}</p>
        {pharmacy.city !== "Bizerte" && <p className="text-sm text-muted">{pharmacy.city}</p>}
      </header>

      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted">{dict.pharmacist.dashboard.signedInAs(account.email)}</p>
        <button type="button" onClick={handleLogout} className="text-sm text-brand-600 underline">
          {dict.pharmacist.dashboard.logout}
        </button>
      </div>

      <AccountStatusBanner status={account.status} />

      {topSearched.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-ink">
            {dict.pharmacist.dashboard.topSearchedTitle}
          </h3>
          <ul className="mt-2 flex flex-col gap-1 text-sm text-muted">
            {topSearched.map((m) => (
              <li key={m.id}>
                {m.name} — {dict.pharmacist.dashboard.searchCount(m.searches_last_7_days)}
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="text-sm text-muted">{dict.pharmacist.dashboard.updatedHint}</p>

      {groups.map((group) => (
        <div key={group.category}>
          <h3 className="text-sm font-semibold text-ink">
            {dict.medications.categories[group.category]}
          </h3>
          <ul className="mt-2 flex flex-col gap-3">
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
    </div>
  );
}
