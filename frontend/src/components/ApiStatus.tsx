"use client";

import { useCallback, useEffect, useState } from "react";
import { getApiHealth, getDbHealth } from "@/lib/api";
import { getDictionary } from "@/lib/i18n";
import { BUTTON_BASE, BUTTON_PRIMARY } from "@/lib/ui";

type CheckState = "checking" | "ok" | "error";

const dict = getDictionary();

function StatusLine({
  state,
  okLabel,
  errorLabel,
}: {
  state: CheckState;
  okLabel: string;
  errorLabel: string;
}) {
  const dotColor =
    state === "ok"
      ? "bg-stock-in"
      : state === "error"
        ? "bg-stock-out"
        : "bg-muted";

  const label =
    state === "checking"
      ? dict.apiStatus.checking
      : state === "ok"
        ? okLabel
        : errorLabel;

  return (
    <div className="flex items-center gap-2 text-sm text-ink">
      <span
        aria-hidden="true"
        className={`h-2.5 w-2.5 rounded-full ${dotColor}`}
      />
      <span>{label}</span>
    </div>
  );
}

export function ApiStatus() {
  const [apiState, setApiState] = useState<CheckState>("checking");
  const [dbState, setDbState] = useState<CheckState>("checking");

  const runChecks = useCallback(() => {
    setApiState("checking");
    setDbState("checking");

    void Promise.allSettled([getApiHealth(), getDbHealth()]).then(
      ([apiResult, dbResult]) => {
        if (apiResult.status === "fulfilled") {
          setApiState("ok");
        } else {
          console.error("API health check failed:", apiResult.reason);
          setApiState("error");
        }

        if (dbResult.status === "fulfilled") {
          setDbState("ok");
        } else {
          console.error("DB health check failed:", dbResult.reason);
          setDbState("error");
        }
      }
    );
  }, []);

  useEffect(() => {
    runChecks();
  }, [runChecks]);

  const isChecking = apiState === "checking" || dbState === "checking";
  const hasError = apiState === "error" || dbState === "error";

  return (
    <section aria-label={dict.apiStatus.title} className="rounded-card border border-line bg-surface p-4 shadow-card">
      <div className="flex flex-col gap-2">
        <StatusLine
          state={apiState}
          okLabel={dict.apiStatus.apiOk}
          errorLabel={dict.apiStatus.apiError}
        />
        <StatusLine
          state={dbState}
          okLabel={dict.apiStatus.dbOk}
          errorLabel={dict.apiStatus.dbError}
        />
      </div>
      {isChecking && (
        <p className="mt-3 text-xs text-muted">{dict.apiStatus.coldStart}</p>
      )}
      {hasError && !isChecking && (
        <button type="button" onClick={runChecks} className={`mt-3 ${BUTTON_BASE} ${BUTTON_PRIMARY}`}>
          {dict.apiStatus.retry}
        </button>
      )}
    </section>
  );
}
