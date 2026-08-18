"use client";

import { useEffect } from "react";
import { getDictionary } from "@/lib/i18n";

/** Fires only when the root layout itself has thrown. At that point
 *  nothing else can be assumed to work — no fonts, no PageContainer, no
 *  shared components — so this renders its own minimal <html><body> with
 *  inline styles only. Deliberately the one boundary WITHOUT
 *  <Disclaimer />: see docs/ARCHITECTURE.md 8.10. */
export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const dict = getDictionary();

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="fr">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "2rem",
          fontFamily:
            "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
          background: "#f8fafc",
          color: "#1f2937",
        }}
      >
        <div style={{ maxWidth: "28rem", textAlign: "center" }}>
          <h1 style={{ fontSize: "1.375rem", fontWeight: 600, margin: 0 }}>
            {dict.errors.globalTitle}
          </h1>
          <p style={{ marginTop: "0.75rem", fontSize: "0.9375rem", color: "#6b7280" }}>
            {dict.errors.globalBody}
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            style={{
              marginTop: "1.5rem",
              minHeight: "44px",
              padding: "0 1rem",
              borderRadius: "0.5rem",
              border: "none",
              background: "#0f766e",
              color: "#ffffff",
              fontSize: "0.9375rem",
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            {dict.errors.globalRetry}
          </button>
        </div>
      </body>
    </html>
  );
}
