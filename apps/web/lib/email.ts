import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

export async function sendReviewRequest(opts: {
  to: string[];
  fromName: string;
  title: string;
  url: string;
}) {
  if (!resend) {
    console.warn("RESEND_API_KEY not set, skipping email");
    return;
  }

  const { to, fromName, title, url } = opts;

  const { data, error } = await resend.emails.send({
    from: `orfc <${process.env.RESEND_FROM_EMAIL || "noreply@mail.orfc.dev"}>`,
    to,
    subject: `${fromName} wants your feedback: ${title}`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 500px;">
        <p><strong>${fromName}</strong> shared a doc with you for review.</p>
        <h2 style="margin: 16px 0 8px;">${title}</h2>
        <a href="${url}" style="display: inline-block; padding: 10px 20px; background: #111; color: #fff; text-decoration: none; border-radius: 6px; font-size: 14px;">
          Review
        </a>
        <p style="margin-top: 24px; font-size: 12px; color: #666;">
          Sent via <a href="https://orfc.dev" style="color: #666;">orfc</a>
        </p>
      </div>
    `,
  });

  if (error) {
    console.error("Resend error:", JSON.stringify(error));
    throw new Error(`Email failed: ${error.message}`);
  }

  console.log("Email sent:", JSON.stringify(data));
}

export async function sendCommentNotification(opts: {
  to: string;
  commenterName: string;
  title: string;
  commentText: string;
  url: string;
}) {
  if (!resend) return;

  const { to, commenterName, title, commentText, url } = opts;

  const { data, error } = await resend.emails.send({
    from: `orfc <${process.env.RESEND_FROM_EMAIL || "noreply@mail.orfc.dev"}>`,
    to: [to],
    subject: `New comment on "${title}" from ${commenterName}`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 500px;">
        <p><strong>${commenterName}</strong> commented on your doc.</p>
        <blockquote style="border-left: 3px solid #ddd; padding-left: 12px; color: #555; margin: 12px 0;">
          ${commentText.slice(0, 300)}
        </blockquote>
        <a href="${url}" style="display: inline-block; padding: 10px 20px; background: #111; color: #fff; text-decoration: none; border-radius: 6px; font-size: 14px;">
          View Comment
        </a>
      </div>
    `,
  });

  if (error) {
    console.error("Resend comment notification error:", JSON.stringify(error));
    throw new Error(`Email failed: ${error.message}`);
  }

  console.log("Comment notification sent:", JSON.stringify(data));
}
