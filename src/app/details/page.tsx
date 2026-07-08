import { PatternWall } from "../../ui/PatternWall";
import styles from "./page.module.css";

// Google Maps deep link — opens the iOS/Android Maps app on mobile and a new
// tab on desktop without requiring a hardcoded place_id.
const RECEPTION_MAP_URL =
  "https://www.google.com/maps/search/?api=1&query=Che+Fico+838+Divisadero+St+San+Francisco+CA+94117";

export default function DetailsPage() {
  return (
    <PatternWall>
      <div className={styles.page}>
        <header className={styles.header}>
          <p className={styles.eyebrow}>Saturday · October 24, 2026</p>
          <h1 className={styles.title}>The celebration</h1>
          <p className={styles.lede}>
            Join us at Che Fico in San Francisco to celebrate over dinner.
            We can&rsquo;t wait to see you there.
          </p>
        </header>

        <section
          className={styles.event}
          aria-labelledby="celebration-heading"
        >
          <h2 id="celebration-heading" className={styles.eventTitle}>
            Dinner reception
          </h2>
          <p className={styles.eventTime}>Saturday, October 24 · 5:30 – 10:30 PM</p>

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
    </PatternWall>
  );
}
