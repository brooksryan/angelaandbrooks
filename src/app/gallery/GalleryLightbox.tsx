"use client";

// The gallery's only client island. The photo grid stays fully
// server-rendered; this wrapper catches clicks that bubble up from the
// server-rendered tile buttons (marked with data-gallery-index) and mounts
// the full-screen viewer on demand. React.lazy keeps the viewer library out
// of the page's initial JavaScript — the browser fetches its chunk the first
// time a guest opens a photo, never on page load.
//
// This file also owns the back-button contract, hand-written because the
// viewer library deliberately never touches the History API:
//
//   • Opening pushes EXACTLY ONE history entry (same URL, marker state).
//   • Browser back (popstate) closes the viewer and returns to the grid —
//     it never exits the page. Scroll position survives because nothing
//     navigates: the viewer is an overlay that locks body scroll beneath it.
//   • Navigating photos inside the viewer pushes nothing — navigation is
//     internal viewer state.
//   • Closing via Escape / the close button / pull-down consumes the pushed
//     entry (history.back()), so the stack never accumulates dead entries.
//   • Forward after back does NOT reopen the viewer. The stale forward entry
//     is inert, and the next open's pushState overwrites it.

import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
  type MouseEvent,
  type ReactNode,
} from "react";

const LightboxOverlay = lazy(() => import("./LightboxOverlay"));

/**
 * The slice of photo data the full-screen viewer needs, resolved on the
 * server and serialized as props. Kept slim on purpose — tile-only extras
 * (blur placeholder, AVIF srcset) stay out of the client payload.
 */
export type LightboxPhoto = {
  /**
   * Largest generated WebP variant. Also the viewer's resolution ceiling:
   * per-photo maximums come from the generated ladder, never the master
   * (a small master can top out below the largest ladder step).
   */
  src: string;
  /** Intrinsic dimensions of that largest generated variant. */
  width: number;
  height: number;
  alt: string;
  /** WebP ladder, ascending by width, for the viewer's responsive srcset. */
  srcSet: { src: string; width: number; height: number }[];
  caption?: string;
};

/** Attribute the server-rendered tile buttons carry; values index `photos`. */
const TILE_INDEX_ATTRIBUTE = "data-gallery-index";

type GalleryLightboxProps = {
  /** All photos on the page in tile order, flattened across sections. */
  photos: LightboxPhoto[];
  /** The server-rendered grid sections. */
  children: ReactNode;
};

export default function GalleryLightbox({
  photos,
  children,
}: GalleryLightboxProps) {
  // Which photo is open; -1 means closed. Drives both the overlay and the
  // history wiring.
  const [photoIndex, setPhotoIndex] = useState(-1);
  // Flips true on first open and stays true: the overlay remains mounted
  // across close/reopen so its chunk loads once and reopening is instant.
  const [overlayRequested, setOverlayRequested] = useState(false);
  // The tile that opened the viewer — keyboard and screen-reader users get
  // their focus handed back to it on close.
  const openerRef = useRef<HTMLElement | null>(null);
  // Whether our history entry is currently on the stack. A ref, not state:
  // popstate handlers must read the live value, and it must never lag a
  // render behind reality.
  const pushedEntryRef = useRef(false);

  useEffect(() => {
    const handlePopState = () => {
      // Only react to the pop that consumes OUR entry. A popstate while
      // nothing is pushed is the forward-after-back case (or unrelated
      // traversal): the viewer stays closed and we deliberately do nothing.
      if (!pushedEntryRef.current) return;
      pushedEntryRef.current = false;
      setPhotoIndex(-1);
      const opener = openerRef.current;
      openerRef.current = null;
      // After the paint that unmounts the viewer portal — otherwise the
      // library's own teardown focus handling would run after us and win.
      if (opener) {
        requestAnimationFrame(() => opener.focus());
      }
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  // One delegated listener instead of a per-tile handler: the tiles can stay
  // server-rendered (no hydration cost per photo) and a future content drop
  // of many more photos costs nothing here.
  const handleTileClick = (event: MouseEvent<HTMLDivElement>) => {
    const tile = (event.target as Element).closest?.(
      `button[${TILE_INDEX_ATTRIBUTE}]`,
    );
    if (!(tile instanceof HTMLElement)) return;
    const tileIndex = Number(tile.getAttribute(TILE_INDEX_ATTRIBUTE));
    if (!Number.isInteger(tileIndex) || tileIndex < 0 || tileIndex >= photos.length) {
      return;
    }
    openerRef.current = tile;
    setOverlayRequested(true);
    setPhotoIndex(tileIndex);
    if (!pushedEntryRef.current) {
      pushedEntryRef.current = true;
      // Same URL on purpose: the entry exists only to give the back button
      // something to consume. Next.js supports native pushState for
      // same-page state (shallow routing), so the app router stays put.
      window.history.pushState({ galleryLightbox: true }, "", window.location.href);
    }
  };

  // Close requested by the viewer itself (Escape, close button, pull-down).
  // Route it through history so the pushed entry is consumed; the popstate
  // handler above then performs the actual close. The fallback branch only
  // guards the theoretical case of a close arriving after the entry is gone.
  const handleClose = useCallback(() => {
    if (pushedEntryRef.current) {
      window.history.back();
    } else {
      setPhotoIndex(-1);
    }
  }, []);

  return (
    <div onClick={handleTileClick}>
      {children}
      {overlayRequested && (
        <Suspense fallback={null}>
          <LightboxOverlay
            photos={photos}
            open={photoIndex >= 0}
            index={Math.max(photoIndex, 0)}
            onClose={handleClose}
          />
        </Suspense>
      )}
    </div>
  );
}
