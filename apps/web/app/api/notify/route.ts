import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { sendReviewRequest } from "@/lib/email";
import { sendSlackNotification } from "@/lib/slack";

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { title, url, emails, slackWebhook } = body;

  // Validate that the URL points to this app to prevent phishing
  const appHost = (process.env.APP_URL || "https://www.orfc.dev").replace(/\/$/, "");
  if (!url || !url.startsWith(appHost + "/")) {
    return NextResponse.json(
      { error: "URL must point to this orfc instance" },
      { status: 400 }
    );
  }

  const results: { email?: boolean; slack?: boolean } = {};

  if (emails?.length) {
    try {
      await sendReviewRequest({
        to: emails,
        fromName: user.name || user.email,
        title,
        url,
      });
      results.email = true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("Email notification failed:", msg);
      results.email = false;
      (results as Record<string, unknown>).emailError = msg;
    }
  }

  if (slackWebhook) {
    try {
      await sendSlackNotification({
        webhookUrl: slackWebhook,
        fromName: user.name || user.email,
        title,
        url,
      });
      results.slack = true;
    } catch (err) {
      console.error("Slack notification failed:", err);
      results.slack = false;
    }
  }

  return NextResponse.json({ sent: results });
}
