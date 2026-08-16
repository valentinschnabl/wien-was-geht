import { describe, it, expect } from "vitest";

export function computeTemporalStatus(
  startStr: string | null | undefined,
  endStr: string | null | undefined,
  now: Date
): "live" | "upcoming" | "concluded" {
  if (!startStr) return "upcoming";

  const start = new Date(startStr);
  const isAllDay =
    start.getHours() === 0 &&
    start.getMinutes() === 0 &&
    (!endStr || (new Date(endStr).getHours() === 23 && new Date(endStr).getMinutes() === 59));

  const end = endStr
    ? new Date(endStr)
    : isAllDay
    ? new Date(new Date(start).setHours(23, 59, 59, 999))
    : new Date(start.getTime() + 3 * 60 * 60 * 1000);

  if (end < now) {
    return "concluded";
  } else if (start <= now && end >= now) {
    return "live";
  } else {
    return "upcoming";
  }
}

describe("Event Temporal Status Classifier", () => {
  const referenceTime = new Date("2026-08-15T18:00:00.000Z");

  it("should classify an ongoing event as live", () => {
    const start = "2026-08-15T16:00:00.000Z";
    const end = "2026-08-15T22:00:00.000Z";
    expect(computeTemporalStatus(start, end, referenceTime)).toBe("live");
  });

  it("should classify an event starting in the future as upcoming", () => {
    const start = "2026-08-15T20:00:00.000Z";
    const end = "2026-08-15T23:00:00.000Z";
    expect(computeTemporalStatus(start, end, referenceTime)).toBe("upcoming");
  });

  it("should classify an event that finished in the past as concluded", () => {
    const start = "2026-08-15T10:00:00.000Z";
    const end = "2026-08-15T14:00:00.000Z";
    expect(computeTemporalStatus(start, end, referenceTime)).toBe("concluded");
  });

  it("should handle single-point start time without end time", () => {
    // Single point in the past
    expect(
      computeTemporalStatus("2026-08-15T12:00:00.000Z", null, referenceTime)
    ).toBe("concluded");

    // Single point in the future
    expect(
      computeTemporalStatus("2026-08-15T21:00:00.000Z", null, referenceTime)
    ).toBe("upcoming");
  });

  it("should handle null or invalid start strings gracefully", () => {
    expect(computeTemporalStatus(null, null, referenceTime)).toBe("upcoming");
    expect(computeTemporalStatus(undefined, undefined, referenceTime)).toBe("upcoming");
  });
});
