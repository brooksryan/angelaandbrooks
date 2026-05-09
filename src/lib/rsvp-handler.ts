// Core POST-handler logic for /api/rsvp. Lives outside the Next.js route file
// so it can expose test seams (Next forbids non-route exports from route.ts)
// and so the unit tests can import the handler without spinning up the App
// Router framework.

import { NextResponse } from "next/server";
import { validateRsvp } from "./rsvp";
import { appendRsvpToSheet, type SheetsWriter } from "./sheets";

let writer: SheetsWriter = appendRsvpToSheet;

/** Test-only seam — replace the writer used by the handler. */
export function __setRsvpWriterForTesting(next: SheetsWriter): void {
  writer = next;
}

/** Test-only seam — restore the production writer. */
export function __resetRsvpWriterForTesting(): void {
  writer = appendRsvpToSheet;
}

export async function handleRsvpPost(request: Request): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Body must be valid JSON." },
      { status: 400 }
    );
  }

  const result = validateRsvp(body);
  if (!result.ok) {
    return NextResponse.json(
      { ok: false, errors: result.errors },
      { status: 400 }
    );
  }

  try {
    await writer(result.value);
  } catch (error) {
    // Don't echo the underlying error to the client — it can leak service
    // account details. Log server-side for ops.
    console.error("RSVP submission failed:", error);
    return NextResponse.json(
      {
        ok: false,
        error:
          "We couldn't save your RSVP just now. Please try again in a moment.",
      },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
