"use client";

import { useState } from "react";
import styles from "./page.module.css";

// Tiny client component so we can POST to /api/admin/logout and let the
// browser follow the redirect. A bare <form action="/api/admin/logout"
// method="POST"> would also work, but using fetch lets us show a "Signing out…"
// state for the half-second the round-trip takes.
export function LogoutButton() {
  const [pending, setPending] = useState(false);

  async function handleClick() {
    if (pending) return;
    setPending(true);
    try {
      await fetch("/api/admin/logout", { method: "POST" });
    } finally {
      // Always redirect, even on a network error — the cookie clears server-
      // side via Set-Cookie, and if that didn't reach us, a fresh /admin load
      // will bounce back to /admin/login anyway.
      window.location.href = "/admin/login";
    }
  }

  return (
    <button
      type="button"
      className={styles.logoutButton}
      onClick={handleClick}
      disabled={pending}
    >
      {pending ? "Signing out…" : "Sign out"}
    </button>
  );
}
