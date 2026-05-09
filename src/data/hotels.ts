// Curated hotel list near the Saturday reception venue (Che Fico, 838
// Divisadero St, San Francisco). Authored by the Content workstream as part
// of issue #14. Distance-ordered closest-to-furthest. Don't reorder without
// re-checking distances.

export type Hotel = {
  name: string;
  neighborhood: string;
  /** Free-form distance string, e.g. "~0.4 mi (5 min walk)". Render verbatim. */
  distance: string;
  priceTier: "budget" | "mid" | "upscale";
  /** Fuzzy nightly-rate note, e.g. "from ~$130/night". Render verbatim. */
  priceRangeNote: string;
  bookingUrl: string;
  /** One-sentence reason a guest would pick this hotel. */
  description: string;
};

export const hotels: Hotel[] = [
  {
    name: "The Metro Hotel",
    neighborhood: "NoPa / Divisadero",
    distance: "~0.4 mi (5 min walk down Divisadero)",
    priceTier: "budget",
    priceRangeNote: "from ~$130/night",
    bookingUrl: "https://www.metrohotelsf.com/",
    description:
      "A small, recently refreshed boutique on Divisadero itself — by far the closest option to Che Fico. Walkable home after dinner, no rideshare needed.",
  },
  {
    name: "The Parsonage",
    neighborhood: "Lower Haight",
    distance: "~0.7 mi (15 min walk)",
    priceTier: "mid",
    priceRangeNote: "from ~$260/night",
    bookingUrl: "https://theparsonage.com/",
    description:
      "An 1883 Victorian B&B with full cooked breakfast and an evening sherry-and-chocolates ritual. Charming, residential, and a short walk to the venue.",
  },
  {
    name: "Hotel Kabuki",
    neighborhood: "Japantown",
    distance: "~0.9 mi (5 min rideshare)",
    priceTier: "upscale",
    priceRangeNote: "from ~$220/night",
    bookingUrl:
      "https://www.hyatt.com/jdv-by-hyatt/en-US/sfojd-jdv-hotel-kabuki",
    description:
      "JdV by Hyatt boutique with a Japanese-modern design language and an excellent on-site restaurant (Nari). Reliable and well-appointed without being stuffy.",
  },
  {
    name: "Hayes Valley Inn",
    neighborhood: "Hayes Valley",
    distance: "~1.2 mi (5 min rideshare)",
    priceTier: "budget",
    priceRangeNote: "from ~$70/night",
    bookingUrl: "https://www.hayesvalleyinn.com/",
    description:
      "European-style inn with shared bathrooms — the most affordable real option in the area. Hayes Valley itself is a great neighborhood to explore for shops and coffee.",
  },
  {
    name: "Phoenix Hotel",
    neighborhood: "Tenderloin",
    distance: "~1.5 mi (7 min rideshare)",
    priceTier: "mid",
    priceRangeNote: "from ~$150/night",
    bookingUrl: "https://www.phoenixhotelsf.com/",
    description:
      "A cult-favorite mid-century motor lodge with a heated courtyard pool — the rock-and-roll hotel of SF. Distinctive and fun, with no resort fee.",
  },
  {
    name: "Hotel Drisco",
    neighborhood: "Pacific Heights",
    distance: "~1.7 mi (8 min rideshare)",
    priceTier: "upscale",
    priceRangeNote: "from ~$625/night",
    bookingUrl: "https://hoteldrisco.com/",
    description:
      "Elegant 1903 Edwardian property in Pacific Heights, repeatedly ranked SF's top hotel. Complimentary breakfast, evening wine reception, and quiet residential streets — best for guests who want a luxury home base.",
  },
];
