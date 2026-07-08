import ServerPhotoAlbum from "react-photo-album/server";
import "react-photo-album/rows.css";
import { gallerySections } from "../../data/gallery";
import {
  resolveGalleryPhotos,
  type GalleryAlbumPhoto,
} from "../../lib/gallery-photos";
import GalleryLightbox, { type LightboxPhoto } from "./GalleryLightbox";
import styles from "./page.module.css";

// Below this container width the album locks to two photos per row; above it,
// free justified rows. Container width, not viewport — the album measures its
// own box (which is the page shell minus the 1.5rem gutters).
const TWO_COLUMN_MAX_WIDTH = 680;

// Container-width intervals the server component pre-computes layouts for.
// react-photo-album renders one static layout per interval and toggles them
// with CSS container queries — that is what keeps the grid zero-JS. The
// library adds one extra interval below min/2 automatically.
const LAYOUT_BREAKPOINTS = [420, TWO_COLUMN_MAX_WIDTH, 960];

// Tiles at the very top of the page skip lazy-loading so the first row
// paints with the page instead of waiting on the lazy-load observer. The
// album renders one hidden copy of the grid per layout interval and eager
// images fetch even inside display:none copies, so these two photos can
// fetch more than one variant each — a trade we accept (the variants are
// small and share a ladder) for a faster first paint.
const EAGER_TILE_COUNT = 2;

function GalleryGrid({
  photos,
  indexOffset,
}: {
  photos: GalleryAlbumPhoto[];
  /** Position of this section's first photo in the page-wide tile order. */
  indexOffset: number;
}) {
  return (
    <ServerPhotoAlbum
      layout="rows"
      photos={photos}
      breakpoints={LAYOUT_BREAKPOINTS}
      spacing={(containerWidth) =>
        containerWidth < TWO_COLUMN_MAX_WIDTH ? 8 : 12
      }
      targetRowHeight={(containerWidth) =>
        containerWidth < TWO_COLUMN_MAX_WIDTH
          ? Math.round(containerWidth / 2)
          : Math.round(containerWidth / 3)
      }
      // minPhotos stays 1 so a future odd-count or single-photo section still
      // lays out on phones instead of failing the row solver.
      rowConstraints={(containerWidth) =>
        containerWidth < TWO_COLUMN_MAX_WIDTH
          ? { minPhotos: 1, maxPhotos: 2 }
          : { maxPhotos: 4 }
      }
      // Mirrors the page shell: 1.5rem gutters each side, content capped at
      // 69rem (72rem shell minus gutters) once the viewport passes 72rem.
      // The library divides these by each photo's share of its row to emit a
      // per-photo sizes attribute.
      sizes={{
        size: "calc(100vw - 3rem)",
        sizes: [{ viewport: "(min-width: 1152px)", size: "1104px" }],
      }}
      render={{
        // Each tile is a <button> that opens the full-screen viewer: the
        // GalleryLightbox island identifies it by data-gallery-index, and
        // its accessible name comes from the img alt inside. The button
        // re-emits the wrapper props field-by-field rather than spreading
        // them because the runtime props carry a client-only `ref` that a
        // server-rendered element must not receive; className and style
        // carry the library's per-tile width math and must pass through.
        wrapper: ({ style, className, children }, { index }) => (
          <button
            type="button"
            data-gallery-index={indexOffset + index}
            aria-haspopup="dialog"
            className={[className, styles.tileButton]
              .filter(Boolean)
              .join(" ")}
            style={style}
          >
            {children}
          </button>
        ),
        // Dual-format tiles: an AVIF <source> over the library's WebP img.
        // Re-emitted field-by-field for the same `ref` reason as the
        // wrapper. The library's own class stays on the img — its
        // stylesheet reserves the tile box via aspect-ratio (zero CLS) —
        // and loading/decoding pass through the library's lazy defaults
        // except for the eager first tiles.
        image: (props, { photo, index }) => {
          const eager =
            indexOffset === 0 && index < EAGER_TILE_COUNT;
          return (
            <picture className={styles.tileFrame}>
              <source
                type="image/avif"
                srcSet={photo.avifSrcSet}
                sizes={props.sizes}
              />
              <img
                src={props.src}
                srcSet={props.srcSet}
                sizes={props.sizes}
                alt={props.alt}
                loading={eager ? "eager" : props.loading}
                fetchPriority={eager ? "high" : undefined}
                decoding={props.decoding}
                className={[props.className, styles.tileImage]
                  .filter(Boolean)
                  .join(" ")}
                // Blur placeholder: the tiny data-URL paints the reserved box
                // until the real image arrives and covers it.
                style={{ backgroundImage: `url(${photo.blurDataURL})` }}
              />
            </picture>
          );
        },
      }}
    />
  );
}

export default function GalleryPage() {
  const sections = gallerySections.filter(
    (section) => section.photos.length > 0,
  );
  // One section = one flat grid, no headings. A second named section (the
  // post-wedding photo drop) brings headings with it — same grid, no layout
  // change.
  const showSectionHeadings = sections.length > 1;

  // Content-ready placeholder: an emptied content file renders the
  // coming-soon treatment instead of a bare page.
  if (sections.length === 0) {
    return (
      <div className={styles.page}>
        <header className={styles.header}>
          <p className={styles.eyebrow}>Coming soon</p>
          <h1 className={styles.title}>Gallery</h1>
          <p className={styles.lede}>
            Photos are on their way — check back closer to the wedding.
          </p>
        </header>
      </div>
    );
  }

  const resolvedSections = sections.map((section) =>
    resolveGalleryPhotos(section.photos),
  );

  // The full-screen viewer navigates one flat, cross-section list; each
  // grid stamps its tiles with offsets into it. Only the fields the viewer
  // needs cross the server→client boundary — tile-only extras (blur data
  // URL, AVIF srcset) would bloat the serialized props for nothing.
  const lightboxPhotos: LightboxPhoto[] = resolvedSections
    .flat()
    .map(({ src, width, height, alt, srcSet, caption }) => ({
      src,
      width,
      height,
      alt,
      srcSet,
      caption,
    }));

  const sectionOffsets = resolvedSections.reduce<number[]>(
    (offsets, sectionPhotos, index) =>
      index === 0
        ? [0]
        : [...offsets, offsets[index - 1] + resolvedSections[index - 1].length],
    [],
  );

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <p className={styles.eyebrow}>Photos</p>
        <h1 className={styles.title}>Gallery</h1>
        {/* Placeholder lede — replace with final wording before launch. */}
        <p className={styles.lede}>
          A few favorite photos of us. The wedding photos will join them here
          after the celebration.
        </p>
      </header>

      <GalleryLightbox photos={lightboxPhotos}>
        {sections.map((section, index) => {
          const headingId = `gallery-section-${index}`;
          return (
            <section
              key={section.title}
              className={styles.section}
              aria-labelledby={showSectionHeadings ? headingId : undefined}
              aria-label={showSectionHeadings ? undefined : section.title}
            >
              {showSectionHeadings && (
                <h2 id={headingId} className={styles.sectionHeading}>
                  {section.title}
                </h2>
              )}
              <GalleryGrid
                photos={resolvedSections[index]}
                indexOffset={sectionOffsets[index]}
              />
            </section>
          );
        })}
      </GalleryLightbox>
    </div>
  );
}
