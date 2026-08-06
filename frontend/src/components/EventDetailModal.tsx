"use client";

import { translations, Language } from "@/lib/i18n";
import type { EventRecord } from "./MapView";

interface EventDetailModalProps {
  event: EventRecord | null;
  language: Language;
  onClose: () => void;
}

export default function EventDetailModal({
  event,
  language,
  onClose,
}: EventDetailModalProps) {
  if (!event) return null;

  const t = translations[language];

  const startTimeStr = event.startTime
    ? new Date(event.startTime).toLocaleString(
        language === "de" ? "de-AT" : "en-US",
        {
          weekday: "short",
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }
      )
    : t.timeUnknown;

  const endTimeStr = event.endTime
    ? new Date(event.endTime).toLocaleString(
        language === "de" ? "de-AT" : "en-US",
        {
          weekday: "short",
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }
      )
    : null;

  return (
    <div
      className="modal-backdrop"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="modal-card detail-modal-card"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className="modal-close-btn"
          onClick={onClose}
          aria-label="Schließen"
        >
          ✕
        </button>

        {/* Large Header Image if present */}
        {event.imageUrl && (
          <div className="detail-image-container">
            <img
              src={event.imageUrl}
              alt={event.title}
              className="detail-image"
              onError={(e) => {
                (e.target as HTMLElement).style.display = "none";
              }}
            />
          </div>
        )}

        <div className="detail-body">
          <div className="detail-badges">
            {event.temporalStatus === "live" && (
              <span className="badge badge-live">{t.statusLive}</span>
            )}
            {event.temporalStatus === "upcoming" && (
              <span className="badge badge-upcoming">
                {t.statusUpcoming("")}
              </span>
            )}
            {event.temporalStatus === "concluded" && (
              <span className="badge badge-concluded">
                {t.statusConcluded}
              </span>
            )}

            {typeof event.distanceKm === "number" && (
              <span className="distance-pill">
                🚶 {t.distanceAway(event.distanceKm)}
              </span>
            )}
          </div>

          <h2 className="detail-title">{event.title}</h2>

          <div className="detail-meta">
            <div className="meta-item">
              <span className="meta-icon">📍</span>
              <div>
                <strong>Veranstaltungsort</strong>
                <p>{event.venueName || t.venueDefault}</p>
              </div>
            </div>

            <div className="meta-item">
              <span className="meta-icon">🕒</span>
              <div>
                <strong>{t.startsAt}</strong>
                <p>{startTimeStr}</p>
                {endTimeStr && <p className="small-muted">{t.endsAt}: {endTimeStr}</p>}
              </div>
            </div>
          </div>

          <div className="detail-description-box">
            <h4>Beschreibung</h4>
            <p className="detail-description-text">
              {event.description || "Keine nähere Beschreibung verfügbar."}
            </p>
          </div>

          {/* Constraint per FR-202: No turn-by-turn routing */}
          <div className="detail-actions">
            {event.url && (
              <a
                href={event.url}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-primary btn-external"
              >
                {t.externalLink}
              </a>
            )}
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
            >
              Schließen
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
