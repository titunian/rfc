import { describe, it, expect } from "vitest";
import { randomInt } from "crypto";

describe("OTP generation security", () => {
  function generateCode(): string {
    return randomInt(100000, 999999).toString();
  }

  it("generates 6-digit codes", () => {
    for (let i = 0; i < 100; i++) {
      const code = generateCode();
      expect(code).toHaveLength(6);
      expect(Number(code)).toBeGreaterThanOrEqual(100000);
      expect(Number(code)).toBeLessThanOrEqual(999999);
    }
  });

  it("generates unpredictable codes (not sequential)", () => {
    const codes = new Set<string>();
    for (let i = 0; i < 50; i++) {
      codes.add(generateCode());
    }
    expect(codes.size).toBeGreaterThan(40);
  });

  it("codes are numeric only", () => {
    for (let i = 0; i < 100; i++) {
      const code = generateCode();
      expect(code).toMatch(/^\d{6}$/);
    }
  });

  it("crypto.randomInt produces integers in the correct range", () => {
    for (let i = 0; i < 200; i++) {
      const n = randomInt(100000, 999999);
      expect(n).toBeGreaterThanOrEqual(100000);
      expect(n).toBeLessThan(999999);
    }
  });
});
