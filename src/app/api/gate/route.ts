import { NextResponse } from "next/server";
import { buildGateCookie, signGateSession } from "../../../lib/gate-auth";
import { readGuestList } from "../../../lib/guest-list";
import { matchGuest } from "../../../lib/guest-match";

// Guest-facing no-match contact, confirmed by the couple. Returned as a
// structured field so the UI can render it as a mailto link; `error` is the
// plain-text fallback. Single source — update the address in one place.
const CONTACT_EMAIL = "bottarini.ryan@gmail.com";

// The gate API: match a typed name against the live Guest List, then issue the
// signed access cookie. The sheet read happens HERE, at issue time only — the
// middleware verifies the resulting cookie's signature with no sheet read.
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

  const { name } = (body ?? {}) as { name?: unknown };
  if (typeof name !== "string" || name.trim().length === 0) {
    return NextResponse.json(
      { ok: false, error: "Please enter the name on your invitation." },
      { status: 400 }
    );
  }

  let guests;
  try {
    guests = await readGuestList();
  } catch (error) {
    console.error("Gate: failed to read the guest list:", error);
    return NextResponse.json(
      {
        ok: false,
        error: "We couldn't check the guest list right now. Please try again in a moment.",
      },
      { status: 503 }
    );
  }

  const result = matchGuest(name, guests);

  if (result.status === "ambiguous") {
    // Never reveal who the candidates are — just ask for more to disambiguate.
    return NextResponse.json(
      {
        ok: false,
        kind: "ambiguous",
        error:
          "More than one guest goes by that name. Please enter your full name.",
      },
      { status: 409 }
    );
  }

  if (result.status === "none") {
    // Leak no names — a retry plus the real contact line.
    return NextResponse.json(
      {
        ok: false,
        kind: "none",
        contactEmail: CONTACT_EMAIL,
        error: `Can't find your name? Reach out to us at ${CONTACT_EMAIL}.`,
      },
      { status: 404 }
    );
  }

  let token: string;
  try {
    token = await signGateSession({
      guestId: result.guest.guestId,
      partyId: result.guest.partyId,
    });
  } catch (error) {
    console.error("Gate: failed to sign access token:", error);
    return NextResponse.json(
      { ok: false, error: "Server is missing gate configuration." },
      { status: 500 }
    );
  }

  const response = NextResponse.json({ ok: true });
  response.headers.append("Set-Cookie", buildGateCookie(token));
  return response;
}
