// Hero-photo presence is an explicit build-time constant (no filesystem probe).
// Acceptance: when the flag is true the home page renders the photo; flipping it
// to false restores the graceful placeholder — the "content-ready placeholder"
// philosophy without an environment-fragile fs check.

import { describe, expect, it } from "vitest";
import {
  HERO_IMAGE_ALT,
  HERO_IMAGE_PUBLIC_PATH,
  HERO_PHOTO_PRESENT,
} from "./hero-image";

describe("HERO_PHOTO_PRESENT", () => {
  it("is a boolean flag the home hero branches on", () => {
    expect(typeof HERO_PHOTO_PRESENT).toBe("boolean");
  });

  it("ships true so the committed public/hero.jpg renders", () => {
    expect(HERO_PHOTO_PRESENT).toBe(true);
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
