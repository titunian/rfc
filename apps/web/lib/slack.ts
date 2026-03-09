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
