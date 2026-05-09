import { RsvpForm } from "./RsvpForm";
import styles from "./page.module.css";

export const metadata = {
  title: "RSVP — Angela & Brooks",
  description:
    "Let Angela and Brooks know if you can make it to the wedding weekend.",
};

export default function RsvpPage() {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <p className={styles.eyebrow}>Please reply</p>
        <h1 className={styles.title}>RSVP</h1>
        <p className={styles.lede}>
          Let us know whether you can join us. If you&rsquo;re bringing a
          plus-one, add their name so we can plan the table layout. We&rsquo;d
          love a heads-up on dietary needs too — Che Fico will accommodate.
        </p>
      </header>
      <RsvpForm />
    </div>
  );
}
