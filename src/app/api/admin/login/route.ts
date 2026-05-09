import { NextResponse } from "next/server";
import {
  buildSessionCookie,
  signAdminSession,
  verifyAdminCredentials,
} from "../../../../lib/admin-auth";

export async function POST(request: Request): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Body must be valid JSON." },
      { status: 400 }
    );
  }

  const { username, password } = (body ?? {}) as {
    username?: unknown;
    password?: unknown;
  };

  if (typeof username !== "string" || typeof password !== "string") {
    return NextResponse.json(
      { ok: false, error: "Username and password are required." },
      { status: 400 }
    );
  }

  // Tiny artificial delay reduces signal in any timing-based username
  // enumeration. Cheap and harmless given the threat model.
  await new Promise((resolve) => setTimeout(resolve, 250));

  const result = verifyAdminCredentials(username, password);
  if (!result.ok) {
    return NextResponse.json(
      { ok: false, error: "Sign-in failed. Check the username and password." },
      { status: 401 }
    );
  }

  let token: string;
  try {
    token = await signAdminSession(result.username);
  } catch (error) {
    console.error("Admin login: failed to sign session token:", error);
    return NextResponse.json(
      { ok: false, error: "Server is missing admin configuration." },
      { status: 500 }
    );
  }

  const response = NextResponse.json({ ok: true });
  response.headers.append("Set-Cookie", buildSessionCookie(token));
  return response;
}
