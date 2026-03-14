import { NextResponse } from "next/server";

export async function GET() {
  const clientId = process.env.GOOGLE_CLIENT_ID || "";
  return NextResponse.json({
    hasClientId: !!clientId,
    clientIdPrefix: clientId.slice(0, 15),
    clientIdLength: clientId.length,
    hasClientSecret: !!process.env.GOOGLE_CLIENT_SECRET,
    hasDbUrl: !!process.env.DATABASE_URL,
    hasNextAuthSecret: !!process.env.NEXTAUTH_SECRET,
    nextAuthUrl: process.env.NEXTAUTH_URL || "(not set)",
  });
}
