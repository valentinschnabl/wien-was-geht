import { describe, it, expect } from "vitest";
import { translations, normalizeCategory, getCategoryLabel } from "./i18n";

describe("i18n Localization Dictionaries", () => {
  it("should contain complete translation entries for both German and English", () => {
    expect(translations.de).toBeDefined();
    expect(translations.en).toBeDefined();

    expect(translations.de.appTitle).toContain("WienWasGeht");
    expect(translations.en.appTitle).toContain("WienWasGeht");
    expect(translations.de.statusLive).toBe("JETZT");
    expect(translations.en.statusLive).toBe("NOW");
    expect(translations.de.statsNow).toBe("Jetzt");
    expect(translations.en.statsNow).toBe("Now");
  });

  it("should contain correct Impressum legal owner, Gewerbenummer and contact details", () => {
    expect(translations.de.imprintText).toContain("Valentin Schnabl");
    expect(translations.de.imprintText).toContain("Margaretenstraße 89/2");
    expect(translations.de.imprintText).toContain("40023236");
    expect(translations.de.imprintText).toContain("valentin-schnabl.at");
    expect(translations.de.imprintText).toContain("Stadt Wien Open Government Data");
    expect(translations.de.imprintText).toContain("simplyycoding@gmail.com");

    expect(translations.en.imprintText).toContain("Valentin Schnabl");
    expect(translations.en.imprintText).toContain("40023236");
    expect(translations.en.imprintText).toContain("valentin-schnabl.at");
    expect(translations.en.imprintText).toContain("simplyycoding@gmail.com");
  });

  it("should correctly format distance string in German and English", () => {
    expect(translations.de.distanceAway(2.45)).toBe("2.5 km entfernt");
    expect(translations.en.distanceAway(2.45)).toBe("2.5 km away");
  });

  it("should format upcoming status strings correctly", () => {
    expect(translations.de.statusUpcoming("18:30")).toContain("18:30");
    expect(translations.en.statusUpcoming("18:30")).toContain("18:30");
  });

  it("should contain translation entries for Free Admission filter and badge", () => {
    expect(translations.de.filterFree).toBe("Eintritt frei");
    expect(translations.en.filterFree).toBe("Free Entry");
    expect(translations.de.badgeFree).toBe("EINTRITT FREI");
    expect(translations.en.badgeFree).toBe("FREE ENTRY");
  });

  it("should normalize and label categories correctly", () => {
    expect(normalizeCategory("Konzert")).toBe("Music");
    expect(normalizeCategory("Party")).toBe("Nightlife");
    expect(normalizeCategory("Kinder")).toBe("Family");
    expect(normalizeCategory("Sport")).toBe("Sports");
    expect(normalizeCategory("Kulinarik")).toBe("Culinary");
    expect(normalizeCategory("Theater")).toBe("Culture");

    expect(getCategoryLabel("Music", "de")).toBe("Musik");
    expect(getCategoryLabel("Music", "en")).toBe("Music");
    expect(getCategoryLabel("Nightlife", "de")).toBe("Nightlife");
    expect(getCategoryLabel("Family", "de")).toBe("Familie");
    expect(getCategoryLabel("Culture", "de")).toBe("Kultur");
    expect(getCategoryLabel("Sports", "de")).toBe("Sport");
    expect(getCategoryLabel("Culinary", "de")).toBe("Kulinarik");
  });
});
