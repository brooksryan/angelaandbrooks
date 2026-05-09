import styles from "./Footer.module.css";

// Quiet shared footer rendered on every page. Intentionally minimal — most
// guest-facing info lives on the dedicated pages.
export function Footer() {
  return (
    <footer className={styles.footer}>
      <p>Angela &amp; Brooks · October 23–24, 2026 · San Francisco</p>
    </footer>
  );
}
