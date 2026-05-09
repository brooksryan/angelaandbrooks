import { NextResponse } from "next/server";
import { buildClearSessionCookie } from "../../../../lib/admin-auth";

export async function POST(): Promise<NextResponse> {
  const response = NextResponse.json({ ok: true });
  response.headers.append("Set-Cookie", buildClearSessionCookie());
  return response;
}
