import { describe, it, expect } from "vitest";
import { formatRetry, stripRetrySuffix } from "../hooks/use-retry-countdown";

describe("retry countdown helpers", () => {
  it("formats seconds and minutes", () => {
    expect(formatRetry(35)).toBe("35s");
    expect(formatRetry(60)).toBe("1:00");
    expect(formatRetry(1199)).toBe("19:59");
  });
  it("strips the static server suffix so the UI can append a live one", () => {
    expect(stripRetrySuffix("Too many requests. Try again in 35s.")).toBe("Too many requests.");
    expect(
      stripRetrySuffix("Account temporarily locked after too many failed attempts. Try again in 15 minute(s)."),
    ).toBe("Account temporarily locked after too many failed attempts.");
    expect(stripRetrySuffix(undefined)).toBe("Too many requests.");
  });
});
