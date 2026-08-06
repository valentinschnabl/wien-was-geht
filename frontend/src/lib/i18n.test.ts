import { describe, it, expect } from "vitest";
import { translations } from "./i18n";

describe("i18n Localization Dictionaries", () => {
  it("should contain complete translation entries for both German and English", () => {
    expect(translations.de).toBeDefined();
    expect(translations.en).toBeDefined();

    expect(translations.de.appTitle).toContain("Wien Heute");
    expect(translations.en.appTitle).toContain("Wien Heute");
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
