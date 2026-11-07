"use client";

import { useId, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import type { DutyKind, DutyShift } from "@/lib/api";
import { ApiError, createDutyShift, deleteDutyShift } from "@/lib/api";
import { formatTunisDayMonth, formatTunisTime, tunisLocalToIso, tunisToday } from "@/lib/format";
import { getDictionary } from "@/lib/i18n";
import { getAccessToken } from "@/lib/supabase/auth";
import { BUTTON_BASE, BUTTON_PRIMARY, BUTTON_QUIET, CARD, FIELD } from "@/lib/ui";
import { cn } from "@/lib/utils";

type DutyError = "generic" | "overlap" | "too_many";

type DutyShiftsManagerProps = {
  initialShifts: DutyShift[];
  /** Non-active accounts see the list but cannot change it. */
  disabled: boolean;
  is24h: boolean;
  onSessionExpired: () => void;
};

/** Declare / remove gardes. Times are typed in Tunis wall-clock time and
 *  sent with an explicit +01:00 offset; the API also rejects shifts over
 *  72 h, in the past, more than 60 days ahead, or overlapping. */
export function DutyShiftsManager({ initialShifts, disabled, is24h, onSessionExpired }: DutyShiftsManagerProps) {
  const dict = getDictionary();
  const t = dict.pharmacistDuty;
  const ids = { kind: useId(), sd: useId(), st: useId(), ed: useId(), et: useId() };

  const [shifts, setShifts] = useState(initialShifts);
  const [kind, setKind] = useState<DutyKind>("night");
  const [startDate, setStartDate] = useState(() => tunisToday());
  const [startTime, setStartTime] = useState("20:00");
  const [endDate, setEndDate] = useState(() => tunisToday(Date.now(), 1));
  const [endTime, setEndTime] = useState("08:00");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<DutyError | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);

  async function token(): Promise<string | null> {
    const tk = await getAccessToken();
    if (!tk) onSessionExpired();
    return tk;
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    setError(null);
    try {
      const tk = await token();
      if (!tk) return;
      const created = await createDutyShift(
        { kind, starts_at: tunisLocalToIso(startDate, startTime), ends_at: tunisLocalToIso(endDate, endTime) },
        tk
      );
      setShifts((s) => [...s, created].sort((a, b) => a.starts_at.localeCompare(b.starts_at)));
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) onSessionExpired();
      setError(err instanceof ApiError && err.status === 409 ? "overlap" : err instanceof ApiError && err.status === 429 ? "too_many" : "generic");
    } finally {
      setSaving(false);
    }
  }

  async function handleRemove(id: string) {
    setRemoving(id);
    try {
      const tk = await token();
      if (!tk) return;
      await deleteDutyShift(id, tk);
      setShifts((s) => s.filter((x) => x.id !== id));
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) setShifts((s) => s.filter((x) => x.id !== id));
      else setError("generic");
    } finally {
      setRemoving(null);
    }
  }

  const now = Date.now();

  return (
    <section aria-labelledby="duty-title" className={`${CARD} p-5`}>
      <h2 id="duty-title" className="flex items-center gap-2 text-lg font-extrabold text-ink">
        <Icon name="moon" className="size-5 text-brand-600" />
        {t.title}
      </h2>
      <p className="mt-1 text-sm text-muted">{t.subtitle}</p>
      {is24h && <p className="mt-2 text-sm font-semibold text-brand-700">{t.is24h}</p>}

      <ul className="mt-4 flex flex-col gap-2">
        {shifts.length === 0 && <li className="text-sm text-muted">{t.none}</li>}
        {shifts.map((s) => {
          const current = Date.parse(s.starts_at) <= now && now < Date.parse(s.ends_at);
          return (
            <li
              key={s.id}
              className={cn(
                "flex flex-wrap items-center justify-between gap-2 rounded-control border px-3 py-2",
                current ? "border-ink bg-ink text-canvas" : "border-line bg-surface-2"
              )}
            >
              <span className="text-sm">
                <span className="font-semibold">{dict.duty.kinds[s.kind]}</span>
                {current && <span className="ms-2 text-xs font-bold uppercase">{t.current}</span>}
                <span className="block tabular-nums opacity-80">
                  {t.range(
                    `${formatTunisDayMonth(s.starts_at)} ${formatTunisTime(s.starts_at)}`,
                    `${formatTunisDayMonth(s.ends_at)} ${formatTunisTime(s.ends_at)}`
                  )}
                </span>
              </span>
              {!disabled && (
                <button
                  type="button"
                  onClick={() => handleRemove(s.id)}
                  disabled={removing === s.id}
                  className={cn(BUTTON_QUIET, "min-h-9 text-xs", current && "text-canvas decoration-canvas/50")}
                >
                  {t.remove}
                </button>
              )}
            </li>
          );
        })}
      </ul>

      {disabled ? (
        <p className="mt-4 text-sm text-muted">{t.inactive}</p>
      ) : (
        <form onSubmit={handleAdd} className="mt-5 grid gap-3 border-t border-line pt-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <label htmlFor={ids.kind} className="text-sm font-medium text-ink">{t.kindLabel}</label>
            <select id={ids.kind} value={kind} onChange={(e) => setKind(e.target.value as DutyKind)} className={FIELD}>
              {(["night", "weekend", "holiday"] as const).map((k) => (
                <option key={k} value={k}>{dict.duty.kinds[k]}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor={ids.sd} className="text-sm font-medium text-ink">{t.startDate}</label>
            <input id={ids.sd} type="date" required value={startDate} onChange={(e) => setStartDate(e.target.value)} className={FIELD} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor={ids.st} className="text-sm font-medium text-ink">{t.startTime}</label>
            <input id={ids.st} type="time" required value={startTime} onChange={(e) => setStartTime(e.target.value)} className={FIELD} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor={ids.ed} className="text-sm font-medium text-ink">{t.endDate}</label>
            <input id={ids.ed} type="date" required value={endDate} onChange={(e) => setEndDate(e.target.value)} className={FIELD} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor={ids.et} className="text-sm font-medium text-ink">{t.endTime}</label>
            <input id={ids.et} type="time" required value={endTime} onChange={(e) => setEndTime(e.target.value)} className={FIELD} />
          </div>
          {error && (
            <p role="alert" className="text-sm text-stock-out sm:col-span-2">{t.errors[error]}</p>
          )}
          <button type="submit" disabled={saving} className={cn(BUTTON_BASE, BUTTON_PRIMARY, "sm:col-span-2 sm:justify-self-start")}>
            <Icon name={saving ? "loader" : "moon"} className={cn(saving && "animate-spin")} />
            {saving ? t.adding : t.add}
          </button>
        </form>
      )}
    </section>
  );
}
