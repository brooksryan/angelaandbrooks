// Typed access to the generated-variant manifest — the contract between the
// image build pipeline (scripts/generate-gallery-images.mjs) and the gallery
// page. The JSON is generated; these types are the hand-written half of the
// contract and must describe exactly what the script emits. The pipeline's
// unit tests pin the emitted shape, which is what makes the cast below safe.

import manifestJson from "@/generated/gallery-manifest.json";

export type GalleryVariantFormat = "avif" | "webp";

export interface GalleryVariant {
  format: GalleryVariantFormat;
  /** Rendered width in px; the ladder never exceeds the master's intrinsic width. */
  width: number;
  /** URL path under public/, e.g. "/gallery/IMG_0051.abc123def0.640w.avif". */
  path: string;
}

export interface GalleryPhoto {
  /** Stable id — the master's filename stem; renaming the master changes it. */
  id: string;
  /** Content hash of the master; changes when the photo's bytes change. */
  masterHash: string;
  /** Intrinsic (display-oriented) master width in px. */
  width: number;
  /** Intrinsic (display-oriented) master height in px. */
  height: number;
  /** Tiny base64 JPEG data URL for the pre-load blur placeholder. */
  blurDataURL: string;
  /** AVIF first, then WebP, each ascending by width — matches <picture> source order. */
  variants: GalleryVariant[];
}

export interface GalleryManifest {
  photos: GalleryPhoto[];
}

export const galleryManifest = manifestJson as GalleryManifest;

/** Variants of one format, ascending by width — ready to join into a srcset. */
export function variantsFor(
  photo: GalleryPhoto,
  format: GalleryVariantFormat,
): GalleryVariant[] {
  return photo.variants.filter((variant) => variant.format === format);
}
