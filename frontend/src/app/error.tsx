"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Runtime error caught by boundary:", error);
  }, [error]);

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        padding: "24px",
        background: "var(--bg-color)",
        fontFamily: "var(--font-sans)",
        color: "var(--text-main)",
      }}
    >
      <div
        style={{
          maxWidth: "480px",
          width: "100%",
          padding: "36px 32px",
          background: "var(--panel-bg)",
          borderRadius: "20px",
          border: "1px solid var(--panel-border)",
          boxShadow: "0 12px 36px rgba(0,0,0,0.08)",
          textAlign: "center",
        }}
      >
        <div
          style={{
            fontSize: "3.5rem",
            marginBottom: "12px",
            lineHeight: 1,
          }}
        >
          ⚠️
        </div>
        <h1
          style={{
            fontSize: "1.5rem",
            fontWeight: 700,
            marginBottom: "8px",
            color: "var(--text-main)",
          }}
        >
          Etwas ist schiefgelaufen
        </h1>
        <p
          style={{
            fontSize: "0.92rem",
            color: "var(--text-muted)",
            lineHeight: 1.5,
            marginBottom: "24px",
          }}
        >
          Ein unerwarteter Fehler ist aufgetreten. Bitte versuche es erneut oder kehre zur Live-Karte zurück.
        </p>
        <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
          <button
            onClick={() => reset()}
            style={{
              padding: "10px 20px",
              background: "var(--accent-primary)",
              color: "#ffffff",
              border: "none",
              borderRadius: "12px",
              fontWeight: 600,
              fontSize: "0.9rem",
              cursor: "pointer",
            }}
          >
            Erneut versuchen
          </button>
          <Link
            href="/"
            style={{
              padding: "10px 20px",
              background: "var(--subtle-bg)",
              color: "var(--text-main)",
              border: "1px solid var(--subtle-border)",
              borderRadius: "12px",
              textDecoration: "none",
              fontWeight: 600,
              fontSize: "0.9rem",
              display: "inline-flex",
              alignItems: "center",
            }}
          >
            Zur Startseite
          </Link>
        </div>
      </div>
    </div>
  );
}
