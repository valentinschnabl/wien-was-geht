import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "WienWasGeht — Events heute in Wien & Vienna Events Today";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#0d120f",
          backgroundImage:
            "radial-gradient(circle at 50% 35%, #18281c 0%, #0d120f 70%)",
          fontFamily: "system-ui, -apple-system, sans-serif",
          position: "relative",
          padding: "48px 64px",
          boxSizing: "border-box",
        }}
      >
        {/* Subtle grid accent */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundImage:
              "linear-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.03) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
            opacity: 0.8,
          }}
        />

        {/* Outer Minimalist Container Card */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            width: "100%",
            height: "100%",
            borderRadius: "28px",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            backgroundColor: "rgba(18, 26, 21, 0.6)",
            padding: "40px",
            position: "relative",
            boxSizing: "border-box",
          }}
        >
          {/* Favicon Pin SVG Icon */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: "20px",
            }}
          >
            <svg
              width="110"
              height="110"
              viewBox="0 0 512 512"
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                <linearGradient id="pinGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#3b8250" />
                  <stop offset="50%" stopColor="#2e6f40" />
                  <stop offset="100%" stopColor="#1e4d2b" />
                </linearGradient>
                <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#fae892" />
                  <stop offset="50%" stopColor="#d4af37" />
                  <stop offset="100%" stopColor="#a08022" />
                </linearGradient>
              </defs>
              <rect width="512" height="512" rx="128" fill="#ffffff" />
              <rect
                width="504"
                height="504"
                x="4"
                y="4"
                rx="124"
                fill="none"
                stroke="#e6e4dc"
                strokeWidth="6"
              />
              <path
                d="M256 68 C172 68 104 136 104 220 C104 316 235 448 246.5 459.5 C251.5 464.5 260.5 464.5 265.5 459.5 C277 448 408 316 408 220 C408 136 340 68 256 68 Z"
                fill="url(#pinGrad)"
                stroke="url(#goldGrad)"
                strokeWidth="14"
                strokeLinejoin="round"
              />
              <circle
                cx="256"
                cy="216"
                r="66"
                fill="#ffffff"
                stroke="url(#goldGrad)"
                strokeWidth="9"
              />
            </svg>
          </div>

          {/* Brand Name */}
          <div
            style={{
              fontSize: "64px",
              fontWeight: 800,
              color: "#ffffff",
              letterSpacing: "-0.03em",
              marginBottom: "12px",
              display: "flex",
              alignItems: "center",
            }}
          >
            Wien<span style={{ color: "#5b7b55" }}>Was</span>Geht
          </div>

          {/* Subtitle */}
          <div
            style={{
              fontSize: "24px",
              fontWeight: 500,
              color: "#94a3b8",
              marginBottom: "32px",
              textAlign: "center",
              display: "flex",
              alignItems: "center",
              gap: "12px",
            }}
          >
            <span>Events heute in Wien</span>
            <span style={{ color: "#475569" }}>•</span>
            <span>Vienna Events Today</span>
          </div>

          {/* Clean Minimalist Category Badges */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "14px",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "8px 18px",
                borderRadius: "999px",
                backgroundColor: "rgba(91, 123, 85, 0.2)",
                border: "1px solid rgba(91, 123, 85, 0.4)",
                color: "#d1fae5",
                fontSize: "16px",
                fontWeight: 600,
              }}
            >
              <div
                style={{
                  width: "8px",
                  height: "8px",
                  borderRadius: "50%",
                  backgroundColor: "#22c55e",
                }}
              />
              Live-Karte
            </div>
            <div
              style={{
                padding: "8px 18px",
                borderRadius: "999px",
                backgroundColor: "rgba(255, 255, 255, 0.05)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                color: "#e2e8f0",
                fontSize: "16px",
                fontWeight: 500,
              }}
            >
              Konzerte & Musik
            </div>
            <div
              style={{
                padding: "8px 18px",
                borderRadius: "999px",
                backgroundColor: "rgba(255, 255, 255, 0.05)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                color: "#e2e8f0",
                fontSize: "16px",
                fontWeight: 500,
              }}
            >
              Clubs & Partys
            </div>
            <div
              style={{
                padding: "8px 18px",
                borderRadius: "999px",
                backgroundColor: "rgba(255, 255, 255, 0.05)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                color: "#e2e8f0",
                fontSize: "16px",
                fontWeight: 500,
              }}
            >
              Theater & Kultur
            </div>
            <div
              style={{
                padding: "8px 18px",
                borderRadius: "999px",
                backgroundColor: "rgba(255, 255, 255, 0.05)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                color: "#e2e8f0",
                fontSize: "16px",
                fontWeight: 500,
              }}
            >
              Gratis Events
            </div>
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
