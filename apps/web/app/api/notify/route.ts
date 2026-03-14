import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { sendReviewRequest } from "@/lib/email";
import { sendSlackNotification, postRfcToChannel } from "@/lib/slack";

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { title, url, emails, slackWebhook, slackChannel } = body;

  const results: Record<string, unknown> = {};

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
      results.emailError = msg;
    }
  }

  // Prefer channel-based posting (enables thread tracking) over legacy webhook
  if (slackChannel) {
    try {
      const thread = await postRfcToChannel({
        channel: slackChannel,
        fromName: user.name || user.email,
        title,
        url,
      });
      results.slack = true;
      results.slackThread = thread; // { channel, ts }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("Slack channel post failed:", msg);
      results.slack = false;
      results.slackError = msg;
    }
  } else if (slackWebhook) {
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
