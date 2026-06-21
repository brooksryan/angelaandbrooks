"use client";

import { useId, useState } from "react";
import styles from "./page.module.css";

type SubmitState =
  | { status: "idle" }
  | { status: "submitting" }
  // `ambiguous` is a neutral prompt (enter your full name), not an error.
  | { status: "ambiguous"; message: string }
  // `none` carries the contact email so we can render a mailto link.
  | { status: "none"; email: string }
  | { status: "error"; message: string };

export function GateForm() {
  const [name, setName] = useState("");
  const [state, setState] = useState<SubmitState>({ status: "idle" });

  const nameId = useId();
  const submitting = state.status === "submitting";

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    setState({ status: "submitting" });

    try {
      const response = await fetch("/api/gate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });

      if (response.ok) {
        // Reload the current URL. The gate is rewritten onto whatever route the
        // guest asked for, so reloading re-runs middleware — now with the access
        // cookie set — and renders the real page they were after.
        window.location.reload();
        return;
      }

      const body = (await response.json().catch(() => null)) as {
        kind?: string;
        error?: string;
        contactEmail?: string;
      } | null;
      // Ambiguous is a prompt to add the full name, not a failure — present it
      // calmly. A no-match shows a retry plus the contact line (mailto link).
      // Everything else (bad input, server) is a generic error.
      if (body?.kind === "ambiguous") {
        setState({
          status: "ambiguous",
          message:
            body.error ?? "Please enter your full name so we can find you.",
        });
        return;
      }
      if (body?.kind === "none" && body.contactEmail) {
        setState({ status: "none", email: body.contactEmail });
        return;
      }
      setState({
        status: "error",
        message:
          body?.error ??
          "We couldn't find that name on the guest list. Check the spelling and try again.",
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
          <label htmlFor={nameId} className={styles.label}>
            Your name
          </label>
          <input
            id={nameId}
            name="name"
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            autoComplete="name"
            autoFocus
            required
            className={styles.input}
          />
        </div>

        {state.status === "ambiguous" ? (
          <div role="status" className={styles.formNotice}>
            {state.message}
          </div>
        ) : null}

        {state.status === "none" ? (
          <div role="alert" className={styles.formError}>
            Can&rsquo;t find your name? Reach out to us at{" "}
            <a href={`mailto:${state.email}`}>{state.email}</a>.
          </div>
        ) : null}

        {state.status === "error" ? (
          <div role="alert" className={styles.formError}>
            {state.message}
          </div>
        ) : null}

        <button type="submit" className={styles.submit} disabled={submitting}>
          {submitting ? "Checking…" : "Enter"}
        </button>
      </fieldset>
    </form>
  );
}
