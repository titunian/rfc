import crypto from "crypto";

// ---------------------------------------------------------------------------
// Slack Web API helpers (uses SLACK_BOT_TOKEN)
// ---------------------------------------------------------------------------

const SLACK_API = "https://slack.com/api";

function getBotToken(): string | null {
  return process.env.SLACK_BOT_TOKEN || null;
}

/**
 * Post an RFC to a Slack channel using the Bot token.
 * Returns { channel, ts } so we can track the thread.
 */
export async function postRfcToChannel(opts: {
  channel: string;
  fromName: string;
  title: string;
  url: string;
}): Promise<{ channel: string; ts: string }> {
  const token = getBotToken();
  if (!token) {
    throw new Error("SLACK_BOT_TOKEN is not configured");
  }

  const { channel, fromName, title, url } = opts;

  const res = await fetch(`${SLACK_API}/chat.postMessage`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      channel,
      unfurl_links: false,
      blocks: [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `*${fromName}* shared an RFC for review:\n*<${url}|${title}>*`,
          },
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: "Reply in this thread to leave comments — they'll be synced to the RFC and available via `orfc pull`.",
          },
        },
        {
          type: "actions",
          elements: [
            {
              type: "button",
              text: { type: "plain_text", text: "Review RFC" },
              url,
              style: "primary",
            },
          ],
        },
      ],
    }),
  });

  const data = await res.json();
  if (!data.ok) {
    throw new Error(`Slack API error: ${data.error}`);
  }

  return { channel: data.channel, ts: data.ts };
}

// ---------------------------------------------------------------------------
// Legacy webhook support (no thread tracking)
// ---------------------------------------------------------------------------

export async function sendSlackNotification(opts: {
  webhookUrl: string;
  fromName: string;
  title: string;
  url: string;
}) {
  const { webhookUrl, fromName, title, url } = opts;

  await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      blocks: [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `*${fromName}* shared an RFC for review:\n*<${url}|${title}>*`,
          },
        },
        {
          type: "actions",
          elements: [
            {
              type: "button",
              text: { type: "plain_text", text: "Review RFC" },
              url,
              style: "primary",
            },
          ],
        },
      ],
    }),
  });
}

// ---------------------------------------------------------------------------
// Slack request verification
// ---------------------------------------------------------------------------

export function verifySlackSignature(
  signingSecret: string,
  timestamp: string,
  body: string,
  signature: string
): boolean {
  const fiveMinutes = 5 * 60;
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - parseInt(timestamp)) > fiveMinutes) {
    return false;
  }

  const baseString = `v0:${timestamp}:${body}`;
  const hmac = crypto
    .createHmac("sha256", signingSecret)
    .update(baseString)
    .digest("hex");
  const expected = `v0=${hmac}`;

  return crypto.timingSafeEqual(
    Buffer.from(expected),
    Buffer.from(signature)
  );
}
