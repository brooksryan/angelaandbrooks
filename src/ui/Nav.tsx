"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import styles from "./Nav.module.css";

// Single source of truth for the site's primary nav. Pages are added here, not
// in the layout — the order here is the order guests see in both desktop and
// mobile views.
const NAV_LINKS: ReadonlyArray<{ href: string; label: string }> = [
  { href: "/", label: "Home" },
  { href: "/rsvp", label: "RSVP" },
  { href: "/details", label: "Details" },
  { href: "/travel", label: "Travel" },
  { href: "/registry", label: "Registry" },
  { href: "/faqs", label: "FAQs" },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Nav() {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const drawerId = useId();
  const drawerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const closeDrawer = useCallback(() => setDrawerOpen(false), []);

  // Close on Escape; focus-trap inside the drawer while it's open. Drawer also
  // closes whenever the route changes (covered by the pathname effect below).
  useEffect(() => {
    if (!drawerOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeDrawer();
        triggerRef.current?.focus();
        return;
      }

      if (event.key !== "Tab") return;

      const drawer = drawerRef.current;
      if (!drawer) return;
      const focusables = drawer.querySelectorAll<HTMLElement>(
        'a, button, [tabindex]:not([tabindex="-1"])'
      );
      if (focusables.length === 0) return;

      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement as HTMLElement | null;

      if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [drawerOpen, closeDrawer]);

  // Lock body scroll while the drawer is open and move focus into it.
  useEffect(() => {
    if (!drawerOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const firstLink = drawerRef.current?.querySelector<HTMLElement>("a");
    firstLink?.focus();

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [drawerOpen]);


  return (
    // The backdrop and drawer are siblings of <header>, not children. The
    // header sets `backdrop-filter`, which per spec creates a containing block
    // for `position: fixed` descendants — nesting the drawer inside the header
    // would clip its fixed-position box to the header bar instead of the
    // viewport, hiding the drawer on mobile entirely.
    <>
      <header className={styles.header}>
        <nav className={styles.nav} aria-label="Primary">
          <Link href="/" className={styles.brand} aria-label="Home — Angela & Brooks">
            A &amp; B
          </Link>

          <ul className={styles.desktopList}>
            {NAV_LINKS.map((link) => {
              const active = isActive(pathname, link.href);
              return (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    aria-current={active ? "page" : undefined}
                    className={
                      active ? `${styles.link} ${styles.linkActive}` : styles.link
                    }
                  >
                    {link.label}
                  </Link>
                </li>
              );
            })}
          </ul>

          <button
            ref={triggerRef}
            type="button"
            className={styles.hamburger}
            aria-controls={drawerId}
            aria-expanded={drawerOpen}
            aria-label={drawerOpen ? "Close menu" : "Open menu"}
            onClick={() => setDrawerOpen((open) => !open)}
          >
            <span className={styles.hamburgerBar} aria-hidden="true" />
            <span className={styles.hamburgerBar} aria-hidden="true" />
            <span className={styles.hamburgerBar} aria-hidden="true" />
          </button>
        </nav>
      </header>

      {/* Backdrop swallows outside taps and closes the drawer. */}
      <div
        className={
          drawerOpen
            ? `${styles.backdrop} ${styles.backdropOpen}`
            : styles.backdrop
        }
        aria-hidden="true"
        onClick={closeDrawer}
      />

      <div
        id={drawerId}
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-label="Site navigation"
        className={
          drawerOpen ? `${styles.drawer} ${styles.drawerOpen}` : styles.drawer
        }
      >
        <ul className={styles.drawerList}>
          {NAV_LINKS.map((link) => {
            const active = isActive(pathname, link.href);
            return (
              <li key={link.href}>
                <Link
                  href={link.href}
                  aria-current={active ? "page" : undefined}
                  onClick={closeDrawer}
                  className={
                    active
                      ? `${styles.drawerLink} ${styles.drawerLinkActive}`
                      : styles.drawerLink
                  }
                >
                  {link.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </>
  );
}
