export async function sendSlackNotification(opts: {
  webhookUrl: string;
  fromName: string;
  title: string;
  url: string;
}) {
  const { webhookUrl, fromName, title, url } = opts;

  let parsed: URL;
  try {
    parsed = new URL(webhookUrl);
  } catch {
    throw new Error("Invalid Slack webhook URL");
  }
  if (parsed.protocol !== "https:" || !parsed.hostname.endsWith("hooks.slack.com")) {
    throw new Error("Slack webhook URL must be an https://hooks.slack.com/ URL");
  }

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
