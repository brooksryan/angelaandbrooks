"use client";

import { useId, useState } from "react";
import styles from "./page.module.css";

type SubmitState =
  | { status: "idle" }
  | { status: "submitting" }
  | { status: "error"; message: string };

export function LoginForm() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [state, setState] = useState<SubmitState>({ status: "idle" });

  const userId = useId();
  const passwordId = useId();
  const submitting = state.status === "submitting";

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    setState({ status: "submitting" });

    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      if (response.ok) {
        // Force a fresh navigation so the server-rendered /admin page picks up
        // the new cookie immediately.
        window.location.href = "/admin";
        return;
      }

      const body = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;
      setState({
        status: "error",
        message:
          body?.error ?? "Sign-in failed. Check the username and password.",
      });
    } catch {
      setState({
        status: "error",
        message:
          "We couldn't reach the server. Check your connection and try again.",
      });
    }
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate>
      <fieldset className={styles.fieldset} disabled={submitting}>
        <div className={styles.field}>
          <label htmlFor={userId} className={styles.label}>
            Username
          </label>
          <input
            id={userId}
            name="username"
            type="text"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            autoComplete="username"
            required
            className={styles.input}
          />
        </div>

        <div className={styles.field}>
          <label htmlFor={passwordId} className={styles.label}>
            Password
          </label>
          <input
            id={passwordId}
            name="password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
            required
            className={styles.input}
          />
        </div>

        {state.status === "error" ? (
          <div role="alert" className={styles.formError}>
            {state.message}
          </div>
        ) : null}

        <button type="submit" className={styles.submit} disabled={submitting}>
          {submitting ? "Signing in…" : "Sign in"}
        </button>
      </fieldset>
    </form>
  );
}
