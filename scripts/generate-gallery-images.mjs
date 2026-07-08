// Gallery image build pipeline: build-time processing, static serving, no
// runtime image service.
//
// Committed JPEG masters in gallery-masters/ become an AVIF+WebP responsive
// width ladder plus a tiny base64 blur placeholder in public/gallery/, and a
// generated-variant manifest at src/generated/gallery-manifest.json. The
// manifest is the contract the gallery page consumes — its TypeScript shape
// lives in src/lib/gallery-manifest.ts and must stay in sync with what this
// script emits.
//
// Masters are JPEG only: sharp's prebuilt libvips (local and CI) has no
// libheif, so scripts/import-gallery-masters.mjs converts HEIC sources once
// before they land in gallery-masters/.
//
// Re-runs are cheap by design: the script content-hashes each master and
// skips any photo whose hash already appears in the manifest with every
// variant file present. That lets it run on every `prebuild` without penalty.
//
// We commit generated output (variants + manifest) rather than gitignoring
// it: the deploy must not depend on the CI runner regenerating images
// (pnpm's pre-script behavior and sharp's platform binaries are both links
// that could silently break), and `pnpm dev` on a fresh clone should render
// the gallery without a build step. The hash skip keeps the committed files
// stable across re-runs, so there is no regeneration churn.

import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readFile, readdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

/**
 * @typedef {"avif" | "webp"} GalleryVariantFormat
 * @typedef {{ format: GalleryVariantFormat, width: number, path: string }} GalleryVariantRecord
 * @typedef {{
 *   id: string,
 *   masterHash: string,
 *   width: number,
 *   height: number,
 *   blurDataURL: string,
 *   variants: GalleryVariantRecord[],
 * }} GalleryPhotoRecord
 * @typedef {{ photos: GalleryPhotoRecord[] }} GalleryManifest
 */

// The full ladder; each photo gets the rungs that don't exceed its intrinsic
// width — we never upscale a master.
export const LADDER_WIDTHS = [320, 640, 960, 1280, 1920];

// AVIF listed before WebP so manifest variant order matches <picture> source
// order (best-compression format first).
export const VARIANT_FORMATS = /** @type {const} */ (["avif", "webp"]);

// Encoder settings: AVIF wins on bytes at moderate quality; WebP is the
// broad-support fallback so it gets a slightly higher quality floor. Blur
// placeholders only ever render scaled up and heavily blurred, so quality 50
// at 16px is indistinguishable from anything higher.
const AVIF_OPTIONS = { quality: 55, effort: 4 };
const WEBP_OPTIONS = { quality: 78, effort: 4 };
const BLUR_WIDTH = 16;
const BLUR_JPEG_QUALITY = 50;

// 10 hex chars of SHA-256 — enough to never collide across a curated set of
// ~100 photos, short enough to keep variant filenames readable.
const HASH_LENGTH = 10;

/**
 * Ladder rungs for a master of the given intrinsic width. Throws below the
 * smallest rung: a sub-320px master is a content mistake (the curated set
 * starts at 1440w) and silently emitting zero variants would surface as a
 * blank gallery tile much later.
 *
 * @param {number} intrinsicWidth
 * @returns {number[]}
 */
export function ladderWidthsFor(intrinsicWidth) {
  const widths = LADDER_WIDTHS.filter((w) => w <= intrinsicWidth);
  if (widths.length === 0) {
    throw new Error(
      `Master is ${intrinsicWidth}px wide — narrower than the smallest ladder rung (${LADDER_WIDTHS[0]}px). Supply a larger master.`,
    );
  }
  return widths;
}

/** @param {Buffer} bytes */
function contentHash(bytes) {
  return createHash("sha256").update(bytes).digest("hex").slice(0, HASH_LENGTH);
}

/**
 * @param {string} id
 * @param {string} hash
 * @param {number} width
 * @param {GalleryVariantFormat} format
 */
function variantFileName(id, hash, width, format) {
  // The content hash in the filename makes variant URLs immutable: a changed
  // master produces new filenames, so stale cached copies can never be served.
  return `${id}.${hash}.${width}w.${format}`;
}

/** @param {string} manifestPath @returns {Promise<GalleryManifest | null>} */
async function readExistingManifest(manifestPath) {
  try {
    return JSON.parse(await readFile(manifestPath, "utf8"));
  } catch {
    // Missing or unparseable manifest means nothing can be trusted as
    // already-generated — regenerate everything.
    return null;
  }
}

/**
 * A previous manifest entry counts as current only if the master bytes are
 * unchanged AND every variant file it references still exists on disk.
 *
 * @param {GalleryPhotoRecord | undefined} previous
 * @param {string} hash
 * @param {string} outputDir
 */
function isAlreadyGenerated(previous, hash, outputDir) {
  if (!previous || previous.masterHash !== hash || !previous.blurDataURL) {
    return false;
  }
  return previous.variants.every((variant) =>
    existsSync(path.join(outputDir, path.basename(variant.path))),
  );
}

/**
 * @param {string} filePath
 * @param {Buffer} bytes
 * @param {string} id
 * @param {string} hash
 * @param {string} outputDir
 * @param {string} urlPrefix
 * @returns {Promise<GalleryPhotoRecord>}
 */
