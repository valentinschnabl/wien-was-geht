import Link from "next/link";

export default function NotFound() {
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
            fontSize: "4rem",
            marginBottom: "12px",
            lineHeight: 1,
          }}
        >
          📍
        </div>
        <h1
          style={{
            fontSize: "1.75rem",
            fontWeight: 700,
            marginBottom: "8px",
            color: "var(--text-main)",
          }}
        >
          404 — Seite nicht gefunden
        </h1>
        <p
          style={{
            fontSize: "0.95rem",
            color: "var(--text-muted)",
            lineHeight: 1.6,
            marginBottom: "24px",
          }}
        >
          Diese Seite existiert nicht oder wurde verschoben. Finde alle aktuellen Events,
          Konzerte und Partys direkt auf der Live-Karte von Wien!
        </p>
        <Link
          href="/"
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
            padding: "12px 24px",
            background: "var(--accent-primary)",
            color: "#ffffff",
            borderRadius: "12px",
            textDecoration: "none",
            fontWeight: 600,
            fontSize: "0.95rem",
            transition: "opacity 0.2s ease",
          }}
        >
          Zur Live-Karte (Back to Map)
        </Link>
      </div>
    </div>
  );
}
