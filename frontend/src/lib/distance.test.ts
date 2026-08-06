import { describe, it, expect } from "vitest";
import { calculateDistanceKm } from "./distance";

describe("calculateDistanceKm", () => {
  it("should return 0 distance for identical coordinates", () => {
    const dist = calculateDistanceKm(48.2082, 16.3738, 48.2082, 16.3738);
    expect(dist).toBe(0);
  });

  it("should calculate correct Haversine distance between Stephansdom and Schönbrunn Palace", () => {
    // Stephansdom: 48.2085° N, 16.3731° E
    // Schönbrunn: 48.1858° N, 16.3128° E
    // Approximate distance: ~5.2 km
    const dist = calculateDistanceKm(48.2085, 16.3731, 48.1858, 16.3128);
    expect(dist).toBeGreaterThan(4.8);
    expect(dist).toBeLessThan(5.6);
  });

  it("should handle edge cases with invalid coordinates gracefully returning 0", () => {
    expect(calculateDistanceKm(NaN, 16.3738, 48.2082, 16.3738)).toBe(0);
    expect(calculateDistanceKm(48.2082, NaN, 48.2082, 16.3738)).toBe(0);
  });
});
