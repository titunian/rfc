import { describe, it, expect, vi } from "vitest";
import { sendSlackNotification } from "../slack";

const validOpts = {
  fromName: "Alice",
  title: "My RFC",
  url: "https://www.orfc.dev/p/my-rfc",
};

describe("sendSlackNotification — SSRF prevention", () => {
  it("rejects non-URL strings", async () => {
    await expect(
      sendSlackNotification({ ...validOpts, webhookUrl: "not-a-url" })
    ).rejects.toThrow("Invalid Slack webhook URL");
  });

  it("rejects http:// URLs (requires https)", async () => {
    await expect(
      sendSlackNotification({
        ...validOpts,
        webhookUrl: "http://hooks.slack.com/services/T/B/x",
      })
    ).rejects.toThrow("must be an https://hooks.slack.com/ URL");
  });

  it("rejects URLs to non-Slack hosts", async () => {
    await expect(
      sendSlackNotification({
        ...validOpts,
        webhookUrl: "https://evil.com/services/T/B/x",
      })
    ).rejects.toThrow("must be an https://hooks.slack.com/ URL");
  });

  it("rejects subdomain spoofing (hooks.slack.com.evil.com)", async () => {
    await expect(
      sendSlackNotification({
        ...validOpts,
        webhookUrl: "https://hooks.slack.com.evil.com/services/T/B/x",
      })
    ).rejects.toThrow("must be an https://hooks.slack.com/ URL");
  });

  it("rejects internal network URLs", async () => {
    await expect(
      sendSlackNotification({
        ...validOpts,
        webhookUrl: "https://169.254.169.254/latest/meta-data/",
      })
    ).rejects.toThrow("must be an https://hooks.slack.com/ URL");
  });

  it("rejects file:// protocol", async () => {
    await expect(
      sendSlackNotification({
        ...validOpts,
        webhookUrl: "file:///etc/passwd",
      })
    ).rejects.toThrow("must be an https://hooks.slack.com/ URL");
  });

  it("accepts valid Slack webhook URL", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("ok"));
    await sendSlackNotification({
      ...validOpts,
      webhookUrl: "https://hooks.slack.com/services/T123/B456/abcdef",
    });
    expect(fetchSpy).toHaveBeenCalledOnce();
    fetchSpy.mockRestore();
  });
});
