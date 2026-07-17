// Core POST-handler logic for /api/rsvp. Lives outside the Next.js route file
// so it can expose test seams (Next forbids non-route exports from route.ts)
// and so the unit tests can import the handler without the App Router.
//
// Flow: verify the gate cookie → load the submitter's live party from the Guest
// List → plan the fan-out rows → append. The Guest List read happens HERE at
// submit time, never in middleware. Names and plus-one eligibility come from the
// live roster, not the client, so the submission can't claim a guest it isn't.

import { NextResponse } from "next/server";
import { readRsvpsFromSheet, type RsvpRow } from "./admin-sheet";
import { GATE_SESSION_COOKIE, verifyGateSession } from "./gate-auth";
import {
  appendGuestToList,
  readGuestList,
  type Guest,
  type NewGuestListEntry,
} from "./guest-list";
import { planRsvpRows, resolvePlusOneGuestId } from "./party-rsvp";
import { resolvePartyRsvpState } from "./party-rsvp-state";
import {
  appendPlusOneName,
  appendRsvpRows,
  type PlusOneNameLogEntry,
  type PlusOneNameWriter,
  type RsvpRowsWriter,
} from "./sheets";

type GuestListLoader = () => Promise<Guest[]>;
type RsvpLoader = () => Promise<RsvpRow[]>;
type GuestAppender = (entry: NewGuestListEntry) => Promise<void>;

let loadGuestList: GuestListLoader = readGuestList;
let loadRsvps: RsvpLoader = readRsvpsFromSheet;
let writeRows: RsvpRowsWriter = appendRsvpRows;
let appendGuest: GuestAppender = appendGuestToList;
let logPlusOneName: PlusOneNameWriter = appendPlusOneName;

/** Test-only seam — replace the guest-list loader. */
export function __setGuestListLoaderForTesting(next: GuestListLoader): void {
  loadGuestList = next;
}

/** Test-only seam — replace the current-RSVP loader. */
export function __setRsvpLoaderForTesting(next: RsvpLoader): void {
  loadRsvps = next;
}

/** Test-only seam — replace the rows writer. */
export function __setRsvpWriterForTesting(next: RsvpRowsWriter): void {
  writeRows = next;
}

/** Test-only seam — replace the Guest List appender. */
export function __setGuestAppenderForTesting(next: GuestAppender): void {
  appendGuest = next;
}

/** Test-only seam — replace the plus_one_names reference-log writer. */
export function __setPlusOneNameWriterForTesting(next: PlusOneNameWriter): void {
  logPlusOneName = next;
}

/** Test-only seam — restore production dependencies. */
export function __resetRsvpDepsForTesting(): void {
  loadGuestList = readGuestList;
  loadRsvps = readRsvpsFromSheet;
  writeRows = appendRsvpRows;
  appendGuest = appendGuestToList;
  logPlusOneName = appendPlusOneName;
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

  let rsvps: RsvpRow[];
  try {
    rsvps = await loadRsvps();
  } catch (error) {
    console.error("RSVP: failed to read existing RSVPs:", error);
    return NextResponse.json(
      { ok: false, error: "We couldn't load your RSVP right now. Please try again in a moment." },
      { status: 503 }
    );
  }

  const rsvpState = resolvePartyRsvpState(party, rsvps);
  if (rsvpState.status === "complete") {
    return NextResponse.json({ ok: true, alreadyReceived: true });
  }

  const plan = planRsvpRows(body, party);
  if (!plan.ok) {
    return NextResponse.json({ ok: false, errors: plan.errors }, { status: 400 });
  }

  // A stale form may still contain answers another Party member submitted in the
  // meantime. Preserve only Guests who remain unanswered; an all-stale request is
  // an idempotent success and never adds another append-only history row.
  let rows = plan.rows.filter(
    (row) => row.isPlusOne || !rsvpState.answeredGuestIds.has(row.guestId)
  );
  if (rows.length === 0) {
    return NextResponse.json({ ok: true, alreadyReceived: true });
  }

  // A named +1 becomes a first-class Guest (ADR 019eebb3-f8db): mint or reuse a
  // guest_id (idempotent on party_id + normalized name), append it to the Guest
  // List if new, and stamp the real id on its rsvps row. Do this BEFORE writing
  // the rsvps rows so a failed write-back doesn't leave an orphan id in rsvps.
  const plusOneRow = rows.find((row) => row.isPlusOne);
  // A newly-minted +1 is also logged to the plus_one_names reference sheet
  // (ADR 019f4079-fa3a), AFTER the rsvps write so the log never references an
  // RSVP that failed. Gated on isNew so a re-submitted +1 adds no duplicate row.
  let plusOneLog: PlusOneNameLogEntry | null = null;
  if (plusOneRow) {
    try {
      const resolution = resolvePlusOneGuestId(
        guests,
        me.partyId,
        plusOneRow.fullName
      );
      // A first-class +1 may already have an RSVP even while another Party
      // member remains unanswered. Treat it like every other answered Guest and
      // drop its stale row from this append.
      if (
        !resolution.isNew &&
        rsvpState.answeredGuestIds.has(resolution.guestId)
      ) {
        rows = rows.filter((row) => row !== plusOneRow);
      } else {
        if (resolution.isNew) {
          await appendGuest({
            guestId: resolution.guestId,
            name: plusOneRow.fullName,
            partyId: me.partyId, // host's party
            side: me.side, // host's side
            plusOneAllowed: false, // an added +1 can't invite a further +1
            source: "plus-one",
          });
          plusOneLog = {
            partyId: me.partyId,
            hostGuestId: me.guestId,
            hostName: me.name,
            plusOneName: plusOneRow.fullName,
            plusOneGuestId: resolution.guestId,
          };
        }
        plusOneRow.guestId = resolution.guestId;
      }
    } catch (error) {
      console.error("RSVP: failed to write back the plus-one guest:", error);
      return NextResponse.json(
        { ok: false, error: "We couldn't save your RSVP just now. Please try again in a moment." },
        { status: 500 }
      );
    }
  }

  if (rows.length === 0) {
    return NextResponse.json({ ok: true, alreadyReceived: true });
  }

  try {
    await writeRows(rows);
  } catch (error) {
    // Don't echo the underlying error — it can leak service-account detail.
    console.error("RSVP submission failed:", error);
    return NextResponse.json(
      { ok: false, error: "We couldn't save your RSVP just now. Please try again in a moment." },
      { status: 500 }
    );
  }

  // Best-effort reference log: the rsvps + Guest List writes above are the source
  // of record and already succeeded, so a failure here is logged and swallowed —
  // it must never fail an RSVP that is already recorded.
  if (plusOneLog) {
    try {
      await logPlusOneName(plusOneLog);
    } catch (error) {
      console.error("RSVP: plus_one_names reference log failed:", error);
    }
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
