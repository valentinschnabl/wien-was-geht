"use client";

import { Language } from "@/lib/i18n";

interface LanguageSwitcherProps {
  currentLanguage: Language;
  onLanguageChange: (lang: Language) => void;
}

export default function LanguageSwitcher({
  currentLanguage,
  onLanguageChange,
}: LanguageSwitcherProps) {
  return (
    <div className="language-switcher-pill">
      <button
        type="button"
        className={`lang-btn ${currentLanguage === "de" ? "active" : ""}`}
        onClick={() => onLanguageChange("de")}
        aria-label="Auf Deutsch wechseln"
      >
        DE
      </button>
      <button
        type="button"
        className={`lang-btn ${currentLanguage === "en" ? "active" : ""}`}
        onClick={() => onLanguageChange("en")}
        aria-label="Switch to English"
      >
        EN
      </button>
    </div>
  );
}
