import styles from "./page.module.css";

export const runtime = "edge";

// When the registry is ready, fill this array. The page renders the list
// automatically once it's non-empty; the coming-soon treatment hides itself.
// No layout restructure required.
type RegistryLink = {
  name: string;
  description: string;
  url: string;
};

const REGISTRY_LINKS: RegistryLink[] = [];

export default function RegistryPage() {
  if (REGISTRY_LINKS.length > 0) {
    return (
      <div className={styles.page}>
        <header className={styles.header}>
          <h1 className={styles.title}>Registry</h1>
          <p className={styles.lede}>
            Thank you for thinking of us. A few options below.
          </p>
        </header>
        <ul className={styles.linkList}>
          {REGISTRY_LINKS.map((link) => (
            <li key={link.url} className={styles.linkItem}>
              <a
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.linkAnchor}
              >
                <span className={styles.linkName}>{link.name}</span>
                <span className={styles.linkDescription}>
                  {link.description}
                </span>
              </a>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <section className={styles.comingSoon} aria-labelledby="registry-heading">
        <p className={styles.eyebrow}>Coming soon</p>
        <h1 id="registry-heading" className={styles.title}>
          Registry
        </h1>
        <p className={styles.lede}>
          We&rsquo;re still putting our registry together. We&rsquo;ll post the
          links here once it&rsquo;s ready — likely a few months out from the
          wedding.
        </p>
        <p className={styles.aside}>
          Truthfully, your presence is the gift. If you&rsquo;d like to send
          something in the meantime, a note or a story works perfectly.
        </p>
      </section>
    </div>
  );
}