async function generatePhoto(filePath, bytes, id, hash, outputDir, urlPrefix) {
  const metadata = await sharp(bytes).metadata();
  if (!metadata.width || !metadata.height) {
    throw new Error(`Could not read dimensions of ${filePath}`);
  }
  // Report display dimensions: EXIF orientations 5-8 store the pixel grid
  // rotated 90°, so width/height swap. Masters from the import script are
  // orientation-baked, but a hand-dropped master must not corrupt the
  // manifest's aspect ratios.
  const rotated = (metadata.orientation ?? 1) >= 5;
  const width = rotated ? metadata.height : metadata.width;
  const height = rotated ? metadata.width : metadata.height;

  const widths = ladderWidthsFor(width);
  /** @type {GalleryVariantRecord[]} */
  const variants = [];
  const encodings = [];
  for (const format of VARIANT_FORMATS) {
    for (const targetWidth of widths) {
      const fileName = variantFileName(id, hash, targetWidth, format);
      variants.push({
        format,
        width: targetWidth,
        path: `${urlPrefix}/${fileName}`,
      });
      const pipeline = sharp(bytes).rotate().resize({ width: targetWidth });
      encodings.push(
        (format === "avif"
          ? pipeline.avif(AVIF_OPTIONS)
          : pipeline.webp(WEBP_OPTIONS)
        ).toFile(path.join(outputDir, fileName)),
      );
    }
  }

  const blurBuffer = await sharp(bytes)
    .rotate()
    .resize({ width: BLUR_WIDTH })
    .jpeg({ quality: BLUR_JPEG_QUALITY })
    .toBuffer();
  await Promise.all(encodings);

  return {
    id,
    masterHash: hash,
    width,
    height,
    blurDataURL: `data:image/jpeg;base64,${blurBuffer.toString("base64")}`,
    variants,
  };
}

/**
 * Runs the pipeline: masters in, variants + manifest out. Returns counts so
 * callers (and tests) can assert what actually happened.
 *
 * @param {{
 *   mastersDir: string,
 *   outputDir: string,
 *   manifestPath: string,
 *   urlPrefix?: string,
 * }} options
 */
export async function generateGalleryImages({
  mastersDir,
  outputDir,
  manifestPath,
  urlPrefix = "/gallery",
}) {
  const entries = (await readdir(mastersDir)).filter(
    (name) => !name.startsWith("."),
  );
  const nonJpeg = entries.filter((name) => !/\.jpe?g$/i.test(name));
  if (nonJpeg.length > 0) {
    // Loud failure beats a quietly missing photo: CI cannot decode HEIC (or
    // anything else), so a non-JPEG master means the import step was skipped.
    throw new Error(
      `Non-JPEG file(s) in ${mastersDir}: ${nonJpeg.join(", ")}. ` +
        "Run scripts/import-gallery-masters.mjs to produce JPEG masters first.",
    );
  }
  const masters = entries.sort();

  await mkdir(outputDir, { recursive: true });
  const previousManifest = await readExistingManifest(manifestPath);
  const previousById = new Map(
    (previousManifest?.photos ?? []).map((photo) => [photo.id, photo]),
  );

  /** @type {GalleryPhotoRecord[]} */
  const photos = [];
  let processed = 0;
  let skipped = 0;

  for (const fileName of masters) {
    const filePath = path.join(mastersDir, fileName);
    const id = fileName.replace(/\.jpe?g$/i, "");
    const bytes = await readFile(filePath);
    const hash = contentHash(bytes);

    const previous = previousById.get(id);
    if (isAlreadyGenerated(previous, hash, outputDir)) {
      photos.push(/** @type {GalleryPhotoRecord} */ (previous));
      skipped += 1;
      continue;
    }

    photos.push(
      await generatePhoto(filePath, bytes, id, hash, outputDir, urlPrefix),
    );
    processed += 1;
  }

  // Anything in the output directory the manifest no longer references is an
  // orphan from a removed or re-hashed master — delete it so public/gallery/
  // holds exactly the deployable set.
  const referenced = new Set(
    photos.flatMap((photo) =>
      photo.variants.map((variant) => path.basename(variant.path)),
    ),
  );
  let removed = 0;
  for (const fileName of await readdir(outputDir)) {
    if (fileName.startsWith(".") || referenced.has(fileName)) continue;
    await unlink(path.join(outputDir, fileName));
    removed += 1;
  }

  /** @type {GalleryManifest} */
  const manifest = { photos };
  const serialized = `${JSON.stringify(manifest, null, 2)}\n`;
  // Skip the write when nothing changed so re-runs leave both file mtimes and
  // `git status` untouched.
  let manifestChanged = true;
  try {
    manifestChanged = (await readFile(manifestPath, "utf8")) !== serialized;
  } catch {
    // No manifest yet — first run.
  }
  if (manifestChanged) {
    await mkdir(path.dirname(manifestPath), { recursive: true });
    await writeFile(manifestPath, serialized);
  }

  return { manifest, processed, skipped, removed, manifestChanged };
}

const isDirectRun =
  process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);

if (isDirectRun) {
  const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const { processed, skipped, removed } = await generateGalleryImages({
    mastersDir: path.join(repoRoot, "gallery-masters"),
    outputDir: path.join(repoRoot, "public", "gallery"),
    manifestPath: path.join(repoRoot, "src", "generated", "gallery-manifest.json"),
  });
  console.log(
    `gallery: ${processed} processed, ${skipped} skipped (unchanged), ${removed} orphan(s) removed`,
  );
}
