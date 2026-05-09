import { activeTheme } from "../../theme.config";

// Cloudflare Pages requires the edge runtime for App Router routes built via
// @cloudflare/next-on-pages. Every page/route handler in this app must export
// `runtime = 'edge'` (or be statically renderable).
export const runtime = "edge";

// Minimal placeholder home page — issue #7 replaces this with the real hero,
// quick-link cards, and image slot. Lives here so the theme system (#5) and
// shared layout (#6) have something on screen to verify against.
export default function Home() {
  return (
    <div
      style={{
        maxWidth: "48rem",
        margin: "0 auto",
        padding: "4rem 1.5rem",
      }}
    >
      <h1>Angela &amp; Brooks</h1>
      <p style={{ color: "var(--color-text-muted)", marginTop: "0.75rem" }}>
        October 23–24, 2026 · Che Fico · San Francisco
      </p>
      <p style={{ marginTop: "2rem" }}>
        Theme system is live. The active palette is{" "}
        <strong>{activeTheme.name}</strong>.
      </p>
    </div>
  );
}
