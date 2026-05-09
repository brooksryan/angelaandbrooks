import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  ADMIN_SESSION_COOKIE,
  verifyAdminSession,
} from "../../lib/admin-auth";
import { readRsvpsFromSheet, type RsvpRow } from "../../lib/admin-sheet";
import { LogoutButton } from "./LogoutButton";
import styles from "./page.module.css";

// The dashboard reads the live sheet on every request — RSVP volume is small
// enough that bypassing all caches is the simplest correctness story.
export const dynamic = "force-dynamic";
export const revalidate = 0;

type SortKey = "submittedAt" | "attending";
type SortDir = "asc" | "desc";

type AdminPageProps = {
  searchParams: Promise<{ sort?: string; dir?: string }>;
};

export default async function AdminPage({ searchParams }: AdminPageProps) {
  const cookieStore = await cookies();
  const session = await verifyAdminSession(
    cookieStore.get(ADMIN_SESSION_COOKIE)?.value
  );
  if (!session) {
    redirect("/admin/login");
  }

  const params = await searchParams;
  const sortKey = normalizeSortKey(params.sort);
  const sortDir = normalizeSortDir(params.dir);

  let rows: RsvpRow[];
  let loadError: string | null = null;
  try {
    rows = await readRsvpsFromSheet();
  } catch (error) {
    rows = [];
    console.error("Admin: failed to read RSVPs from sheet:", error);
    loadError =
      "We couldn't read the guest list right now. Refresh in a moment, or check the Worker logs if this keeps happening.";
  }

  const sorted = sortRows(rows, sortKey, sortDir);
  const totals = summarize(rows);

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Admin</p>
          <h1 className={styles.title}>Guest list</h1>
          <p className={styles.lede}>
            Live view of the RSVP sheet. Edits go directly in the Google Sheet —
            this dashboard is read-only.
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

      <section className={styles.summary} aria-label="RSVP summary">
        <SummaryStat label="Total responses" value={totals.total} />
        <SummaryStat label="Attending" value={totals.attending} />
        <SummaryStat label="Not attending" value={totals.notAttending} />
        <SummaryStat label="With plus-one" value={totals.withPlusOne} />
      </section>

      {loadError ? (
        <div role="alert" className={styles.loadError}>
          {loadError}
        </div>
      ) : null}

      {sorted.length === 0 && !loadError ? (
        <div className={styles.emptyState}>
          <p>No RSVPs yet. The first submission will appear here.</p>
        </div>
      ) : (
        <div className={styles.tableScroll}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th scope="col" className={styles.colName}>
                  Name
                </th>
                <th
                  scope="col"
                  aria-sort={ariaSortFor("attending", sortKey, sortDir)}
                >
                  <SortLink
                    column="attending"
                    label="Attending"
                    activeKey={sortKey}
                    activeDir={sortDir}
                  />
                </th>
                <th scope="col">Plus-one</th>
                <th scope="col">Dietary restrictions</th>
                <th
                  scope="col"
                  aria-sort={ariaSortFor("submittedAt", sortKey, sortDir)}
                >
                  <SortLink
                    column="submittedAt"
                    label="Submitted"
                    activeKey={sortKey}
                    activeDir={sortDir}
                  />
                </th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((row, index) => (
                <tr key={`${row.timestampIso}-${index}`}>
                  <td>{row.fullName}</td>
                  <td>
                    <AttendingBadge attending={row.attending} />
                  </td>
                  <td>{row.plusOneName || "—"}</td>
                  <td className={styles.dietaryCell}>
                    {row.dietaryRestrictions || "—"}
                  </td>
                  <td className={styles.submittedCell}>
                    {row.timestamp
                      ? row.timestamp.toLocaleString("en-US", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })
                      : row.timestampIso || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
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

function AttendingBadge({ attending }: { attending: boolean | null }) {
  if (attending === true) {
    return (
      <span className={`${styles.badge} ${styles.badgeYes}`}>Yes</span>
    );
  }
  if (attending === false) {
    return <span className={`${styles.badge} ${styles.badgeNo}`}>No</span>;
  }
  return <span className={styles.badge}>—</span>;
}

function SortLink({
  column,
  label,
  activeKey,
  activeDir,
}: {
  column: SortKey;
  label: string;
  activeKey: SortKey;
  activeDir: SortDir;
}) {
  const isActive = column === activeKey;
  const nextDir: SortDir = isActive && activeDir === "desc" ? "asc" : "desc";
  const params = new URLSearchParams({ sort: column, dir: nextDir });
  const arrow = isActive ? (activeDir === "desc" ? " ↓" : " ↑") : "";
  return (
    <a
      href={`/admin?${params.toString()}`}
      className={isActive ? styles.sortActive : styles.sortLink}
    >
      {label}
      <span aria-hidden="true">{arrow}</span>
    </a>
  );
}

function ariaSortFor(
  column: SortKey,
  activeKey: SortKey,
  activeDir: SortDir
): "ascending" | "descending" | "none" {
  if (column !== activeKey) return "none";
  return activeDir === "asc" ? "ascending" : "descending";
}

function normalizeSortKey(value: string | undefined): SortKey {
  return value === "attending" ? "attending" : "submittedAt";
}

function normalizeSortDir(value: string | undefined): SortDir {
  return value === "asc" ? "asc" : "desc";
}

function sortRows(rows: RsvpRow[], key: SortKey, dir: SortDir): RsvpRow[] {
  const multiplier = dir === "asc" ? 1 : -1;
  const sorted = [...rows];
  sorted.sort((a, b) => {
    if (key === "attending") {
      const av = attendingSortValue(a.attending);
      const bv = attendingSortValue(b.attending);
      if (av !== bv) return (av - bv) * multiplier;
      // Tiebreak on submitted-at descending so most recent shows first.
      return compareTimestamps(b.timestamp, a.timestamp);
    }
    return compareTimestamps(a.timestamp, b.timestamp) * multiplier;
  });
  return sorted;
}

function attendingSortValue(value: boolean | null): number {
  if (value === true) return 0;
  if (value === false) return 1;
  return 2;
}

function compareTimestamps(a: Date | null, b: Date | null): number {
  if (a && b) return a.getTime() - b.getTime();
  if (a) return 1;
  if (b) return -1;
  return 0;
}

function summarize(rows: RsvpRow[]) {
  let attending = 0;
  let notAttending = 0;
  let withPlusOne = 0;
  for (const row of rows) {
    if (row.attending === true) attending += 1;
    else if (row.attending === false) notAttending += 1;
    if (row.plusOneName.length > 0) withPlusOne += 1;
  }
  return { total: rows.length, attending, notAttending, withPlusOne };
}
