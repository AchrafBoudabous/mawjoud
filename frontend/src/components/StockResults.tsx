"use client";

import { useMemo, useState } from "react";
import { StockLegend } from "@/components/StockLegend";
import { StockMap } from "@/components/StockMap";
import { StockPharmacyList } from "@/components/StockPharmacyList";
import { REPORT_UI_IDLE } from "@/components/StockReportButtons";
import type { ReportUiState } from "@/components/StockReportButtons";
import { NoticeCard } from "@/components/ui/NoticeCard";
import { ViewToggle } from "@/components/ViewToggle";
import { revalidateMedicationStock } from "@/lib/actions/stock";
import type { PatientReportStatus, PharmacyStock, ReportSource, StockStatus, StockSummary } from "@/lib/api";
import { reportStock } from "@/lib/api";
import { getDictionary } from "@/lib/i18n";
import { classifyReportError, REPORT_SLOW_AFTER_MS } from "@/lib/stock";

type StockResultsProps = {
  pharmacies: PharmacyStock[];
  medicationName: string;
  medicationSlug: string;
};

type LocalReport = { status: StockStatus; reported_at: string; reported_by: ReportSource };

export function StockResults({ pharmacies, medicationName, medicationSlug }: StockResultsProps) {
  const dict = getDictionary();
  const [view, setView] = useState<"list" | "map">("list");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [localReports, setLocalReports] = useState<Record<string, LocalReport>>({});
  const [reportUi, setReportUi] = useState<Record<string, ReportUiState>>({});

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
        return { ...p, ...local };
      }),
    [pharmacies, localReports]
  );

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
      const created = await reportStock(medicationSlug, pharmacyId, status);
      setLocalReports((s) => ({
        ...s,
        [pharmacyId]: {
          status: created.status,
          reported_at: created.reported_at,
          reported_by: created.reported_by,
        },
      }));
      setReportUi((s) => ({ ...s, [pharmacyId]: { phase: "done", slow: false, status } }));
      // Freshness is best-effort and must never block or undo the feedback
      // the user has already been given.
      try {
        await revalidateMedicationStock(medicationSlug);
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
        <p className="text-sm text-ink tabular-nums">
          {dict.stock.summary(summary.in_stock, merged.length)}
        </p>
      ) : (
        <NoticeCard tone="info" icon="report" title={dict.stock.noReportsAtAll}>
          {dict.stock.noReportsBody(merged.length)}
        </NoticeCard>
      )}

      <ViewToggle view={view} onChange={setView} className="md:hidden" />
      <StockLegend
        showVerified={merged.some((p) => p.verified)}
        footerNote={hasReports ? dict.report.invite : undefined}
      />

      <div className="flex flex-col gap-4 md:flex-row md:items-start md:gap-6">
        <div
          className={`${view === "list" ? "block animate-fade-in" : "hidden"} md:block md:w-2/5 md:max-h-[70vh] md:overflow-y-auto`}
        >
          <StockPharmacyList
            pharmacies={merged}
            selectedId={selectedId}
            onSelect={handleSelect}
            reportUi={reportUi}
            onReport={handleReport}
            onResetReport={handleResetReport}
          />
        </div>

        <div
          className={`${view === "map" ? "block animate-fade-in" : "hidden"} md:block md:w-3/5 md:sticky md:top-4`}
        >
          <StockMap
            pharmacies={merged}
            selectedId={selectedId}
            isVisible={view === "map"}
            medicationName={medicationName}
            reportUi={reportUi}
            onReport={handleReport}
            onResetReport={handleResetReport}
          />
        </div>
      </div>
    </div>
  );
}
