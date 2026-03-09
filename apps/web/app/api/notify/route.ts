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
      console.error("Email notification failed:", err);
      results.email = false;
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
