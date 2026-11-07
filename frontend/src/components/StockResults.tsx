"use client";

import { useEffect, useMemo, useState } from "react";
import { AvailabilitySummary } from "@/components/AvailabilitySummary";
import { NearbyControls } from "@/components/NearbyControls";
import { StockLegend } from "@/components/StockLegend";
import { StockMap } from "@/components/StockMap";
import { StockPharmacyList } from "@/components/StockPharmacyList";
import { REPORT_UI_IDLE } from "@/components/StockReportButtons";
import type { ReportUiState } from "@/components/StockReportButtons";
import { NoticeCard } from "@/components/ui/NoticeCard";
import { ViewToggle } from "@/components/ViewToggle";
import { revalidateMedicationStock } from "@/lib/actions/stock";
import type {
  Governorate,
  Medication,
  PatientReportStatus,
  PharmacyStock,
  ReportSource,
  StockStatus,
  StockSummary,
} from "@/lib/api";
import { reportStock } from "@/lib/api";
import { distanceKm, type LatLng } from "@/lib/geo";
import { getDictionary } from "@/lib/i18n";
import { getRecentPosition, setPreferredGovernorate } from "@/lib/prefs";
import { classifyReportError, REPORT_SLOW_AFTER_MS } from "@/lib/stock";

type StockResultsProps = {
  pharmacies: PharmacyStock[];
  medication: Medication;
  governorate: Governorate;
};

type LocalReport = { status: StockStatus; reported_at: string; reported_by: ReportSource };

