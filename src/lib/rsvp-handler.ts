// Core POST-handler logic for /api/rsvp. Lives outside the Next.js route file
// so it can expose test seams (Next forbids non-route exports from route.ts)
// and so the unit tests can import the handler without the App Router.
//
// Flow: verify the gate cookie → load the submitter's live party from the Guest
// List → plan the fan-out rows → append. The Guest List read happens HERE at
// submit time, never in middleware. Names and plus-one eligibility come from the
// live roster, not the client, so the submission can't claim a guest it isn't.

import { NextResponse } from "next/server";
import { GATE_SESSION_COOKIE, verifyGateSession } from "./gate-auth";
import { readGuestList, type Guest } from "./guest-list";
import { planRsvpRows } from "./party-rsvp";
import { appendRsvpRows, type RsvpRowsWriter } from "./sheets";

type GuestListLoader = () => Promise<Guest[]>;

let loadGuestList: GuestListLoader = readGuestList;
let writeRows: RsvpRowsWriter = appendRsvpRows;

/** Test-only seam — replace the guest-list loader. */
export function __setGuestListLoaderForTesting(next: GuestListLoader): void {
  loadGuestList = next;
}

/** Test-only seam — replace the rows writer. */
export function __setRsvpWriterForTesting(next: RsvpRowsWriter): void {
  writeRows = next;
}

/** Test-only seam — restore production dependencies. */
export function __resetRsvpDepsForTesting(): void {
  loadGuestList = readGuestList;
  writeRows = appendRsvpRows;
}

export async function handleRsvpPost(request: Request): Promise<NextResponse> {
  const token = readCookie(request.headers.get("cookie"), GATE_SESSION_COOKIE);
  const session = await verifyGateSession(token);
  if (!session) {
    return NextResponse.json(
      { ok: false, error: "Your session has expired. Please enter your name again." },
      { status: 401 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Body must be valid JSON." },
      { status: 400 }
    );
  }

  let guests: Guest[];
  try {
    guests = await loadGuestList();
  } catch (error) {
    console.error("RSVP: failed to read the guest list:", error);
    return NextResponse.json(
      { ok: false, error: "We couldn't load your invitation right now. Please try again in a moment." },
      { status: 503 }
    );
  }

  // The cookie's guest_id is the stable join key; re-derive the party live so a
  // moved guest or a flipped plus_one_allowed is honored without re-gating.
  const me = guests.find((guest) => guest.guestId === session.guestId);
  if (!me) {
    return NextResponse.json(
      { ok: false, error: "We couldn't find your invitation. Please enter your name again." },
      { status: 409 }
    );
  }
  const party = guests.filter((guest) => guest.partyId === me.partyId);

  const plan = planRsvpRows(body, party);
  if (!plan.ok) {
    return NextResponse.json({ ok: false, errors: plan.errors }, { status: 400 });
  }

  try {
    await writeRows(plan.rows);
  } catch (error) {
    // Don't echo the underlying error — it can leak service-account detail.
    console.error("RSVP submission failed:", error);
    return NextResponse.json(
      { ok: false, error: "We couldn't save your RSVP just now. Please try again in a moment." },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}

/** Minimal Cookie-header parser — returns the named cookie's decoded value. */
function readCookie(header: string | null, name: string): string | undefined {
  if (!header) return undefined;
  for (const part of header.split(";")) {
    const eq = part.indexOf("=");
    if (eq === -1) continue;
    if (part.slice(0, eq).trim() === name) {
      return decodeURIComponent(part.slice(eq + 1).trim());
    }
  }
  return undefined;
}
