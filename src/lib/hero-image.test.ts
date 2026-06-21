// Hero-photo presence check. Acceptance: dropping a file at the known path
// swaps the placeholder for the photo with no code change — so the presence
// gate must be true when the file is on disk and false when it is not.

import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import {
  HERO_IMAGE_ALT,
  HERO_IMAGE_PUBLIC_PATH,
  heroPhotoExists,
} from "./hero-image";

const tmpDir = mkdtempSync(path.join(tmpdir(), "hero-image-"));

afterAll(() => {
  rmSync(tmpDir, { recursive: true, force: true });
});

describe("heroPhotoExists", () => {
  it("returns true when a photo is present at the path", () => {
    const present = path.join(tmpDir, "hero.jpg");
    writeFileSync(present, "fake-jpeg-bytes");
    expect(heroPhotoExists(present)).toBe(true);
  });

  it("returns false when no photo is present (graceful placeholder path)", () => {
    const missing = path.join(tmpDir, "does-not-exist.jpg");
    expect(heroPhotoExists(missing)).toBe(false);
  });
});

describe("hero image constants", () => {
  it("serves from the documented public path", () => {
    expect(HERO_IMAGE_PUBLIC_PATH).toBe("/hero.jpg");
  });

  it("ships a non-empty accessible alt", () => {
    expect(HERO_IMAGE_ALT.length).toBeGreaterThan(0);
  });
});
