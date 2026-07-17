import styles from "./page.module.css";

const ALTERATIONS_EMAIL = "bottarini.ryan@gmail.com";

export function RsvpAlreadyReceived() {
  return (
    <div className={styles.successCard} role="status">
      <p className={styles.successEyebrow}>RSVP received</p>
      <h2 className={styles.successTitle}>We&rsquo;ve got your RSVP</h2>
      <p className={styles.successCopy}>
        We&rsquo;ve already received your RSVP. If you need to make any
        alterations, email us at{" "}
        <a href={`mailto:${ALTERATIONS_EMAIL}`}>{ALTERATIONS_EMAIL}</a>.
      </p>
    </div>
  );
}
