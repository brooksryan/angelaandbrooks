import { describe, expect, it } from "vitest";
import { galleryManifest, variantsFor } from "./gallery-manifest";
import { resolveGalleryPhotos } from "./gallery-photos";

// The one manifest photo whose master (1440w) is narrower than the pipeline's
// top ladder rung, so its largest generated variant is 1280w — the case that
// breaks any "1920 always exists" assumption.
const NARROW_MASTER_ID = "20D12F8F-9D6F-44CA-940B-D19B6098D8FF";

describe("resolveGalleryPhotos", () => {
  it("derives dims and src from the largest generated variant, not the master", () => {
    const [resolved] = resolveGalleryPhotos([
      { id: NARROW_MASTER_ID, alt: "test" },
    ]);
    const manifestPhoto = galleryManifest.photos.find(
      (photo) => photo.id === NARROW_MASTER_ID,
    )!;
    const webp = variantsFor(manifestPhoto, "webp");
    const largest = webp[webp.length - 1];

    expect(largest.width).toBe(1280);
    expect(resolved.src).toBe(largest.path);
    expect(resolved.width).toBe(1280);
    // Height scales from the master's aspect ratio (1440x1800 -> 1280x1600).
    expect(resolved.height).toBe(1600);
  });

  it("builds the WebP srcSet from the full ladder with aspect-true heights", () => {
    for (const manifestPhoto of galleryManifest.photos) {
      const [resolved] = resolveGalleryPhotos([
        { id: manifestPhoto.id, alt: "test" },
      ]);
      const webp = variantsFor(manifestPhoto, "webp");

      expect(resolved.srcSet.map((image) => image.src)).toEqual(
        webp.map((variant) => variant.path),
      );
      for (const image of resolved.srcSet) {
        const expectedHeight = Math.round(
          (image.width * manifestPhoto.height) / manifestPhoto.width,
        );
        expect(image.height).toBe(expectedHeight);
      }
      // No srcSet entry may exceed the declared photo width, or the album
      // would advertise a resolution that never gets served.
      expect(Math.max(...resolved.srcSet.map((image) => image.width))).toBe(
        resolved.width,
      );
    }
  });

  it("formats the AVIF srcset string from the AVIF ladder", () => {
    const [resolved] = resolveGalleryPhotos([{ id: "IMG_0051", alt: "test" }]);
    const manifestPhoto = galleryManifest.photos.find(
      (photo) => photo.id === "IMG_0051",
    )!;
    const expected = variantsFor(manifestPhoto, "avif")
      .map((variant) => `${variant.path} ${variant.width}w`)
      .join(", ");

    expect(resolved.avifSrcSet).toBe(expected);
    expect(resolved.avifSrcSet).toMatch(/\.avif 320w, .*\.avif 1280w$/);
  });

  it("preserves content order and carries alt/caption through", () => {
    const resolved = resolveGalleryPhotos([
      { id: "IMG_0320", alt: "second photo", caption: "a caption" },
      { id: "IMG_0051", alt: "first photo" },
    ]);

    expect(resolved.map((photo) => photo.key)).toEqual([
      "IMG_0320",
      "IMG_0051",
    ]);
    expect(resolved[0].alt).toBe("second photo");
    expect(resolved[0].caption).toBe("a caption");
    expect(resolved[1].caption).toBeUndefined();
  });

  it("throws a pointed error for an id the pipeline never generated", () => {
    expect(() =>
      resolveGalleryPhotos([{ id: "NOT_A_REAL_PHOTO", alt: "test" }]),
    ).toThrowError(/NOT_A_REAL_PHOTO/);
  });
});
