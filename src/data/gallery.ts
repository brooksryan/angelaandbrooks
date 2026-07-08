// Guest-facing gallery content: which photos appear, in what order, with what
// words. Edit this file alone to change gallery content — no other code
// changes needed.
//
// HOW TO EDIT (no code knowledge needed):
//   • Reorder photos by moving their { ... } blocks up or down within a section.
//   • Rewrite `alt`: one sentence describing the photo for guests who can't
//     see it (screen readers), e.g. "Angela and Brooks laughing on the beach".
//   • Add an optional caption to any photo with a line like:
//       caption: "Napa, spring 2025",
//   • Add a new section (e.g. the wedding photos) by copying the whole
//     { title, photos: [...] } block and appending it to the array below.
//     Section headings appear automatically once there is more than one
//     section — a single section renders as one flat grid with no heading.
//
// `id` must be the photo's master filename without its extension (the files in
// gallery-masters/). Brand-new photos need the master dropped into
// gallery-masters/ and `pnpm build` run once so their web versions exist.

export type GalleryPhotoEntry = {
  /** Master filename without extension, e.g. "IMG_0051". */
  id: string;
  /** One-sentence description of the photo for screen readers. */
  alt: string;
  /** Optional short caption (reserved for the full-screen photo viewer). */
  caption?: string;
};

export type GallerySection = {
  /** Section heading. Hidden while the gallery has only one section. */
  title: string;
  /** Photos in display order. */
  photos: GalleryPhotoEntry[];
};

// Launch photo set: final display order and screen-reader alt text.
// Captions are intentionally omitted for launch (alt text only).
export const gallerySections: GallerySection[] = [
  {
    title: "A Few of Our Favorites",
    photos: [
      {
        id: "20D12F8F-9D6F-44CA-940B-D19B6098D8FF",
        alt: "Angela and Brooks raise spritz cocktails on a rooftop terrace at sunset, wearing matching painted souvenir aprons, town rooftops behind them.",
      },
      {
        id: "IMG_0051",
        alt: "Angela and Brooks smile in a green leather restaurant booth over two plates of rigatoni and glasses of white wine, Angela raising hers.",
      },
      {
        id: "IMG_8239",
        alt: "Bundled in beanies and sunglasses, Angela and Brooks lean in for a snowy selfie, Brooks holding a yellow sled among sunlit pines.",
      },
      {
        id: "IMG_2156",
        alt: "Angela and Brooks dressed up beneath tall pines — Brooks in a light linen shirt, Angela in a blue watercolor halter dress — a timber lodge behind them.",
      },
      {
        id: "IMG_5506",
        alt: "Angela and Brooks stand arm in arm on a sunny bayfront path, the Golden Gate Bridge across the water behind them.",
      },
      {
        id: "IMG_0320",
        alt: "Angela and Brooks stand on a cobblestone square in an alpine town, pastel chalet buildings with wooden balconies and flower boxes around them.",
      },
      {
        id: "IMG_3523",
        alt: "Angela hugs Brooks at a race finish line; he wears a pink shirt, a finisher medal, and bib number 4184, a 'FINISH' arch behind them.",
      },
      {
        id: "FullSizeRender",
        alt: "Angela and Brooks pose indoors in retro outfits — Brooks in a vintage bowling shirt holding a cigar, Angela in a patterned tie-top — beside framed vintage travel posters.",
      },
      {
        id: "IMG_4641",
        alt: "Angela and Brooks bundle together on a mountaintop viewing deck, snow-capped peaks and a valley town spread out far below.",
      },
      {
        id: "IMG_5883",
        alt: "Angela and Brooks embrace on a stone terrace above a city skyline at sunset, domes and rooftops glowing under a pink sky.",
      },
    ],
  },
];
