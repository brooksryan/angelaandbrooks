// Merges the gallery's two data halves: the guest-facing content file
// (src/data/gallery.ts — order, alt text, captions) and the generated variant
// manifest (which image files exist, at which widths). The grid consumes the
// merged result. Kept out of the page component so the merge rules — largest
// available variant, per-format srcsets, unknown-id failure — are unit-testable.

import type { GalleryPhotoEntry } from "@/data/gallery";
import { galleryManifest, variantsFor } from "./gallery-manifest";

/**
 * One grid-ready photo: react-photo-album's Photo shape (src/width/height/
 * alt/srcSet) plus the extras our <picture> tile render needs.
 */
export type GalleryAlbumPhoto = {
  /** Stable React key — the manifest photo id. */
  key: string;
  /** Largest generated WebP variant; the fallback when srcset is unsupported. */
  src: string;
  /**
   * Intrinsic dims of the largest GENERATED variant — deliberately not the
   * master's. The pipeline caps each photo's ladder at the master's own width
   * (a 1440w master tops out at 1280w), so the per-photo maximum must be read
   * from the manifest. Declaring master dims would also make react-photo-album
   * append `src <masterWidth>w` to the srcset, advertising a resolution no
   * generated file actually has.
   */
  width: number;
  height: number;
  alt: string;
  /** WebP ladder for react-photo-album's srcset computation. */
  srcSet: { src: string; width: number; height: number }[];
  /** Ready-to-emit srcset string for the AVIF <source>. */
  avifSrcSet: string;
  /** Tiny data-URL used as a CSS background while the tile loads. */
  blurDataURL: string;
  caption?: string;
};

const photosById = new Map(
  galleryManifest.photos.map((photo) => [photo.id, photo]),
);

/**
 * Resolve content entries against the generated manifest, in content order.
 * Throws on an id the pipeline never generated — the gallery page is
 * server-rendered, so a typo in the content file fails the build with a
 * pointed message instead of shipping a broken tile.
 */
export function resolveGalleryPhotos(
  entries: readonly GalleryPhotoEntry[],
): GalleryAlbumPhoto[] {
  return entries.map((entry) => {
    const photo = photosById.get(entry.id);
    if (!photo) {
      throw new Error(
        `Gallery content references photo id "${entry.id}", which the image ` +
          `pipeline has not generated. Check src/data/gallery.ts against ` +
          `gallery-masters/ and re-run the build.`,
      );
    }

    const webp = variantsFor(photo, "webp");
    const avif = variantsFor(photo, "avif");
    if (webp.length === 0 || avif.length === 0) {
      throw new Error(
        `Photo "${entry.id}" has no generated ${webp.length === 0 ? "WebP" : "AVIF"} variants — re-run the image pipeline.`,
      );
    }

    const scaledHeight = (width: number) =>
      Math.round((width * photo.height) / photo.width);
    // Loader contract: variants are ascending by width, so the last is the max.
    const largest = webp[webp.length - 1];

    return {
      key: photo.id,
      src: largest.path,
      width: largest.width,
      height: scaledHeight(largest.width),
      alt: entry.alt,
      srcSet: webp.map((variant) => ({
        src: variant.path,
        width: variant.width,
        height: scaledHeight(variant.width),
      })),
      avifSrcSet: avif
        .map((variant) => `${variant.path} ${variant.width}w`)
        .join(", "),
      blurDataURL: photo.blurDataURL,
      caption: entry.caption,
    };
  });
}
