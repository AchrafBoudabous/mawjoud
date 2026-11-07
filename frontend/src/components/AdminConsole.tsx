"use client";

import { useCallback, useEffect, useState } from "react";
import { PharmacistLoginForm } from "@/components/PharmacistLoginForm";
import { EmptyState } from "@/components/ui/EmptyState";
import { Icon } from "@/components/ui/Icon";
import type { AdminAction, AdminRegistration, AdminRegistrationStatus } from "@/lib/api";
import {
  ApiError,
  decideRegistration,
  deleteRegistration,
  getAdminMe,
  getAdminRegistrations,
  getCertificateLink,
} from "@/lib/api";
import { formatAbsoluteDateTime, formatPhone } from "@/lib/format";
import { getDictionary } from "@/lib/i18n";
import { getAccessToken, signOutPharmacist } from "@/lib/supabase/auth";
import { BUTTON_BASE, BUTTON_PRIMARY, BUTTON_QUIET, BUTTON_SECONDARY, CARD, FIELD, buttonVariants } from "@/lib/ui";
import { cn } from "@/lib/utils";

type Phase =
  | { kind: "checking" }
  | { kind: "login" }
  | { kind: "forbidden"; email: string | null }
  | { kind: "ready"; email: string };

const TABS: AdminRegistrationStatus[] = ["pending", "active", "rejected", "suspended", "all"];

/** Actions allowed from each status (mirrors the API's state machine). */
const ACTIONS: Record<AdminRegistration["status"], AdminAction[]> = {
  pending: ["approve", "reject"],
  active: ["suspend"],
  suspended: ["reactivate"],
  rejected: ["approve"],
};

