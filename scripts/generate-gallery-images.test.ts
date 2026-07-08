// Pins the pipeline's contract with the gallery page: the ladder/format rules,
// the manifest shape (src/lib/gallery-manifest.ts mirrors it), and the
// content-hash skip that makes prebuild re-runs free. Fixtures are tiny
// sharp-generated JPEGs so the suite exercises the real encode path without
// touching the committed masters.

import { mkdir, mkdtemp, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import sharp from "sharp";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  LADDER_WIDTHS,
  VARIANT_FORMATS,
  generateGalleryImages,
  ladderWidthsFor,
} from "./generate-gallery-images.mjs";

describe("ladderWidthsFor", () => {
  it("returns every ladder width not exceeding the intrinsic width", () => {
    expect(ladderWidthsFor(4032)).toEqual(LADDER_WIDTHS);
    expect(ladderWidthsFor(1920)).toEqual([320, 640, 960, 1280, 1920]);
  });

  it("never upscales: widths above the intrinsic width are dropped", () => {
    expect(ladderWidthsFor(1440)).toEqual([320, 640, 960, 1280]);
    expect(ladderWidthsFor(320)).toEqual([320]);
  });

  it("rejects masters narrower than the smallest rung", () => {
    expect(() => ladderWidthsFor(200)).toThrow(/narrower than the smallest ladder rung/);
  });
});

describe("generateGalleryImages", () => {
  let root: string;
  let mastersDir: string;
  let outputDir: string;
  let manifestPath: string;

  const fixtures = [
    { id: "alpha", width: 1600, height: 1000, background: "#7a9e7e" },
    { id: "beta", width: 2000, height: 1400, background: "#b08968" },
    { id: "gamma", width: 400, height: 260, background: "#5c6b8a" },
  ];

  async function writeFixture(fixture: (typeof fixtures)[number]) {
    await sharp({
      create: {
        width: fixture.width,
        height: fixture.height,
        channels: 3,
        background: fixture.background,
      },
    })
      .jpeg()
      .toFile(path.join(mastersDir, `${fixture.id}.jpg`));
  }

  function run() {
    return generateGalleryImages({ mastersDir, outputDir, manifestPath });
  }

  beforeEach(async () => {
    root = await mkdtemp(path.join(os.tmpdir(), "gallery-test-"));
    mastersDir = path.join(root, "masters");
    outputDir = path.join(root, "out");
    manifestPath = path.join(root, "generated", "manifest.json");
    await mkdir(mastersDir, { recursive: true });
    for (const fixture of fixtures) {
      await writeFixture(fixture);
    }
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it("emits AVIF and WebP at each ladder width capped at the master's intrinsic width", async () => {
    const { manifest } = await run();

    const hashOf = (id: string) =>
      manifest.photos.find((photo) => photo.id === id)?.masterHash;
    const expected = fixtures
      .flatMap((fixture) =>
        ladderWidthsFor(fixture.width).flatMap((width) =>
          VARIANT_FORMATS.map(
            (format: string) => `${fixture.id}.${hashOf(fixture.id)}.${width}w.${format}`,
          ),
        ),
      )
      .sort();

    // Exact set equality: every rung in both formats, and nothing above the
    // intrinsic width (alpha stops at 1280, gamma at 320).
    expect((await readdir(outputDir)).sort()).toEqual(expected);
  });

  it("records every variant, intrinsic dimensions, and a blur placeholder per photo", async () => {
    const { manifest } = await run();
    expect(JSON.parse(await readFile(manifestPath, "utf8"))).toEqual(manifest);

    expect(manifest.photos.map((photo) => photo.id)).toEqual(["alpha", "beta", "gamma"]);

    for (const fixture of fixtures) {
      const photo = manifest.photos.find((candidate) => candidate.id === fixture.id);
      expect(photo).toBeDefined();
      if (!photo) continue;

      expect(photo.width).toBe(fixture.width);
      expect(photo.height).toBe(fixture.height);
      expect(photo.masterHash).toMatch(/^[0-9a-f]{10}$/);

      const widths = ladderWidthsFor(fixture.width);
      // AVIF block first then WebP, each ascending — the order a <picture>
      // element wants its sources in.
      expect(photo.variants.map((variant) => `${variant.format}:${variant.width}`)).toEqual(
        VARIANT_FORMATS.flatMap((format: string) => widths.map((width) => `${format}:${width}`)),
      );
      for (const variant of photo.variants) {
        expect(variant.path).toBe(
          `/gallery/${fixture.id}.${photo.masterHash}.${variant.width}w.${variant.format}`,
        );
        await expect(
          stat(path.join(outputDir, path.basename(variant.path))),
        ).resolves.toBeDefined();
      }

      expect(photo.blurDataURL).toMatch(/^data:image\/jpeg;base64,/);
      const blur = await sharp(
        Buffer.from(photo.blurDataURL.split(",")[1], "base64"),
      ).metadata();
      expect(blur.width).toBe(16);
    }
  });

  it("processes nothing on a second run with unchanged masters", async () => {
    await run();
    const manifestBefore = await readFile(manifestPath, "utf8");
    const mtimes = new Map<string, number>();
    for (const name of await readdir(outputDir)) {
      mtimes.set(name, (await stat(path.join(outputDir, name))).mtimeMs);
    }

    const second = await run();

    expect(second.processed).toBe(0);
    expect(second.skipped).toBe(fixtures.length);
    expect(second.removed).toBe(0);
    expect(second.manifestChanged).toBe(false);
    expect(await readFile(manifestPath, "utf8")).toBe(manifestBefore);
    for (const name of await readdir(outputDir)) {
      expect((await stat(path.join(outputDir, name))).mtimeMs).toBe(mtimes.get(name));
    }
  });

  it("regenerates only a changed master and deletes its orphaned variants", async () => {
    const first = await run();
    const staleAlphaFiles = (await readdir(outputDir)).filter((name) =>
      name.startsWith("alpha."),
    );

    await writeFixture({ id: "alpha", width: 1700, height: 1000, background: "#933" });
    const second = await run();

    expect(second.processed).toBe(1);
    expect(second.skipped).toBe(fixtures.length - 1);
    expect(second.removed).toBe(staleAlphaFiles.length);
    const remaining = await readdir(outputDir);
    for (const stale of staleAlphaFiles) {
      expect(remaining).not.toContain(stale);
    }
    const alpha = second.manifest.photos.find((photo) => photo.id === "alpha");
    expect(alpha?.width).toBe(1700);
    expect(alpha?.masterHash).not.toBe(
      first.manifest.photos.find((photo) => photo.id === "alpha")?.masterHash,
    );
  });

  it("fails loudly when a non-JPEG file sneaks into the masters directory", async () => {
    await writeFile(path.join(mastersDir, "IMG_9999.heic"), "not really heic");
    await expect(run()).rejects.toThrow(/Non-JPEG file/);
  });
});
