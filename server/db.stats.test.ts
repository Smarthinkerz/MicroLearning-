import { describe, expect, it } from "vitest";
import { calculateCompletionRate } from "./db";

describe("calculateCompletionRate", () => {
  it("returns zero rather than NaN when PostgreSQL count values are zero strings", () => {
    expect(calculateCompletionRate("0", "0")).toBe(0);
  });

  it("calculates a rounded percentage from PostgreSQL count values", () => {
    expect(calculateCompletionRate("3", "2")).toBe(67);
  });

  it("handles absent aggregate values", () => {
    expect(calculateCompletionRate(null, null)).toBe(0);
  });
});

