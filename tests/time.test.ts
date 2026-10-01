import { describe, it, expect } from "vitest";
import { localInstant, timeParts } from "../src/lib/time";
describe("studio civil time", () => {
  it("rejects nonexistent spring-forward times", () =>
    expect(() => localInstant("2026-03-08T02:30", "America/New_York")).toThrow());
  it("rejects ambiguous fall-back times", () =>
    expect(() => localInstant("2026-11-01T01:30", "America/New_York")).toThrow());
  it("preserves valid local time through UTC conversion", () => {
    const instant = localInstant("2026-10-05T10:15", "Asia/Jerusalem");
    expect(timeParts(instant, "Asia/Jerusalem")).toEqual({
      weekday: 1,
      minutes: 615,
      date: "2026-10-05",
    });
  });
});
