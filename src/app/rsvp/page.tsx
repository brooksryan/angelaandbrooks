import { cookies } from "next/headers";
import {
  GATE_SESSION_COOKIE,
  verifyGateSession,
} from "../../lib/gate-auth";
import { readGuestList } from "../../lib/guest-list";
import { RsvpForm, type PartyMemberView } from "./RsvpForm";
import styles from "./page.module.css";

export const metadata = {
  title: "RSVP — Angela & Brooks",
  description:
    "Let Angela and Brooks know if you can make it to the wedding weekend.",
};

// Driven by the live Guest List via the gate session, so it must render per
// request (cookie + fresh sheet read). The read happens here at load, not in
// middleware.
export const dynamic = "force-dynamic";

export default async function RsvpPage() {
  const cookieStore = await cookies();
  const session = await verifyGateSession(
    cookieStore.get(GATE_SESSION_COOKIE)?.value
  );

  // Middleware gates /rsvp, so a session should always be present — guard anyway.
  if (!session) {
    return (
      <PageShell>
        <p className={styles.formError} role="alert">
          Your session has expired.{" "}
          <a href="/gate">Enter your name again</a> to RSVP.
        </p>
      </PageShell>
    );
  }

  let guests;
  try {
    guests = await readGuestList();
  } catch {
    return (
      <PageShell>
        <p className={styles.formError} role="alert">
          We couldn&rsquo;t load your invitation right now. Please refresh in a
          moment.
        </p>
      </PageShell>
    );
  }

  const me = guests.find((guest) => guest.guestId === session.guestId);
  if (!me) {
    return (
      <PageShell>
        <p className={styles.formError} role="alert">
          We couldn&rsquo;t find your invitation.{" "}
          <a href="/gate">Enter your name again</a> to RSVP.
        </p>
      </PageShell>
    );
  }

  // The submitter's whole party, keyed off the stable guest_id and grouped live
  // by party_id. Solo guests have partyId === guestId (the reader's contract),
  // so this naturally yields a party of one.
  const party = guests.filter((guest) => guest.partyId === me.partyId);
  // Show the submitter first, then co-members.
  const ordered = [me, ...party.filter((guest) => guest.guestId !== me.guestId)];
  const members: PartyMemberView[] = ordered.map((guest) => ({
    guestId: guest.guestId,
    name: guest.name,
  }));
  const plusOneEligible = party.some((guest) => guest.plusOneAllowed);

  return (
    <PageShell>
      <RsvpForm members={members} plusOneEligible={plusOneEligible} />
    </PageShell>
  );
}

function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <p className={styles.eyebrow}>Please reply</p>
        <h1 className={styles.title}>RSVP</h1>
        <p className={styles.lede}>
          Let us know who can join us. You can reply for everyone on your
          invitation here — and add a heads-up on dietary needs so Che Fico can
          accommodate.
        </p>
      </header>
      {children}
    </div>
  );
}
