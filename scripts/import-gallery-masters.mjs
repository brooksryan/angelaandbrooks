// Imports source photos into committed JPEG masters under gallery-masters/.
//
//   node scripts/import-gallery-masters.mjs <source-photo> [...more]
//
// Two jobs, both required before a master may be committed:
//
// 1. HEIC → JPEG. sharp's prebuilt libvips has no libheif (locally or in CI),
//    so HEIC decode goes through macOS `sips`. That makes HEIC import
//    macOS-only — fine, because import is a one-time local step per photo;
//    the recurring pipeline (generate-gallery-images.mjs) only ever sees JPEG.
//
// 2. Metadata strip. This is a PUBLIC repo and phone photos carry EXIF GPS
//    coordinates and device identifiers. This script re-encodes every master
//    through sharp, baking orientation into the pixels and dropping all
//    metadata. Quality 92 mozjpeg keeps the master visually lossless for its
//    real job: being the encode source for the AVIF/WebP ladder.
//
// This script only reads sources — originals under docs/source_material/
// stay untouched.

import { execFileSync } from "node:child_process";
import { mkdir, mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const MASTER_JPEG_OPTIONS = { quality: 92, mozjpeg: true };

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const mastersDir = path.join(repoRoot, "gallery-masters");

const sources = process.argv.slice(2);
if (sources.length === 0) {
  console.error("Usage: node scripts/import-gallery-masters.mjs <source-photo> [...more]");
  process.exit(1);
}

await mkdir(mastersDir, { recursive: true });
const tempDir = await mkdtemp(path.join(os.tmpdir(), "gallery-import-"));

try {
  for (const source of sources) {
    const extension = path.extname(source);
    const stem = path.basename(source, extension);

    let jpegSource = source;
    if (/\.heic$/i.test(extension)) {
      if (process.platform !== "darwin") {
        throw new Error(
          `${source}: HEIC import needs macOS (sips decodes HEIC; sharp cannot).`,
        );
      }
      jpegSource = path.join(tempDir, `${stem}.jpg`);
      execFileSync("sips", [
        "-s", "format", "jpeg",
        "-s", "formatOptions", "best",
        source,
        "--out", jpegSource,
      ], { stdio: ["ignore", "ignore", "inherit"] });
    } else if (!/\.jpe?g$/i.test(extension)) {
      throw new Error(`${source}: only JPEG and HEIC sources are supported.`);
    }

    const destination = path.join(mastersDir, `${stem}.jpg`);
    // .rotate() with no arguments applies the EXIF orientation to the pixels;
    // omitting withMetadata() drops EXIF/GPS/etc. from the output. sharp
    // converts through the embedded ICC profile to sRGB by default, so
    // Display P3 phone photos keep their colors.
    const { width, height } = await sharp(jpegSource)
      .rotate()
      .jpeg(MASTER_JPEG_OPTIONS)
      .toFile(destination);
    console.log(`${source} -> ${path.relative(repoRoot, destination)} (${width}x${height})`);
  }
} finally {
  await rm(tempDir, { recursive: true, force: true });
}
