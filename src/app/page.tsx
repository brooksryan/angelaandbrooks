import Image from "next/image";
import {
  HERO_IMAGE_ALT,
  HERO_IMAGE_PUBLIC_PATH,
  HERO_PHOTO_PRESENT,
} from "../lib/hero-image";
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
    description: "Timing, venue, and the evening's specifics.",
  },
  {
    href: "/travel",
    label: "Travel",
    description: "Hotels and getting around San Francisco.",
  },
  {
    href: "/faqs",
    label: "FAQs",
    description: "Common questions about the day.",
  },
] as const;

export default function Home() {
  // Drop-in hero photo: when HERO_PHOTO_PRESENT is true it renders via
  // next/image (fill, priority); otherwise the same arched slot shows a
  // graceful placeholder. Both occupy the identical aspect-ratio box — no
  // layout shift.
  // `unoptimized` serves /hero.jpg directly (the file is already optimized to
  // ~250KB) rather than the Next image optimizer, whose support is not
  // guaranteed under OpenNext/Workers.
  // See src/lib/hero-image.ts for the presence flag, path, and alt convention.

  // Layered invitation-pattern treatment, Home only. The wall wrapper (not
  // body/globals) carries the softly colored pattern tile so no other route
  // inherits it; text always sits on the solid panels floating above the
  // wall, never on the pattern itself. The Team Lead's prototype ruling
  // dropped the earlier full-color accent bands and hero motif — the wall
  // alone carries the pattern now.

  return (
    <div className={styles.wall}>
      <div className={styles.page}>
        <section className={styles.hero} aria-labelledby="hero-name">
          <div className={styles.imageSlot}>
            {HERO_PHOTO_PRESENT ? (
              <Image
                src={HERO_IMAGE_PUBLIC_PATH}
                alt={HERO_IMAGE_ALT}
                fill
                priority
                unoptimized
                sizes="(min-width: 768px) 64rem, 100vw"
                className={styles.heroImage}
              />
            ) : (
              <span className={styles.imageSlotLabel}>Photo coming soon</span>
            )}
          </div>

          <div className={styles.heroText}>
            <h1 id="hero-name" className={styles.heroName}>
              Angela &amp; Brooks
            </h1>
            <p className={styles.heroDate}>Saturday, October 24, 2026</p>
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
    </div>
  );
}
