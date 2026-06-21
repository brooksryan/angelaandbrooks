// Home-hero photo: the drop-in slot.
//
// The home page shows a graceful placeholder until a real hero photo exists.
// To swap the placeholder for the photo, drop a JPEG at the path below and
// rebuild/redeploy — no code change required.
//
//   Drop the file at:  site/public/hero.jpg   (served as /hero.jpg)
//   Recommended:       a landscape (16:9) engagement photo, ~2000px wide.
//
// The alt text is generic on purpose so any photo of the couple stays
// accessible without a code edit. See docs/EDITING-THE-THEME.md for the full
// guide (covers this slot too).

import { existsSync } from "node:fs";
import path from "node:path";

/** Public URL the home hero photo is served from. */
export const HERO_IMAGE_PUBLIC_PATH = "/hero.jpg";

/** Accessible description of the hero photo (any photo of the couple). */
export const HERO_IMAGE_ALT = "Angela and Brooks";

/** Absolute on-disk path the hero photo must live at, inside /public. */
function heroImageFsPath(): string {
  return path.join(process.cwd(), "public", "hero.jpg");
}

/**
 * True when a real hero photo is present on disk. Resolved at build time for
 * the statically-rendered home page, so dropping in `public/hero.jpg` and
 * rebuilding swaps the placeholder for the photo with no code change.
 *
 * The optional `fsPath` argument exists for tests; production never passes it.
 * Any filesystem error resolves to `false` so the page falls back to the
 * graceful placeholder rather than throwing.
 */
export function heroPhotoExists(fsPath: string = heroImageFsPath()): boolean {
  try {
    return existsSync(fsPath);
  } catch {
    return false;
  }
}
