import type { Metadata } from "next";
import { activeTheme, buildThemeCss } from "../../theme.config";
import { Footer } from "../ui/Footer";
import { Nav } from "../ui/Nav";
import "./globals.css";

export const metadata: Metadata = {
  title: "Angela & Brooks — October 23–24, 2026",
  description:
    "Wedding website for Angela and Brooks. Ceremony Friday October 23 and dinner reception Saturday October 24, 2026 at Che Fico in San Francisco.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // The active theme's font CSS variables (--font-heading, --font-body) are
  // exposed by applying both font className stubs to <html>; globals.css reads
  // them via var().
  const fontClassNames = [
    activeTheme.fonts.heading.variable,
    activeTheme.fonts.body.variable,
  ].join(" ");

  return (
    <html lang="en" className={fontClassNames}>
      <head>
        {/*
          Color tokens are injected as :root custom properties so every
          component can read them via var(--color-…). Server-rendered, so
          there's no FOUC and no client JS cost.
        */}
        <style
          dangerouslySetInnerHTML={{ __html: buildThemeCss(activeTheme) }}
        />
      </head>
      <body>
        <a href="#main" className="skip-link">
          Skip to content
        </a>
        <Nav />
        <main id="main">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
