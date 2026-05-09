import type { Metadata } from "next";
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
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
