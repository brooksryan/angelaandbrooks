import styles from "./PatternWall.module.css";

// The muted invitation-pattern wall, shared by every guest CONTENT page. Full-
// bleed behind the centered content column; the page's panels float on it and
// carry all text, so nothing reads over the pattern. The gate keeps its own
// full-color treatment and does not use this; the admin surfaces stay plain.
export function PatternWall({ children }: { children: React.ReactNode }) {
  return <div className={styles.wall}>{children}</div>;
}
