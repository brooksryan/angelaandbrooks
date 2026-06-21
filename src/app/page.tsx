import Image from "next/image";
import {
  HERO_IMAGE_ALT,
  HERO_IMAGE_PUBLIC_PATH,
  heroPhotoExists,
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
  // Drop-in hero photo: when `public/hero.jpg` exists it renders via next/image
  // (fill, priority); until then the same 16:9 slot shows a graceful
  // placeholder. Both occupy the identical aspect-ratio box — no layout shift.
  // See src/lib/hero-image.ts for the drop-in path and alt convention.
  const hasHeroPhoto = heroPhotoExists();

  return (
    <div className={styles.page}>
      <section className={styles.hero} aria-labelledby="hero-name">
        <div className={styles.imageSlot}>
          {hasHeroPhoto ? (
            <Image
              src={HERO_IMAGE_PUBLIC_PATH}
              alt={HERO_IMAGE_ALT}
              fill
              priority
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
