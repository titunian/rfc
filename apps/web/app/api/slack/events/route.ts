import { NextRequest, NextResponse } from "next/server";
import { verifySlackSignature } from "@/lib/slack";
import {
  isProductionDB,
  getDb,
  readLocalDB,
  writeLocalDB,
} from "@/lib/db";
import { comments, plans } from "@/lib/schema";
import { eq, and } from "drizzle-orm";
import { randomUUID } from "crypto";

/**
 * Slack Events API endpoint.
 *
 * Handles:
 * - url_verification challenge (Slack app setup)
 * - message events in threads — if the thread_ts matches a plan's
 *   slackMessageTs, the message is stored as a comment on that RFC.
 */
export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const body = JSON.parse(rawBody);

  // --- URL verification challenge (Slack app setup) ---
  if (body.type === "url_verification") {
    return NextResponse.json({ challenge: body.challenge });
  }

  // --- Verify signature ---
  const signingSecret = process.env.SLACK_SIGNING_SECRET;
  if (signingSecret) {
    const timestamp = req.headers.get("x-slack-request-timestamp") || "";
    const signature = req.headers.get("x-slack-signature") || "";

    if (!verifySlackSignature(signingSecret, timestamp, rawBody, signature)) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }
  }

  // --- Handle event callbacks ---
  if (body.type !== "event_callback") {
    return NextResponse.json({ ok: true });
  }

  const event = body.event;

  // Only handle thread replies (messages with thread_ts that differ from ts)
  if (
    event.type !== "message" ||
    !event.thread_ts ||
    event.thread_ts === event.ts ||
    event.subtype // ignore bot messages, edits, etc.
  ) {
    return NextResponse.json({ ok: true });
  }

  const threadTs = event.thread_ts;
  const channelId = event.channel;
  const text = event.text || "";
  const slackUserId = event.user;

  // Look up the plan that this thread belongs to
  if (isProductionDB()) {
    const db = getDb();
    const [plan] = await db
      .select({ id: plans.id })
      .from(plans)
      .where(
        and(
          eq(plans.slackChannelId, channelId),
          eq(plans.slackMessageTs, threadTs)
        )
      )
      .limit(1);

    if (!plan) {
      // Thread doesn't belong to any tracked RFC
      return NextResponse.json({ ok: true });
    }

    // Resolve Slack user display name
    const authorName = await resolveSlackUserName(slackUserId);

    await db.insert(comments).values({
      planId: plan.id,
      authorName,
      authorEmail: null,
      content: text,
      anchorText: null,
      anchorBlockIndex: null,
      anchorOffsetStart: null,
      anchorOffsetEnd: null,
      source: "slack",
    });
  } else {
    // Local mode
    const localDb = readLocalDB();
    const plan = localDb.plans.find(
      (p) =>
        p.slackChannelId === channelId && p.slackMessageTs === threadTs
    );

    if (!plan) {
      return NextResponse.json({ ok: true });
    }

    const authorName = await resolveSlackUserName(slackUserId);

    localDb.comments.push({
      id: randomUUID(),
      planId: plan.id,
      authorName,
      authorEmail: null,
      content: text,
      anchorText: null,
      anchorBlockIndex: null,
      anchorOffsetStart: null,
      anchorOffsetEnd: null,
      source: "slack",
      resolved: false,
      createdAt: new Date().toISOString(),
    });

    writeLocalDB(localDb);
  }

  return NextResponse.json({ ok: true });
}

/**
 * Resolve a Slack user ID to a display name via users.info.
 * Falls back to the raw user ID if the API call fails.
 */
async function resolveSlackUserName(userId: string): Promise<string> {
  const token = process.env.SLACK_BOT_TOKEN;
  if (!token) return userId;

  try {
    const res = await fetch(
      `https://slack.com/api/users.info?user=${userId}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    const data = await res.json();
    if (data.ok && data.user) {
      return (
        data.user.profile?.display_name ||
        data.user.real_name ||
        data.user.name ||
        userId
      );
    }
  } catch {
    // fall through
  }
  return userId;
}
