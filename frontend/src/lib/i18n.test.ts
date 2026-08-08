import { describe, it, expect } from "vitest";
import { translations } from "./i18n";

describe("i18n Localization Dictionaries", () => {
  it("should contain complete translation entries for both German and English", () => {
    expect(translations.de).toBeDefined();
    expect(translations.en).toBeDefined();

    expect(translations.de.appTitle).toContain("WienWasGeht");
    expect(translations.en.appTitle).toContain("WienWasGeht");
  });

  it("should contain correct Impressum legal owner and contact details", () => {
    expect(translations.de.imprintText).toContain("Dipl.-Ing. Valentin Schnabl");
    expect(translations.de.imprintText).toContain("valentin.cello@gmail.com");
    expect(translations.en.imprintText).toContain("Dipl.-Ing. Valentin Schnabl");
    expect(translations.en.imprintText).toContain("valentin.cello@gmail.com");
  });

  it("should correctly format distance string in German and English", () => {
    expect(translations.de.distanceAway(2.45)).toBe("2.5 km entfernt");
    expect(translations.en.distanceAway(2.45)).toBe("2.5 km away");
  });

  it("should format upcoming status strings correctly", () => {
    expect(translations.de.statusUpcoming("18:30")).toContain("18:30");
    expect(translations.en.statusUpcoming("18:30")).toContain("18:30");
  });
});
