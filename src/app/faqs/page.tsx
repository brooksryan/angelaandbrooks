import { faqs } from "../../data/faqs";
import styles from "./page.module.css";

export const runtime = "edge";

export default function FaqsPage() {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <p className={styles.eyebrow}>Frequently asked</p>
        <h1 className={styles.title}>Questions</h1>
        <p className={styles.lede}>
          A handful of common questions about the weekend. Tap any question to
          expand the answer. If your question isn&rsquo;t here, get in touch.
        </p>
      </header>

      <ul className={styles.faqList}>
        {faqs.map((faq) => (
          <li key={faq.question} className={styles.faqItem}>
            {/*
              Native <details>/<summary> gives us accordion behavior and full
              keyboard support (Enter and Space toggle, focus visible) for free,
              with zero client JS. Multiple questions can be open at once — the
              PRD allows either pattern and concurrent expansion is friendlier
              when guests want to skim several answers in sequence.
            */}
            <details className={styles.details}>
              <summary className={styles.summary}>
                <span className={styles.question}>{faq.question}</span>
                <span className={styles.chevron} aria-hidden="true">
                  +
                </span>
              </summary>
              <div className={styles.answer}>
                {faq.pendingDetail ? (
                  <p className={styles.pendingTag}>Awaiting confirmation</p>
                ) : null}
                <p>{faq.answer}</p>
              </div>
            </details>
          </li>
        ))}
      </ul>
    </div>
  );
}
