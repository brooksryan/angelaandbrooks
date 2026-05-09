// FAQ content. Real Q&A copy comes from Content workstream issue #15 once
// Brooks and Angela approve the draft. Until then this file holds placeholder
// items so the page renders something usable.
//
// The shape matches what Content authored — when their final array lands,
// drop it into `faqs` here and the page picks it up with no component edits.

export type Faq = {
  question: string;
  answer: string;
  /** True for items whose answer is still a placeholder awaiting confirmed info. */
  pendingDetail?: boolean;
};

export const faqs: Faq[] = [
  {
    question: "When and where is the wedding?",
    answer:
      "The wedding spans two days in San Francisco. The ceremony is on Friday, October 23, 2026 (morning, exact location and time TBD). The dinner reception is on Saturday, October 24, 2026 from 5:30 to 10:30 PM at Che Fico, 838 Divisadero Street.",
  },
  {
    question: "What time is the ceremony?",
    answer:
      "Friday morning. We'll confirm the exact time and venue once everything is locked in — likely a few months out — and update this page.",
    pendingDetail: true,
  },
  {
    question: "What's the dress code?",
    answer:
      "Placeholder — we're still deciding the dress code. We'll update this with specifics before formal invitations go out.",
    pendingDetail: true,
  },
  {
    question: "Can I bring a plus-one?",
    answer:
      "If your invitation lists a plus-one, yes — please add their name on the RSVP form. If not, the seating is set and we hope you'll come on your own.",
  },
  {
    question: "Are kids invited?",
    answer:
      "Placeholder — we're still deciding on a kids policy. We'll confirm here once we've made a call.",
    pendingDetail: true,
  },
  {
    question: "Where should I stay?",
    answer:
      "We've put together a curated list of six hotels near the reception venue, ranging from budget to upscale. See the Travel page for details and direct booking links.",
  },
  {
    question: "Is there an after-party?",
    answer:
      "Placeholder — TBD. If we organize something we'll post the details here.",
    pendingDetail: true,
  },
  {
    question: "Where can I see your registry?",
    answer:
      "Placeholder — the registry isn't ready yet. We'll post the links on the Registry page once it's set up.",
    pendingDetail: true,
  },
];
