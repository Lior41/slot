import { describe, it, expect } from "vitest";
import { emailText } from "../src/server/email";
describe("transactional messages", () => {
  it("includes an explicit timezone and cancellation without payment promises", () => {
    const message = emailText({
      name: "Alex",
      service: "Strength club",
      start: "2026-10-04T07:00:00Z",
      timezone: "Asia/Jerusalem",
      kind: "CANCELLATION",
    });
    expect(message.subject).toContain("cancelled");
    expect(message.text).toContain("10:00");
    expect(message.text).toContain("Asia/Jerusalem");
    expect(message.text).toContain("test payments");
    expect(message.text).not.toContain("refunded");
  });
});
