import { describe, it, expect } from "vitest";
import { checkAccess } from "../auth";

describe("checkAccess", () => {
  describe("public plans (accessRule: 'anyone')", () => {
    it("grants access to unauthenticated users", () => {
      expect(checkAccess({ accessRule: "anyone" }, null)).toBe(true);
    });

    it("grants access to authenticated users", () => {
      expect(checkAccess({ accessRule: "anyone" }, "user@test.com")).toBe(true);
    });

    it("treats empty accessRule as public", () => {
      expect(checkAccess({ accessRule: "" }, null)).toBe(true);
    });
  });

  describe("authenticated-only plans", () => {
    it("denies access to unauthenticated users", () => {
      expect(checkAccess({ accessRule: "authenticated" }, null)).toBe(false);
    });

    it("denies access when email is undefined", () => {
      expect(checkAccess({ accessRule: "authenticated" }, undefined)).toBe(false);
    });

    it("grants access to any authenticated user", () => {
      expect(checkAccess({ accessRule: "authenticated" }, "user@test.com")).toBe(true);
    });
  });

  describe("author access", () => {
    it("always grants access to the plan author", () => {
      expect(
        checkAccess(
          { accessRule: "authenticated", authorEmail: "author@test.com", allowedViewers: "other@test.com" },
          "author@test.com"
        )
      ).toBe(true);
    });

    it("author check is case-insensitive", () => {
      expect(
        checkAccess(
          { accessRule: "authenticated", authorEmail: "Author@Test.COM", allowedViewers: "other@test.com" },
          "author@test.com"
        )
      ).toBe(true);
    });
  });

  describe("allowedViewers — specific emails", () => {
    it("grants access to listed email", () => {
      expect(
        checkAccess(
          { accessRule: "authenticated", allowedViewers: "alice@test.com,bob@test.com" },
          "alice@test.com"
        )
      ).toBe(true);
    });

    it("denies access to unlisted email", () => {
      expect(
        checkAccess(
          { accessRule: "authenticated", allowedViewers: "alice@test.com" },
          "eve@test.com"
        )
      ).toBe(false);
    });

    it("email matching is case-insensitive", () => {
      expect(
        checkAccess(
          { accessRule: "authenticated", allowedViewers: "Alice@Test.COM" },
          "alice@test.com"
        )
      ).toBe(true);
    });

    it("handles whitespace in viewer list", () => {
      expect(
        checkAccess(
          { accessRule: "authenticated", allowedViewers: " alice@test.com , bob@test.com " },
          "bob@test.com"
        )
      ).toBe(true);
    });
  });

  describe("allowedViewers — domain patterns", () => {
    it("grants access via @domain pattern", () => {
      expect(
        checkAccess(
          { accessRule: "authenticated", allowedViewers: "@acme.com" },
          "alice@acme.com"
        )
      ).toBe(true);
    });

    it("denies access to wrong domain", () => {
      expect(
        checkAccess(
          { accessRule: "authenticated", allowedViewers: "@acme.com" },
          "alice@evil.com"
        )
      ).toBe(false);
    });

    it("domain matching is case-insensitive", () => {
      expect(
        checkAccess(
          { accessRule: "authenticated", allowedViewers: "@Acme.COM" },
          "alice@acme.com"
        )
      ).toBe(true);
    });
  });

  describe("empty allowedViewers — security-critical", () => {
    it("denies access when allowedViewers is empty string", () => {
      expect(
        checkAccess(
          { accessRule: "authenticated", allowedViewers: "" },
          "user@test.com"
        )
      ).toBe(false);
    });

    it("denies access when allowedViewers is whitespace-only", () => {
      expect(
        checkAccess(
          { accessRule: "authenticated", allowedViewers: "  ,  , " },
          "user@test.com"
        )
      ).toBe(false);
    });

    it("author still has access even with empty allowedViewers", () => {
      expect(
        checkAccess(
          { accessRule: "authenticated", allowedViewers: "", authorEmail: "author@test.com" },
          "author@test.com"
        )
      ).toBe(true);
    });
  });

  describe("null/undefined allowedViewers", () => {
    it("null allowedViewers falls through to authenticated check", () => {
      expect(
        checkAccess(
          { accessRule: "authenticated", allowedViewers: null },
          "user@test.com"
        )
      ).toBe(true);
    });

    it("undefined allowedViewers falls through to authenticated check", () => {
      expect(
        checkAccess(
          { accessRule: "authenticated", allowedViewers: undefined },
          "user@test.com"
        )
      ).toBe(true);
    });

    it("omitted allowedViewers falls through to authenticated check", () => {
      expect(
        checkAccess(
          { accessRule: "authenticated" },
          "user@test.com"
        )
      ).toBe(true);
    });
  });
});
