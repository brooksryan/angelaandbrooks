"use client";

// The full-screen photo viewer. This module owns the yet-another-react-
// lightbox dependency and its stylesheets, and it is only ever loaded via
// React.lazy from GalleryLightbox — keep every heavy import here so the
// grid page's initial JavaScript stays free of it.
//
// Motion: the library reads prefers-reduced-motion itself (it drops fade
// duration to zero and skips slide/zoom animations), so we don't need an
// animation override here; the chrome-toggle transition handles the same
// preference in lightbox.module.css.

import { useMemo, useState } from "react";
import Lightbox from "yet-another-react-lightbox";
import Captions from "yet-another-react-lightbox/plugins/captions";
import Zoom from "yet-another-react-lightbox/plugins/zoom";
import "yet-another-react-lightbox/styles.css";
import "yet-another-react-lightbox/plugins/captions.css";
import type { LightboxPhoto } from "./GalleryLightbox";
import styles from "./lightbox.module.css";

type LightboxOverlayProps = {
  photos: LightboxPhoto[];
  /** Photo to open at; navigation from there is the viewer's own state. */
  index: number;
  open: boolean;
  /** Called when the guest closes via Escape, the close button, or pull-down. */
  onClose: () => void;
};

export default function LightboxOverlay({
  photos,
  index,
  open,
  onClose,
}: LightboxOverlayProps) {
  // Single tap/click on the photo toggles the chrome (toolbar + arrows),
  // like a native photo app. Every open starts with the chrome visible so a
  // guest is never dropped into an apparently button-less viewer.
  const [chromeHidden, setChromeHidden] = useState(false);

  // Memoized so the chrome toggle's re-render hands the viewer the same
  // slide objects instead of resetting its carousel. Slides advertise the
  // largest GENERATED variant as their intrinsic size — the zoom ceiling
  // must match a file that actually exists, and some masters top out below
  // the largest ladder step.
  const slides = useMemo(
    () =>
      photos.map((photo) => ({
        src: photo.src,
        width: photo.width,
        height: photo.height,
        alt: photo.alt,
        srcSet: photo.srcSet,
        description: photo.caption,
      })),
    [photos],
  );

  return (
    <Lightbox
      open={open}
      close={onClose}
      index={index}
      slides={slides}
      plugins={[Captions, Zoom]}
      // Pull-down dismiss on top of the defaults (Escape, close button).
      // Backdrop clicks deliberately do NOT close — a tap that lands beside
      // the photo would otherwise fight the tap-toggles-chrome gesture.
      controller={{ closeOnPullDown: true }}
      // The ladder tops out at 1280w, so at 1:1 image-to-device pixels a
      // modern phone gets almost no pinch range; allowing 2x trades a little
      // sharpness at full zoom for a usable, native-feeling gesture.
      zoom={{ maxZoomPixelRatio: 2 }}
      on={{
        click: () => setChromeHidden((hidden) => !hidden),
        entering: () => setChromeHidden(false),
      }}
      className={
        chromeHidden
          ? `${styles.lightbox} ${styles.chromeHidden}`
          : styles.lightbox
      }
    />
  );
}
