import Link from "next/link";
import styles from "./QuickLinkCard.module.css";

type QuickLinkCardProps = {
  href: string;
  label: string;
  description: string;
};

// Card-shaped link used on the home page to route guests directly into the
// four most important destinations. Kept as a leaf component so swapping in a
// different visual treatment later means editing one file.
export function QuickLinkCard({ href, label, description }: QuickLinkCardProps) {
  return (
    <Link href={href} className={styles.card}>
      <span className={styles.label}>{label}</span>
      <span className={styles.description}>{description}</span>
      <span className={styles.arrow} aria-hidden="true">
        →
      </span>
    </Link>
  );
}
