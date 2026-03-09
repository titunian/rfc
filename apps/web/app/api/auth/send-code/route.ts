import { NextRequest, NextResponse } from "next/server";
import { getDb, isProductionDB } from "@/lib/db";
import { verificationCodes } from "@/lib/schema";
import { Resend } from "resend";
import { lt } from "drizzle-orm";

function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function POST(req: NextRequest) {
  if (!isProductionDB()) {
    return NextResponse.json(
      { error: "Email OTP requires production database" },
      { status: 400 }
    );
  }

  const { email } = await req.json();
  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "Valid email required" }, { status: 400 });
  }

  const code = generateCode();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  const db = getDb();

  // Clean up expired codes
  await db.delete(verificationCodes).where(lt(verificationCodes.expiresAt, new Date()));

  // Store new code
  await db.insert(verificationCodes).values({
    email: email.toLowerCase(),
    code,
    expiresAt,
  });

  // Send via Resend
  const resendKey = process.env.RESEND_API_KEY;
  if (resendKey) {
    const resend = new Resend(resendKey);
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || "rfc <onboarding@resend.dev>",
      to: [email],
      subject: `Your rfc sign-in code: ${code}`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 400px; margin: 0 auto;">
          <h2 style="font-size: 20px; margin-bottom: 8px;">Sign in to rfc</h2>
          <p style="color: #666; margin-bottom: 24px;">Enter this code to complete your sign-in:</p>
          <div style="background: #f5f5f5; border-radius: 8px; padding: 20px; text-align: center; margin-bottom: 24px;">
            <span style="font-size: 32px; font-weight: bold; letter-spacing: 6px; font-family: monospace;">${code}</span>
          </div>
          <p style="color: #999; font-size: 12px;">This code expires in 10 minutes. If you didn't request this, ignore this email.</p>
        </div>
      `,
    });
  } else {
    // Dev fallback: log to console
    console.log(`[DEV] OTP for ${email}: ${code}`);
  }

  return NextResponse.json({ sent: true });
}
