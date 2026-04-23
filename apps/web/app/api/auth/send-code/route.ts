import { NextRequest, NextResponse } from "next/server";
import { getDb, isProductionDB } from "@/lib/db";
import { verificationCodes } from "@/lib/schema";
import { Resend } from "resend";
import { lt, eq, and } from "drizzle-orm";
import { randomInt } from "crypto";

function generateCode(): string {
  return randomInt(100000, 999999).toString();
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

  // Invalidate any existing codes for this email to prevent accumulation
  await db.delete(verificationCodes).where(eq(verificationCodes.email, email.toLowerCase()));

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
    const fromAddress = process.env.RESEND_FROM_EMAIL || "orfc <noreply@mail.orfc.dev>";
    const { error: sendError } = await resend.emails.send({
      from: fromAddress,
      to: [email],
      subject: `Your orfc sign-in code: ${code}`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 400px; margin: 0 auto;">
          <h2 style="font-size: 20px; margin-bottom: 8px;">Sign in to orfc</h2>
          <p style="color: #666; margin-bottom: 24px;">Enter this code to complete your sign-in:</p>
          <div style="background: #f5f5f5; border-radius: 8px; padding: 20px; text-align: center; margin-bottom: 24px;">
            <span style="font-size: 32px; font-weight: bold; letter-spacing: 6px; font-family: monospace;">${code}</span>
          </div>
          <p style="color: #999; font-size: 12px;">This code expires in 10 minutes. If you didn't request this, ignore this email.</p>
        </div>
      `,
    });
    if (sendError) {
      console.error("[Resend error]", sendError);
      return NextResponse.json(
        { error: `Failed to send email: ${sendError.message}` },
        { status: 500 }
      );
    }
  } else {
    // Dev fallback: log to console
    console.log(`[DEV] OTP for ${email}: ${code}`);
  }

  return NextResponse.json({ sent: true });
}
