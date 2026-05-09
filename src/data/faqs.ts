// FAQ content. Brooks confirmed the FAQs page should ship with a single
// "check back soon" item until they have approved Q&As ready. When the real
// FAQ array is approved (Content #15), drop it in here and the page picks
// it up automatically.

export type Faq = {
  question: string;
  answer: string;
  /** True for items whose answer is still a placeholder awaiting confirmed info. */
  pendingDetail?: boolean;
};

export const faqs: Faq[] = [
  {
    question: "Are FAQs available yet?",
    answer:
      "Not yet — we're still drafting answers to the questions guests have asked most. Check back closer to the wedding and this page will fill in. If you have something urgent in the meantime, reach out to either of us directly.",
    pendingDetail: true,
  },
];
