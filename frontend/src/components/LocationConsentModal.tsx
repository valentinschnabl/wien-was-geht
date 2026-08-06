"use client";

import { translations, Language } from "@/lib/i18n";

interface LocationConsentModalProps {
  isOpen: boolean;
  language: Language;
  onAllow: () => void;
  onDecline: () => void;
}

export default function LocationConsentModal({
  isOpen,
  language,
  onAllow,
  onDecline,
}: LocationConsentModalProps) {
  if (!isOpen) return null;

  const t = translations[language];

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal-card">
        <div className="modal-header">
          <div className="modal-icon-badge">📍</div>
          <div>
            <h3>{t.consentTitle}</h3>
            <span className="badge badge-privacy-clean">{t.privacyBadge}</span>
          </div>
        </div>

        <p className="modal-body-text">{t.consentDescription}</p>

        <div className="privacy-box">
          <div className="privacy-item">
            <span className="check-icon">✓</span>
            <span>{t.consentPrivacyPoint1}</span>
          </div>
          <div className="privacy-item">
            <span className="check-icon">✓</span>
            <span>{t.consentPrivacyPoint2}</span>
          </div>
          <div className="privacy-item">
            <span className="check-icon">✓</span>
            <span>{t.consentPrivacyPoint3}</span>
          </div>
        </div>

        <div className="modal-actions">
          <button
            type="button"
            className="btn btn-primary"
            onClick={onAllow}
          >
            {t.consentAllow}
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onDecline}
          >
            {t.consentDecline}
          </button>
        </div>
      </div>
    </div>
  );
}
