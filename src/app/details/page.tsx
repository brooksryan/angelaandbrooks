import styles from "./page.module.css";

export const runtime = "edge";

// Google Maps deep link — opens the iOS/Android Maps app on mobile and a new
// tab on desktop without requiring a hardcoded place_id.
const RECEPTION_MAP_URL =
  "https://www.google.com/maps/search/?api=1&query=Che+Fico+838+Divisadero+St+San+Francisco+CA+94117";

export default function DetailsPage() {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <p className={styles.eyebrow}>Two days · Two events</p>
        <h1 className={styles.title}>The weekend</h1>
        <p className={styles.lede}>
          The wedding spans two days in San Francisco. The ceremony is on{" "}
          <strong>Friday, October 23</strong>, followed by a dinner reception
          on <strong>Saturday, October 24</strong>. Plan to be in town for both.
        </p>
      </header>

      <section
        className={styles.event}
        aria-labelledby="ceremony-heading"
      >
        <p className={styles.eventDay}>
          <span className={styles.eventDayLabel}>Day one</span>
          <span className={styles.eventDayValue}>Friday, October 23, 2026</span>
        </p>
        <h2 id="ceremony-heading" className={styles.eventTitle}>
          Ceremony
        </h2>
        <p className={styles.eventStatus}>Morning · details coming soon</p>
        <p className={styles.eventCopy}>
          We&rsquo;re finalizing the ceremony venue and time. Once confirmed
          we&rsquo;ll update this page and send a note — likely a few months
          out.
        </p>
      </section>

      <section
        className={styles.event}
        aria-labelledby="reception-heading"
      >
        <p className={styles.eventDay}>
          <span className={styles.eventDayLabel}>Day two</span>
          <span className={styles.eventDayValue}>Saturday, October 24, 2026</span>
        </p>
        <h2 id="reception-heading" className={styles.eventTitle}>
          Dinner reception
        </h2>
        <p className={styles.eventTime}>5:30 – 10:30 PM</p>

        <dl className={styles.eventMeta}>
          <div className={styles.metaRow}>
            <dt>Venue</dt>
            <dd>Che Fico</dd>
          </div>
          <div className={styles.metaRow}>
            <dt>Address</dt>
            <dd>
              838 Divisadero Street
              <br />
              San Francisco, CA 94117
            </dd>
          </div>
        </dl>

        <p className={styles.mapLink}>
          <a
            href={RECEPTION_MAP_URL}
            target="_blank"
            rel="noopener noreferrer"
          >
            Open in Google Maps →
          </a>
        </p>
      </section>
    </div>
  );
}
