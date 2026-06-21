import styles from "./page.module.css";

// The couple's live registry. Add more entries here if they ever register in
// more than one place — the page renders a button per entry. If the array is
// emptied the page falls back to the graceful "coming soon" treatment, so both
// branches ship together.
type RegistryLink = {
  label: string;
  url: string;
};

const REGISTRY_LINKS: RegistryLink[] = [
  {
    label: "View our registry",
    url: "https://www.myregistry.com/wedding-registry/brooks-ryan-and-angela-bottarini-san-francisco-ca/5496554",
  },
];

export default function RegistryPage() {
  if (REGISTRY_LINKS.length > 0) {
    return (
      <div className={styles.page}>
        <section className={styles.card} aria-labelledby="registry-heading">
          <h1 id="registry-heading" className={styles.title}>
            Registry
          </h1>
          <p className={styles.lede}>
            Thank you for thinking of us. Our registry is below.
          </p>
          <div className={styles.actions}>
            {REGISTRY_LINKS.map((link) => (
              <a
                key={link.url}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.registryButton}
              >
                {link.label}
              </a>
            ))}
          </div>
          <p className={styles.hint}>Hosted on MyRegistry. Opens in a new tab.</p>
          <p className={styles.aside}>
            Truthfully, your presence is the gift. Anything from the list is
            more than enough.
          </p>
        </section>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <section className={styles.card} aria-labelledby="registry-heading">
        <p className={styles.eyebrow}>Coming soon</p>
        <h1 id="registry-heading" className={styles.title}>
          Registry
        </h1>
        <p className={styles.lede}>
          We&rsquo;re still putting our registry together. We&rsquo;ll post the
          link here once it&rsquo;s ready.
        </p>
        <p className={styles.aside}>
          Truthfully, your presence is the gift. If you&rsquo;d like to send
          something in the meantime, a note or a story works perfectly.
        </p>
      </section>
    </div>
  );
}
