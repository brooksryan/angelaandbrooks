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

// Alt text below is placeholder. Replace it with real descriptions and
// finalize the photo order before guests see the site.
export const gallerySections: GallerySection[] = [
  {
    title: "Us",
    photos: [
      { id: "20D12F8F-9D6F-44CA-940B-D19B6098D8FF", alt: "Angela and Brooks — photo 1" },
      { id: "IMG_5506", alt: "Angela and Brooks — photo 2" },
      { id: "IMG_0051", alt: "Angela and Brooks — photo 3" },
      { id: "IMG_8239", alt: "Angela and Brooks — photo 4" },
      { id: "IMG_3523", alt: "Angela and Brooks — photo 5" },
      { id: "IMG_2156", alt: "Angela and Brooks — photo 6" },
      { id: "FullSizeRender", alt: "Angela and Brooks — photo 7" },
      { id: "IMG_4641", alt: "Angela and Brooks — photo 8" },
      { id: "IMG_0320", alt: "Angela and Brooks — photo 9" },
      { id: "IMG_5883", alt: "Angela and Brooks — photo 10" },
    ],
  },
];
