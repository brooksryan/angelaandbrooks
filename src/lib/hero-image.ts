// Home-hero photo: the drop-in slot.
//
// The home page shows the photo when HERO_PHOTO_PRESENT is true, and a graceful
// placeholder when it is false. To swap in a real photo: drop a JPEG at the path
// below, ensure HERO_PHOTO_PRESENT is true, and rebuild/redeploy.
//
//   Drop the file at:  site/public/hero.jpg   (served as /hero.jpg)
//   Recommended:       a landscape (16:9) engagement photo, ~2000px wide.
//
// The alt text is generic on purpose so any photo of the couple stays
// accessible without a code edit. See docs/EDITING-THE-THEME.md for the full
// guide (covers this slot too).

/** Public URL the home hero photo is served from. */
export const HERO_IMAGE_PUBLIC_PATH = "/hero.jpg";

/** Accessible description of the hero photo (any photo of the couple). */
export const HERO_IMAGE_ALT = "Angela and Brooks";

/**
 * Whether the home hero renders the photo (`true`) or the graceful
 * "Photo coming soon" placeholder (`false`).
 *
 * This is an explicit build-time constant, not a filesystem probe. The home
 * page is statically prerendered, and a runtime `existsSync(process.cwd()/…)`
 * check resolved differently under the Cloudflare/OpenNext build than locally —
 * it baked the placeholder into production even though `public/hero.jpg`
 * shipped. A literal constant builds deterministically everywhere.
 *
 * The "content-ready placeholder" philosophy is preserved: flip this to `false`
 * to restore the placeholder slot, no other change needed. Keep `public/hero.jpg`
 * in sync with this flag (`true` ⇒ the file must ship).
 */
export const HERO_PHOTO_PRESENT = true;
