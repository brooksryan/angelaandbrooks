// POST /api/rsvp — thin wrapper around the handler in src/lib/rsvp-handler.ts.
// The actual logic lives there so it's testable and so the route file can
// stay limited to Next.js's allowed route exports.

import { handleRsvpPost } from "../../../lib/rsvp-handler";

export async function POST(request: Request) {
  return handleRsvpPost(request);
}
