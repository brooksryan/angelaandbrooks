import { QuickLinkCard } from "../ui/QuickLinkCard";
import styles from "./page.module.css";

// Order matters: RSVP first, always — it's the highest-leverage action a guest
// can take from the home page.
const QUICK_LINKS = [
  {
    href: "/rsvp",
    label: "RSVP",
    description: "Let us know if you can make it.",
  },
  {
    href: "/details",
    label: "Details",
    description: "Ceremony, dinner, and venue specifics.",
  },
  {
    href: "/travel",
    label: "Travel",
    description: "Hotels and getting around San Francisco.",
  },
  {
    href: "/faqs",
    label: "FAQs",
    description: "Common questions about the weekend.",
  },
] as const;

export default function Home() {
  return (
    <div className={styles.page}>
      <section className={styles.hero} aria-labelledby="hero-name">
        {/*
          Placeholder hero image slot — a 16:9 wrapper with `position: relative`
          and an aspect-ratio container, ready to receive a `<Image fill … />`.
          When the engagement photo is delivered, replace the inner span with
          the next/image element; no layout changes required.
        */}
        <div className={styles.imageSlot}>
          <span className={styles.imageSlotLabel}>Photo coming soon</span>
        </div>

        <div className={styles.heroText}>
          <h1 id="hero-name" className={styles.heroName}>
            Angela &amp; Brooks
          </h1>
          <p className={styles.heroDate}>October 23 – 24, 2026</p>
          <p className={styles.heroVenue}>Che Fico · San Francisco</p>
        </div>
      </section>

      <section aria-labelledby="quick-links-heading">
        <h2 id="quick-links-heading" className={styles.cardsHeading}>
          Quick links
        </h2>
        <div className={styles.cards}>
          {QUICK_LINKS.map((link) => (
            <QuickLinkCard
              key={link.href}
              href={link.href}
              label={link.label}
              description={link.description}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