export function AdminConsole() {
  const dict = getDictionary();
  const t = dict.admin;
  const [phase, setPhase] = useState<Phase>({ kind: "checking" });
  const [tab, setTab] = useState<AdminRegistrationStatus>("pending");
  const [items, setItems] = useState<AdminRegistration[] | null>(null);
  const [listError, setListError] = useState(false);

  const withToken = useCallback(async (): Promise<string | null> => {
    const token = await getAccessToken().catch(() => null);
    if (!token) setPhase({ kind: "login" });
    return token;
  }, []);

  useEffect(() => {
    (async () => {
      const token = await withToken();
      if (!token) return;
      try {
        const me = await getAdminMe(token);
        setPhase({ kind: "ready", email: me.email });
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) setPhase({ kind: "login" });
        else if (err instanceof ApiError && (err.status === 403 || err.status === 404)) setPhase({ kind: "forbidden", email: null });
        else setPhase({ kind: "forbidden", email: null });
      }
    })();
  }, [withToken]);

  const load = useCallback(async () => {
    setListError(false);
    setItems(null);
    const token = await withToken();
    if (!token) return;
    try {
      setItems((await getAdminRegistrations(tab, token)).registrations);
    } catch {
      setListError(true);
    }
  }, [tab, withToken]);

  useEffect(() => {
    if (phase.kind === "ready") void load();
  }, [phase.kind, load]);

  async function logout() {
    await signOutPharmacist();
    setPhase({ kind: "login" });
  }

  if (phase.kind === "checking") {
    return <p role="status" className="py-10 text-center text-sm text-muted">{t.loading}</p>;
  }
  if (phase.kind === "login") {
    return <PharmacistLoginForm redirectTo="/admin" title={t.loginTitle} intro={t.loginIntro} showRegisterLink={false} />;
  }
  if (phase.kind === "forbidden") {
    return (
      <EmptyState
        headingLevel={1}
        tone="warn"
        role="alert"
        icon="shield"
        title={t.forbiddenTitle}
        body={t.forbiddenBody}
        action={<button type="button" onClick={logout} className={`${BUTTON_BASE} ${BUTTON_SECONDARY}`}>{t.logout}</button>}
      />
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-ink md:text-3xl">{t.title}</h1>
          <p className="mt-1 text-sm text-muted">{t.signedInAs(phase.email)}</p>
        </div>
        <button type="button" onClick={logout} className={BUTTON_QUIET}>
          <Icon name="logout" className="size-4" />
          {t.logout}
        </button>
      </header>

      <div role="tablist" aria-label={t.title} className="flex flex-wrap gap-1.5">
        {TABS.map((s) => (
          <button
            key={s}
            type="button"
            role="tab"
            aria-selected={tab === s}
            onClick={() => setTab(s)}
            className={cn(
              "pressable min-h-10 rounded-full border px-3.5 text-sm font-semibold",
              tab === s ? "border-brand-300 bg-brand-50 text-brand-700" : "border-line bg-surface text-ink-soft hover:border-brand-300"
            )}
          >
            {t.tabs[s]}
          </button>
        ))}
      </div>

      {listError ? (
        <EmptyState tone="warn" role="alert" icon="alert" title={t.error} action={
          <button type="button" onClick={() => void load()} className={`${BUTTON_BASE} ${BUTTON_PRIMARY}`}>{t.retry}</button>
        } />
      ) : items === null ? (
        <p role="status" className="py-6 text-sm text-muted">{t.loading}</p>
      ) : items.length === 0 ? (
        <EmptyState icon="check-circle" title={t.empty} />
      ) : (
        <ul className="flex flex-col gap-4">
          {items.map((r) => (
            <RegistrationCard
              key={r.id}
              registration={r}
              getToken={withToken}
              onChanged={() => void load()}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function RegistrationCard({
  registration: r,
  getToken,
  onChanged,
}: {
  registration: AdminRegistration;
  getToken: () => Promise<string | null>;
  onChanged: () => void;
}) {
  const dict = getDictionary();
  const t = dict.admin;
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cert, setCert] = useState<{ url: string; type: string | null } | null>(null);
  const [certLoading, setCertLoading] = useState(false);

  async function openCertificate() {
    setCertLoading(true);
    try {
      const token = await getToken();
      if (!token) return;
      const link = await getCertificateLink(r.id, token);
      setCert({ url: link.url, type: link.content_type });
    } catch {
      setError(t.actionError);
    } finally {
      setCertLoading(false);
    }
  }

  async function act(action: AdminAction) {
    setError(null);
    if ((action === "reject" || action === "suspend") && !note.trim()) {
      setError(t.noteRequired);
      return;
    }
    if (action === "approve" && !window.confirm(t.confirmApprove(r.pharmacy.name))) return;
    setBusy(true);
    try {
      const token = await getToken();
      if (!token) return;
      await decideRegistration(r.id, action, note.trim() || null, token);
      onChanged();
    } catch (err) {
      setError(err instanceof ApiError && err.detail ? `${t.actionError} (${err.detail})` : t.actionError);
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!window.confirm(t.confirmRemove)) return;
    setBusy(true);
    try {
      const token = await getToken();
      if (!token) return;
      await deleteRegistration(r.id, token);
      onChanged();
    } catch {
      setError(t.actionError);
    } finally {
      setBusy(false);
    }
  }

  const p = r.pharmacy;
  const actions = ACTIONS[r.status];

  return (
    <li className={cn(CARD, "flex flex-col gap-4 p-5")}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-extrabold text-ink">{p.name}</h2>
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-xs font-bold",
                r.new_pharmacy ? "bg-warn-bg text-warn-text ring-1 ring-warn-border/60" : "bg-surface-2 text-ink-soft"
              )}
            >
              {r.new_pharmacy ? t.newPharmacy : t.listedPharmacy}
            </span>
            <span className="rounded-full bg-brand-50 px-2 py-0.5 text-xs font-bold text-brand-700">{t.status[r.status]}</span>
          </div>
          <p className="mt-1 text-sm text-muted">
            {p.address} · {p.city} · {p.governorate}
            {p.phone && <> · <span className="tabular-nums">{formatPhone(p.phone)}</span></>}
          </p>
          <a
            href={`https://www.openstreetmap.org/?mlat=${p.lat}&mlon=${p.lng}#map=18/${p.lat}/${p.lng}`}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(BUTTON_QUIET, "min-h-8 text-xs")}
          >
            <Icon name="map-pin" className="size-3.5" />
            {t.viewOnMap}
          </a>
        </div>
        <div className="text-right text-xs text-muted">
          <p>{t.submitted(formatAbsoluteDateTime(r.created_at))}</p>
          {r.reviewed_at && <p>{t.reviewed(formatAbsoluteDateTime(r.reviewed_at))}</p>}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-control bg-surface-2 p-3 text-sm">
          <p className="text-xs font-bold uppercase tracking-wide text-muted">{t.applicant}</p>
          <p className="mt-1 font-semibold text-ink">{r.full_name}</p>
          <p className="break-all text-ink-soft">{r.email}</p>
          <p className="text-ink-soft tabular-nums">{formatPhone(r.phone)}</p>
          {r.review_note && <p className="mt-2 text-xs text-warn-text">{dict.pharmacist.status.reason(r.review_note)}</p>}
        </div>

        <div className="rounded-control bg-surface-2 p-3 text-sm">
          <p className="text-xs font-bold uppercase tracking-wide text-muted">{t.certificate}</p>
          {!r.has_certificate ? (
            <p className="mt-1 text-warn-text">{t.noCertificate}</p>
          ) : cert ? (
            cert.type?.startsWith("image/") ? (
              // eslint-disable-next-line @next/next/no-img-element -- short-lived signed URL, never optimised
              <a href={cert.url} target="_blank" rel="noopener noreferrer"><img src={cert.url} alt={t.certificate} className="mt-2 max-h-72 w-full rounded-control object-contain bg-surface" /></a>
            ) : (
              <a href={cert.url} target="_blank" rel="noopener noreferrer" className={cn(BUTTON_BASE, BUTTON_SECONDARY, "mt-2")}>
                <Icon name="download" />
                {t.openCertificate} (PDF)
              </a>
            )
          ) : (
            <button type="button" onClick={openCertificate} disabled={certLoading} className={cn(BUTTON_BASE, BUTTON_SECONDARY, "mt-2")}>
              <Icon name={certLoading ? "loader" : "verified"} className={cn(certLoading && "animate-spin")} />
              {certLoading ? t.loadingCertificate : t.openCertificate}
            </button>
          )}
        </div>
      </div>

      {r.status === "pending" && (
        <div className="rounded-control border border-line p-3">
          <p className="text-xs font-bold text-ink">{t.checklistTitle}</p>
          <ul className="mt-1.5 flex list-disc flex-col gap-1 pl-5 text-xs text-muted">
            {t.checklist.map((line) => <li key={line}>{line}</li>)}
          </ul>
        </div>
      )}

      {(actions.length > 0 || r.status === "rejected") && (
        <div className="flex flex-col gap-3">
          {actions.some((a) => a === "reject" || a === "suspend") && (
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={1000}
              rows={2}
              placeholder={t.notePlaceholder}
              className={cn(FIELD, "h-auto py-2.5")}
            />
          )}
          <div className="flex flex-wrap gap-2">
            {actions.map((a) => (
              <button
                key={a}
                type="button"
                disabled={busy}
                onClick={() => act(a)}
                className={buttonVariants({
                  variant: a === "approve" || a === "reactivate" ? "primary" : "danger",
                })}
              >
                <Icon name={a === "approve" || a === "reactivate" ? "check-circle" : "x-circle"} />
                {t[a]}
              </button>
            ))}
            {r.status === "rejected" && (
              <button type="button" disabled={busy} onClick={remove} className={buttonVariants({ variant: "ghost" })}>
                <Icon name="x" />
                {t.remove}
              </button>
            )}
          </div>
          {error && <p role="alert" className="text-sm text-stock-out">{error}</p>}
        </div>
      )}
    </li>
  );
}
