// @vitest-environment jsdom

// The back-button contract lives entirely in GalleryLightbox — the viewer
// library never touches the History API — so these tests mock the lazily
// loaded overlay and drive the wrapper directly: what pushes, what pops,
// where focus lands. The mock's "Next photo" button models real photo
// navigation faithfully: overlay-internal state, invisible to the wrapper.

import "@testing-library/jest-dom/vitest";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import GalleryLightbox, { type LightboxPhoto } from "./GalleryLightbox";

vi.mock("./LightboxOverlay", async () => {
  const React = await import("react");
  function MockOverlay({
    open,
    index,
    onClose,
  }: {
    open: boolean;
    index: number;
    onClose: () => void;
  }) {
    const [, navigate] = React.useState(0);
    if (!open) return null;
    return React.createElement(
      "div",
      { role: "dialog", "data-testid": "overlay", "data-index": index },
      React.createElement(
        "button",
        { type: "button", onClick: () => navigate((step) => step + 1) },
        "Next photo",
      ),
      React.createElement(
        "button",
        { type: "button", onClick: onClose },
        "Close viewer",
      ),
    );
  }
  return { default: MockOverlay };
});

const photos: LightboxPhoto[] = [0, 1, 2].map((n) => ({
  src: `/gallery/photo-${n}.1280w.webp`,
  width: 1280,
  height: 853,
  alt: `Photo ${n}`,
  srcSet: [{ src: `/gallery/photo-${n}.640w.webp`, width: 640, height: 427 }],
}));

function renderGallery() {
  return render(
    <GalleryLightbox photos={photos}>
      <button type="button" data-gallery-index={0}>
        Tile zero
      </button>
      <button type="button" data-gallery-index={1}>
        Tile one
      </button>
      <span>not a tile</span>
    </GalleryLightbox>,
  );
}

async function openViewer(tileName: string) {
  fireEvent.click(screen.getByRole("button", { name: tileName }));
  return screen.findByTestId("overlay");
}

/** Simulates the browser traversing history (back or forward button). */
function traverseHistory() {
  act(() => {
    window.dispatchEvent(new PopStateEvent("popstate"));
  });
}

describe("GalleryLightbox history contract", () => {
  let pushSpy: ReturnType<typeof vi.spyOn>;
  let backSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    pushSpy = vi.spyOn(window.history, "pushState");
    // jsdom's real back() traverses asynchronously; replacing it with a
    // synchronous popstate dispatch models the browser deterministically.
    backSpy = vi
      .spyOn(window.history, "back")
      .mockImplementation(() => {
        window.dispatchEvent(new PopStateEvent("popstate"));
      });
  });

  afterEach(() => {
    // Test-library auto-cleanup hooks into vitest globals, which this repo
    // disables — unmount explicitly or renders leak across tests.
    cleanup();
    vi.restoreAllMocks();
  });

  it("opens the viewer at the clicked tile and pushes exactly one history entry", async () => {
    renderGallery();
    expect(screen.queryByTestId("overlay")).not.toBeInTheDocument();

    const overlay = await openViewer("Tile one");

    expect(overlay).toHaveAttribute("data-index", "1");
    expect(pushSpy).toHaveBeenCalledTimes(1);
  });

  it("pushes nothing when navigating photos inside the viewer", async () => {
    renderGallery();
    await openViewer("Tile zero");

    fireEvent.click(screen.getByRole("button", { name: "Next photo" }));
    fireEvent.click(screen.getByRole("button", { name: "Next photo" }));

    expect(screen.getByTestId("overlay")).toBeInTheDocument();
    expect(pushSpy).toHaveBeenCalledTimes(1);
  });

  it("closes the viewer on browser back without leaving the page", async () => {
    renderGallery();
    await openViewer("Tile zero");

    traverseHistory();

    expect(screen.queryByTestId("overlay")).not.toBeInTheDocument();
    // The wrapper must not call back() itself here — the browser already
    // consumed the entry; a second back() would exit the page.
    expect(backSpy).not.toHaveBeenCalled();
  });

  it("consumes the pushed entry when closed from the viewer's own UI", async () => {
    renderGallery();
    await openViewer("Tile zero");

    fireEvent.click(screen.getByRole("button", { name: "Close viewer" }));

    expect(backSpy).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId("overlay")).not.toBeInTheDocument();
  });

  it("stays closed when the browser goes forward after back", async () => {
    renderGallery();
    await openViewer("Tile zero");

    traverseHistory(); // back: closes the viewer
    traverseHistory(); // forward: re-enters the stale entry

    expect(screen.queryByTestId("overlay")).not.toBeInTheDocument();
    expect(pushSpy).toHaveBeenCalledTimes(1);
  });

  it("pushes a fresh entry on reopen after close", async () => {
    renderGallery();
    await openViewer("Tile zero");
    traverseHistory();

    const overlay = await openViewer("Tile one");

    expect(overlay).toHaveAttribute("data-index", "1");
    expect(pushSpy).toHaveBeenCalledTimes(2);
  });

  it("returns focus to the opening tile on close", async () => {
    renderGallery();
    const tile = screen.getByRole("button", { name: "Tile one" });
    await openViewer("Tile one");

    traverseHistory();

    await waitFor(() => expect(tile).toHaveFocus());
  });

  it("ignores clicks that do not come from a tile", () => {
    renderGallery();

    fireEvent.click(screen.getByText("not a tile"));

    expect(screen.queryByTestId("overlay")).not.toBeInTheDocument();
    expect(pushSpy).not.toHaveBeenCalled();
  });
});
