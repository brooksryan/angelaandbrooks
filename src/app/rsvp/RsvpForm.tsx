"use client";

import { useId, useState } from "react";
import styles from "./page.module.css";

type SubmitState =
  | { status: "idle" }
  | { status: "submitting" }
  | { status: "success" }
  | { status: "error"; message: string };

export function RsvpForm() {
  const [fullName, setFullName] = useState("");
  const [attending, setAttending] = useState<"yes" | "no" | "">("");
  const [plusOneName, setPlusOneName] = useState("");
  const [dietaryRestrictions, setDietaryRestrictions] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitState, setSubmitState] = useState<SubmitState>({
    status: "idle",
  });

  const fullNameId = useId();
  const plusOneId = useId();
  const dietaryId = useId();
  const attendingGroupId = useId();

  const isSubmitting = submitState.status === "submitting";
  const isSuccess = submitState.status === "success";

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting || isSuccess) return;

    setFieldErrors({});
    setSubmitState({ status: "submitting" });

    try {
      const response = await fetch("/api/rsvp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName,
          attending,
          plusOneName: attending === "yes" ? plusOneName : "",
          dietaryRestrictions,
        }),
      });

      const body = (await response.json().catch(() => null)) as
        | { ok?: boolean; errors?: Record<string, string>; error?: string }
        | null;

      if (response.ok && body?.ok) {
        setSubmitState({ status: "success" });
        return;
      }

      if (response.status === 400 && body?.errors) {
        setFieldErrors(body.errors);
        setSubmitState({
          status: "error",
          message: "Please fix the highlighted fields and try again.",
        });
        return;
      }

      setSubmitState({
        status: "error",
        message:
          body?.error ??
          "Something went wrong saving your RSVP. Please try again.",
      });
    } catch {
      setSubmitState({
        status: "error",
        message:
          "We couldn't reach the server. Check your connection and try again.",
      });
    }
  }

  if (isSuccess) {
    return (
      <div className={styles.successCard} role="status" aria-live="polite">
        <p className={styles.successEyebrow}>Got it</p>
        <h2 className={styles.successTitle}>Thank you, {fullName}.</h2>
        <p className={styles.successCopy}>
          {attending === "yes"
            ? "We're so glad you can make it. We'll be in touch with the final details closer to the wedding."
            : "We'll miss you, but we appreciate the heads-up."}
        </p>
      </div>
    );
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate>
      <fieldset disabled={isSubmitting} className={styles.fieldset}>
        <legend className={styles.legendVisuallyHidden}>RSVP details</legend>

        <div className={styles.field}>
          <label htmlFor={fullNameId} className={styles.label}>
            Full name
            <span className={styles.required} aria-hidden="true">
              {" "}
              *
            </span>
          </label>
          <input
            id={fullNameId}
            type="text"
            name="fullName"
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            required
            autoComplete="name"
            maxLength={200}
            aria-invalid={Boolean(fieldErrors.fullName)}
            aria-describedby={
              fieldErrors.fullName ? `${fullNameId}-error` : undefined
            }
            className={styles.input}
          />
          {fieldErrors.fullName ? (
            <p id={`${fullNameId}-error`} className={styles.fieldError}>
              {fieldErrors.fullName}
            </p>
          ) : null}
        </div>

        <fieldset
          className={styles.field}
          aria-describedby={
            fieldErrors.attending ? `${attendingGroupId}-error` : undefined
          }
        >
          <legend className={styles.label}>
            Will you attend?
            <span className={styles.required} aria-hidden="true">
              {" "}
              *
            </span>
          </legend>
          <div className={styles.radioGroup}>
            <label className={styles.radioLabel}>
              <input
                type="radio"
                name="attending"
                value="yes"
                checked={attending === "yes"}
                onChange={() => setAttending("yes")}
                required
              />
              <span>Yes, I&rsquo;ll be there</span>
            </label>
            <label className={styles.radioLabel}>
              <input
                type="radio"
                name="attending"
                value="no"
                checked={attending === "no"}
                onChange={() => setAttending("no")}
              />
              <span>No, I can&rsquo;t make it</span>
            </label>
          </div>
          {fieldErrors.attending ? (
            <p id={`${attendingGroupId}-error`} className={styles.fieldError}>
              {fieldErrors.attending}
            </p>
          ) : null}
        </fieldset>

        {attending === "yes" ? (
          <>
            <div className={styles.field}>
              <label htmlFor={plusOneId} className={styles.label}>
                Plus-one name
                <span className={styles.optional}> (optional)</span>
              </label>
              <input
                id={plusOneId}
                type="text"
                name="plusOneName"
                value={plusOneName}
                onChange={(event) => setPlusOneName(event.target.value)}
                autoComplete="off"
                maxLength={200}
                aria-invalid={Boolean(fieldErrors.plusOneName)}
                aria-describedby={
                  fieldErrors.plusOneName
                    ? `${plusOneId}-error`
                    : `${plusOneId}-help`
                }
                className={styles.input}
              />
              {fieldErrors.plusOneName ? (
                <p id={`${plusOneId}-error`} className={styles.fieldError}>
                  {fieldErrors.plusOneName}
                </p>
              ) : (
                <p id={`${plusOneId}-help`} className={styles.fieldHelp}>
                  Leave blank if you&rsquo;re coming on your own.
                </p>
              )}
            </div>

            <div className={styles.field}>
              <label htmlFor={dietaryId} className={styles.label}>
                Dietary restrictions
                <span className={styles.optional}> (optional)</span>
              </label>
              <textarea
                id={dietaryId}
                name="dietaryRestrictions"
                value={dietaryRestrictions}
                onChange={(event) => setDietaryRestrictions(event.target.value)}
                rows={3}
                maxLength={1000}
                aria-invalid={Boolean(fieldErrors.dietaryRestrictions)}
                aria-describedby={
                  fieldErrors.dietaryRestrictions
                    ? `${dietaryId}-error`
                    : undefined
                }
                className={styles.textarea}
              />
              {fieldErrors.dietaryRestrictions ? (
                <p id={`${dietaryId}-error`} className={styles.fieldError}>
                  {fieldErrors.dietaryRestrictions}
                </p>
              ) : null}
            </div>
          </>
        ) : null}

        {submitState.status === "error" ? (
          <div role="alert" className={styles.formError}>
            {submitState.message}
          </div>
        ) : null}

        <button type="submit" className={styles.submit} disabled={isSubmitting}>
          {isSubmitting ? "Sending…" : "Send RSVP"}
        </button>
      </fieldset>
    </form>
  );
}
