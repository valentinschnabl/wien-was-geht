"use client";

import { Language } from "@/lib/i18n";

interface ThemeToggleProps {
  theme: "light" | "dark";
  onToggle: () => void;
  language: Language;
}

export default function ThemeToggle({
  theme,
  onToggle,
  language,
}: ThemeToggleProps) {
  const isDark = theme === "dark";
  const titleText = isDark
    ? language === "de"
      ? "Helles Design aktivieren"
      : "Switch to light mode"
    : language === "de"
      ? "Dunkles Design aktivieren"
      : "Switch to dark mode";

  return (
    <button
      type="button"
      className={`btn-theme-toggle ${isDark ? "dark-active" : ""}`}
      onClick={onToggle}
      aria-label={titleText}
      title={titleText}
    >
      <i className={`fa-solid ${isDark ? "fa-sun" : "fa-moon"}`}></i>
    </button>
  );
}