export function StockResults({ pharmacies, medication, governorate }: StockResultsProps) {
  const dict = getDictionary();
  const [view, setView] = useState<"list" | "map">("list");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [localReports, setLocalReports] = useState<Record<string, LocalReport>>({});
  const [reportUi, setReportUi] = useState<Record<string, ReportUiState>>({});
  const [position, setPosition] = useState<LatLng | null>(null);
  const [dutyOnly, setDutyOnly] = useState(false);

  useEffect(() => {
    setPreferredGovernorate(governorate.slug);
    // Arrived through "Près de moi": reuse the position cached on this
    // device a moment ago rather than prompting again.
    if (new URLSearchParams(window.location.search).has("pres")) {
      const p = getRecentPosition();
      if (p) setPosition(p);
    }
  }, [governorate.slug]);

  const handleSelect = (id: string) => {
    setSelectedId(id);
    setView("map");
  };

  // Client state merges over server props by timestamp — server wins on
  // ties, so once a revalidated payload contains the report the local
  // patch becomes inert. See docs/ARCHITECTURE.md 4.6.
  const merged = useMemo(
    () =>
      pharmacies.map((p) => {
        const local = localReports[p.id];
        if (!local) return p;
        const serverAt = p.reported_at ? Date.parse(p.reported_at) : Number.NEGATIVE_INFINITY;
        if (Date.parse(local.reported_at) <= serverAt) return p;
        // A fresh own report is one agreeing voice; prior counts no
        // longer describe the new status.
        return {
          ...p,
          ...local,
          confirmations_24h: 1,
          contradictions_24h: 0,
          pharmacist_confirmed_24h: local.reported_by === "pharmacist",
        };
      }),
    [pharmacies, localReports]
  );

  const distances = useMemo(() => {
    if (!position) return null;
    return Object.fromEntries(merged.map((p) => [p.id, distanceKm(position, p)]));
  }, [merged, position]);

  const visible = useMemo(() => {
    let list = dutyOnly ? merged.filter((p) => p.on_duty_until || p.is_24h) : merged;
    if (distances) {
      // Nearest pharmacy that HAS it first, then everything else by distance.
      list = [...list].sort((a, b) => {
        const aIn = a.status === "in_stock" ? 0 : 1;
        const bIn = b.status === "in_stock" ? 0 : 1;
        return aIn - bIn || distances[a.id] - distances[b.id];
      });
    }
    return list;
  }, [merged, dutyOnly, distances]);

  const summary = useMemo(
    () =>
      merged.reduce<StockSummary>(
        (acc, p) => ({ ...acc, [p.status]: acc[p.status] + 1 }),
        { in_stock: 0, out_of_stock: 0, unsure: 0, none: 0 }
      ),
    [merged]
  );

  async function handleReport(pharmacyId: string, status: PatientReportStatus) {
    if (reportUi[pharmacyId]?.phase === "sending") return; // idempotent guard
    setReportUi((s) => ({ ...s, [pharmacyId]: { phase: "sending", slow: false, status } }));

    const slowTimer = setTimeout(() => {
      setReportUi((s) =>
        s[pharmacyId]?.phase === "sending"
          ? { ...s, [pharmacyId]: { ...s[pharmacyId], slow: true } }
          : s
      );
    }, REPORT_SLOW_AFTER_MS);

    try {
      const created = await reportStock(medication.slug, pharmacyId, status);
      setLocalReports((s) => ({
        ...s,
        [pharmacyId]: {
          status: created.status,
          reported_at: created.reported_at,
          reported_by: created.reported_by,
        },
      }));
      setReportUi((s) => ({ ...s, [pharmacyId]: { phase: "done", slow: false, status } }));
      try {
        await revalidateMedicationStock(medication.slug);
      } catch {
        /* ignore: the optimistic patch already shows the truth */
      }
    } catch (error) {
      setReportUi((s) => ({
        ...s,
        [pharmacyId]: { phase: "error", slow: false, error: classifyReportError(error) },
      }));
    } finally {
      clearTimeout(slowTimer);
    }
  }

  function handleResetReport(pharmacyId: string) {
    setReportUi((s) => ({ ...s, [pharmacyId]: REPORT_UI_IDLE }));
  }

  const hasReports = summary.in_stock + summary.out_of_stock + summary.unsure > 0;

  return (
    <div className="flex flex-col gap-4">
      {hasReports ? (
        <AvailabilitySummary summary={summary} total={merged.length} governorateName={governorate.name_fr} />
      ) : (
        <NoticeCard tone="info" icon="report" title={dict.stock.noReportsAtAll}>
          {dict.stock.noReportsBody(merged.length)}
        </NoticeCard>
      )}

      <NearbyControls
        sorted={distances !== null}
        onPosition={setPosition}
        dutyOnly={dutyOnly}
        onDutyOnlyChange={setDutyOnly}
      />

      <ViewToggle view={view} onChange={setView} className="sticky top-[4.5rem] z-[1050] shadow-raised md:hidden" />
      <StockLegend
        showVerified={merged.some((p) => p.verified)}
        footerNote={hasReports ? dict.report.invite : undefined}
      />

      {dutyOnly && visible.length === 0 && (
        <NoticeCard tone="info" icon="moon">
          {dict.nearby.dutyEmpty}
        </NoticeCard>
      )}

      <div className="flex flex-col gap-4 md:flex-row md:items-start md:gap-6">
        <div
          className={`${view === "list" ? "block animate-fade-in" : "hidden"} md:block md:w-[42%] md:max-h-[calc(100dvh-7rem)] md:overflow-y-auto md:pr-1 md:[scrollbar-width:thin]`}
        >
          <StockPharmacyList
            pharmacies={visible}
            medication={medication}
            distances={distances}
            selectedId={selectedId}
            onSelect={handleSelect}
            reportUi={reportUi}
            onReport={handleReport}
            onResetReport={handleResetReport}
          />
        </div>

        <div
          className={`${view === "map" ? "block animate-fade-in" : "hidden"} md:block md:flex-1 md:sticky md:top-20`}
        >
          <StockMap
            pharmacies={visible}
            selectedId={selectedId}
            isVisible={view === "map"}
            medicationName={medication.name}
            center={[governorate.lat, governorate.lng]}
            userPosition={position}
            reportUi={reportUi}
            onReport={handleReport}
            onResetReport={handleResetReport}
          />
        </div>
      </div>
    </div>
  );
}
