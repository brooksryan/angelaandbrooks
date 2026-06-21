import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  ADMIN_SESSION_COOKIE,
  verifyAdminSession,
} from "../../lib/admin-auth";
import {
  buildRoster,
  readRsvpsFromSheet,
  type RosterClass,
} from "../../lib/admin-sheet";
import { readGuestList } from "../../lib/guest-list";
import { LogoutButton } from "./LogoutButton";
import styles from "./page.module.css";

// The dashboard reads the live sheets on every request — RSVP volume is small
// enough that bypassing all caches is the simplest correctness story.
export const dynamic = "force-dynamic";
export const revalidate = 0;

// Order entries so the actionable rows (not-yet-replied) sit on top.
const CLASS_ORDER: Record<RosterClass, number> = {
  "invited-not-replied": 0,
  "invited-replied": 1,
  "added-plus-one": 2,
  "legacy-orphan": 3,
};

export default async function AdminPage() {
  const cookieStore = await cookies();
  const session = await verifyAdminSession(
    cookieStore.get(ADMIN_SESSION_COOKIE)?.value
  );
  if (!session) {
    redirect("/admin/login");
  }

  let roster: ReturnType<typeof buildRoster> | null = null;
  let loadError: string | null = null;
  try {
    const [guests, rsvps] = await Promise.all([
      readGuestList(),
      readRsvpsFromSheet(),
    ]);
    roster = buildRoster(guests, rsvps);
  } catch (error) {
    console.error("Admin: failed to build the roster:", error);
    loadError =
      "We couldn't read the guest list right now. Refresh in a moment, or check the Worker logs if this keeps happening.";
  }

  const entries = roster
    ? [...roster.entries].sort(
        (a, b) =>
          CLASS_ORDER[a.classification] - CLASS_ORDER[b.classification] ||
          a.name.localeCompare(b.name)
      )
    : [];

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Admin</p>
          <h1 className={styles.title}>Guest roster</h1>
          <p className={styles.lede}>
            The Guest List joined to RSVPs — who&rsquo;s invited, who&rsquo;s
            replied, and who to chase. Read-only; edits happen in the Sheet.
          </p>
        </div>
        <div className={styles.headerActions}>
          <span className={styles.sessionLabel}>
            Signed in as{" "}
            <strong className={styles.sessionUser}>{session.username}</strong>
          </span>
          <LogoutButton />
        </div>
      </header>

      {roster ? (
        <section className={styles.summary} aria-label="Roster summary">
          <SummaryStat label="Invited" value={roster.counts.invited} />
          <SummaryStat label="Replied" value={roster.counts.replied} />
          <SummaryStat label="Not replied" value={roster.counts.notReplied} />
          <SummaryStat label="Added +1s" value={roster.counts.addedPlusOnes} />
        </section>
      ) : null}

      {loadError ? (
        <div role="alert" className={styles.loadError}>
          {loadError}
        </div>
      ) : null}

      {roster && roster.notReplied.length > 0 ? (
        <section className={styles.chaseList} aria-label="Not yet replied">
          <h2 className={styles.chaseTitle}>
            Not yet replied ({roster.notReplied.length})
          </h2>
          <ul className={styles.chaseNames}>
            {roster.notReplied
              .slice()
              .sort((a, b) => a.name.localeCompare(b.name))
              .map((entry) => (
                <li key={entry.guestId} className={styles.chaseName}>
                  {entry.name}
                </li>
              ))}
          </ul>
        </section>
      ) : null}

      {roster && entries.length === 0 && !loadError ? (
        <div className={styles.emptyState}>
          <p>No guests on the list yet.</p>
        </div>
      ) : null}

      {entries.length > 0 ? (
        <div className={styles.tableScroll}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th scope="col" className={styles.colName}>
                  Name
                </th>
                <th scope="col">Status</th>
                <th scope="col">Attending</th>
                <th scope="col">Dietary restrictions</th>
                <th scope="col">Replied</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry, index) => (
                <tr key={`${entry.guestId || entry.name}-${index}`}>
                  <td>{entry.name}</td>
                  <td>
                    <StatusBadge classification={entry.classification} />
                  </td>
                  <td>
                    <AttendingBadge attending={entry.attending} />
                  </td>
                  <td className={styles.dietaryCell}>
                    {entry.dietaryRestrictions || "—"}
                  </td>
                  <td className={styles.submittedCell}>
                    {entry.repliedAt
                      ? entry.repliedAt.toLocaleString("en-US", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}

function SummaryStat({ label, value }: { label: string; value: number }) {
  return (
    <div className={styles.stat}>
      <span className={styles.statValue}>{value}</span>
      <span className={styles.statLabel}>{label}</span>
    </div>
  );
}

const STATUS_LABELS: Record<RosterClass, string> = {
  "invited-replied": "Replied",
  "invited-not-replied": "Awaiting",
  "added-plus-one": "+1 added",
  "legacy-orphan": "Orphan",
};

const STATUS_CLASS: Record<RosterClass, string> = {
  "invited-replied": "badgeReplied",
  "invited-not-replied": "badgeAwaiting",
  "added-plus-one": "badgePlusOne",
  "legacy-orphan": "badgeOrphan",
};

function StatusBadge({ classification }: { classification: RosterClass }) {
  return (
    <span className={`${styles.badge} ${styles[STATUS_CLASS[classification]]}`}>
      {STATUS_LABELS[classification]}
    </span>
  );
}

function AttendingBadge({ attending }: { attending: boolean | null }) {
  if (attending === true) {
    return <span className={`${styles.badge} ${styles.badgeYes}`}>Yes</span>;
  }
  if (attending === false) {
    return <span className={`${styles.badge} ${styles.badgeNo}`}>No</span>;
  }
  return <span className={styles.badge}>—</span>;
}
