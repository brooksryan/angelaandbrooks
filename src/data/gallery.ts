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
        alt: "Spritzes and panzerotti at Polignano a Mare.",
      },
      {
        id: "IMG_0051",
        alt: "Pasta in Rome.",
      },
      {
        id: "IMG_8239",
        alt: "Ang prepping for her sledding qualification for the winter olympics in Tahoe.",
      },
      {
        id: "IMG_2156",
        alt: "More Tahoe, less snow this time.",
      },
      {
        id: "IMG_5506",
        alt: "Fun fact, those shoes went missing shortly after Ang and I started dating...",
      },
      {
        id: "IMG_0320",
        alt: "Mountain italy this time. Cortina D'Ampezzo. Stay at the Baita Fraina, it's amazing",
      },
      {
        id: "IMG_3523",
        alt: "Waiting for me with my mom at the finish line of my Marathon.",
      },
      {
        id: "FullSizeRender",
        alt: "Halloween or just a regular Tuesday night?",
      },
      {
        id: "IMG_4641",
        alt: "Not Italy or Tahoe this time! Top of the Gondola in Banff.",
      },
      {
        id: "IMG_5883",
        alt: "This ones back in Italy though, with a box of the finest Sancrispo in all of the Coops we went to in Rome.",
      },
      {
        id: "IMG_0317",
        alt: "Golfing in Tahoe.",
      },
    ],
  },
];
