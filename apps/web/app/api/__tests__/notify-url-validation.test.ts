import { describe, it, expect } from "vitest";

function validateNotifyUrl(url: string, appUrl: string = "https://www.orfc.dev"): boolean {
  const appHost = appUrl.replace(/\/$/, "");
  return !!url && url.startsWith(appHost + "/");
}

describe("notify URL validation — phishing prevention", () => {
  it("accepts URLs under the app domain", () => {
    expect(validateNotifyUrl("https://www.orfc.dev/p/my-rfc")).toBe(true);
  });

  it("accepts URLs with paths and query strings", () => {
    expect(validateNotifyUrl("https://www.orfc.dev/p/my-rfc?ref=email")).toBe(true);
  });

  it("rejects external domains", () => {
    expect(validateNotifyUrl("https://evil.com/phishing")).toBe(false);
  });

  it("rejects domain prefix attacks (orfc.dev.evil.com)", () => {
    expect(validateNotifyUrl("https://www.orfc.dev.evil.com/p/my-rfc")).toBe(false);
  });

  it("rejects empty URL", () => {
    expect(validateNotifyUrl("")).toBe(false);
  });

  it("rejects bare domain without path", () => {
    expect(validateNotifyUrl("https://www.orfc.dev")).toBe(false);
  });

  it("rejects protocol downgrade", () => {
    expect(validateNotifyUrl("http://www.orfc.dev/p/my-rfc")).toBe(false);
  });

  it("works with custom APP_URL", () => {
    expect(
      validateNotifyUrl("https://rfc.internal.company.com/p/doc", "https://rfc.internal.company.com")
    ).toBe(true);
  });

  it("handles trailing slash in APP_URL", () => {
    expect(
      validateNotifyUrl("https://rfc.example.com/p/doc", "https://rfc.example.com/")
    ).toBe(true);
  });

  it("rejects javascript: protocol", () => {
    expect(validateNotifyUrl("javascript:alert(1)")).toBe(false);
  });

  it("rejects data: URLs", () => {
    expect(validateNotifyUrl("data:text/html,<h1>phish</h1>")).toBe(false);
  });
});
