import type { RsvpRow } from "./admin-sheet";
import type { Guest } from "./guest-list";

export type PartyRsvpStatus = "unanswered" | "partial" | "complete";

export type PartyRsvpState = {
  status: PartyRsvpStatus;
  latestByGuestId: ReadonlyMap<string, RsvpRow>;
  answeredGuestIds: ReadonlySet<string>;
  unansweredGuests: Guest[];
};

/**
 * Collapse append-only RSVP history to the latest row for each stable guest_id.
 * Rows without a guest_id remain legacy history and cannot answer for a known
 * Guest, so they are deliberately excluded from this index.
 */
export function latestRsvpsByGuestId(
  rsvps: RsvpRow[]
): Map<string, RsvpRow> {
  const latest = new Map<string, RsvpRow>();
  for (const row of rsvps) {
    if (!row.guestId) continue;
    const existing = latest.get(row.guestId);
    if (!existing || isNewer(row, existing)) {
      latest.set(row.guestId, row);
    }
  }
  return latest;
}

/** Resolve which Guests in one Party have already answered. */
export function resolvePartyRsvpState(
  party: Guest[],
  rsvps: RsvpRow[]
): PartyRsvpState {
  const allLatest = latestRsvpsByGuestId(rsvps);
  const partyIds = new Set(party.map((guest) => guest.guestId));
  const latestByGuestId = new Map(
    [...allLatest].filter(([guestId]) => partyIds.has(guestId))
  );
  const answeredGuestIds = new Set(latestByGuestId.keys());
  const unansweredGuests = party.filter(
    (guest) => !answeredGuestIds.has(guest.guestId)
  );

  const status: PartyRsvpStatus =
    answeredGuestIds.size === 0
      ? "unanswered"
      : unansweredGuests.length === 0
      ? "complete"
      : "partial";

  return {
    status,
    latestByGuestId,
    answeredGuestIds,
    unansweredGuests,
  };
}

function isNewer(a: RsvpRow, b: RsvpRow): boolean {
  const at = a.timestamp ? a.timestamp.getTime() : 0;
  const bt = b.timestamp ? b.timestamp.getTime() : 0;
  return at >= bt;
}
