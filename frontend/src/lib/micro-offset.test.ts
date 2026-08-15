import { describe, it, expect } from "vitest";

export function computeMicroOffsets(
  events: { id: string; latitude: number; longitude: number }[]
): { id: string; lat: number; lng: number }[] {
  const locationCounts = new Map<string, number>();
  events.forEach((ev) => {
    const key = `${ev.latitude.toFixed(5)},${ev.longitude.toFixed(5)}`;
    locationCounts.set(key, (locationCounts.get(key) || 0) + 1);
  });

  const locationIndices = new Map<string, number>();

  return events.map((event) => {
    const key = `${event.latitude.toFixed(5)},${event.longitude.toFixed(5)}`;
    const totalAtLoc = locationCounts.get(key) || 1;
    const indexAtLoc = locationIndices.get(key) || 0;
    locationIndices.set(key, indexAtLoc + 1);

    let finalLat = event.latitude;
    let finalLng = event.longitude;

    if (totalAtLoc > 1) {
      const angle = (indexAtLoc / totalAtLoc) * 2 * Math.PI;
      const radius = 0.00018; // ~15 meters in Vienna
      finalLat = event.latitude + Math.sin(angle) * radius;
      finalLng = event.longitude + Math.cos(angle) * (radius * 1.45);
    }

    return { id: event.id, lat: finalLat, lng: finalLng };
  });
}

describe("Geometric Co-located Marker Micro-Offset Calculator", () => {
  it("should not modify coordinates for standalone single events", () => {
    const events = [
      { id: "e1", latitude: 48.2082, longitude: 16.3738 },
      { id: "e2", latitude: 48.2200, longitude: 16.4000 },
    ];

    const offsetEvents = computeMicroOffsets(events);
    expect(offsetEvents[0].lat).toBe(48.2082);
    expect(offsetEvents[0].lng).toBe(16.3738);
    expect(offsetEvents[1].lat).toBe(48.2200);
    expect(offsetEvents[1].lng).toBe(16.4000);
  });

  it("should disperse 3 events at the exact same venue coordinate into distinct points", () => {
    const baseLat = 48.2346;
    const baseLng = 16.3582;

    const events = [
      { id: "e1", latitude: baseLat, longitude: baseLng },
      { id: "e2", latitude: baseLat, longitude: baseLng },
      { id: "e3", latitude: baseLat, longitude: baseLng },
    ];

    const offsetEvents = computeMicroOffsets(events);
    expect(offsetEvents).toHaveLength(3);

    // Ensure all 3 events receive distinct coordinates
    const p1 = `${offsetEvents[0].lat.toFixed(6)},${offsetEvents[0].lng.toFixed(6)}`;
    const p2 = `${offsetEvents[1].lat.toFixed(6)},${offsetEvents[1].lng.toFixed(6)}`;
    const p3 = `${offsetEvents[2].lat.toFixed(6)},${offsetEvents[2].lng.toFixed(6)}`;

    expect(p1).not.toBe(p2);
    expect(p2).not.toBe(p3);
    expect(p1).not.toBe(p3);

    // Verify distance from base center is within 30 meters (~0.0003 deg)
    offsetEvents.forEach((ev) => {
      const dLat = Math.abs(ev.lat - baseLat);
      const dLng = Math.abs(ev.lng - baseLng);
      expect(dLat).toBeLessThan(0.0005);
      expect(dLng).toBeLessThan(0.0005);
    });
  });
});
