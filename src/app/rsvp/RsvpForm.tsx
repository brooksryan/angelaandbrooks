"use client";

import { useId, useState } from "react";
import styles from "./page.module.css";

export type PartyMemberView = {
  guestId: string;
  name: string;
};

type MemberAnswer = {
  attending: "yes" | "no" | "";
  dietaryRestrictions: string;
};

type SubmitState =
  | { status: "idle" }
  | { status: "submitting" }
  | { status: "success" }
  | { status: "error"; message: string };

type RsvpFormProps = {
  members: PartyMemberView[];
  plusOneEligible: boolean;
};

export function RsvpForm({ members, plusOneEligible }: RsvpFormProps) {
  const [answers, setAnswers] = useState<Record<string, MemberAnswer>>(() =>
    Object.fromEntries(
      members.map((member) => [
        member.guestId,
        { attending: "", dietaryRestrictions: "" },
      ])
    )
  );
  const [plusOneName, setPlusOneName] = useState("");
  const [plusOneDietary, setPlusOneDietary] = useState("");
  const [submitState, setSubmitState] = useState<SubmitState>({
    status: "idle",
  });

  const plusOneNameId = useId();
  const plusOneDietaryId = useId();
  const formErrorId = useId();

  const isSubmitting = submitState.status === "submitting";
  const isSuccess = submitState.status === "success";

  function setMember(guestId: string, patch: Partial<MemberAnswer>) {
    setAnswers((prev) => ({
      ...prev,
      [guestId]: { ...prev[guestId], ...patch },
    }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting || isSuccess) return;

    const answered = members.some(
      (member) => answers[member.guestId]?.attending !== ""
    );
    if (!answered && plusOneName.trim() === "") {
      setSubmitState({
        status: "error",
        message: "Please answer for at least one guest before sending.",
      });
      return;
    }

    setSubmitState({ status: "submitting" });

    try {
      const response = await fetch("/api/rsvp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          members: members.map((member) => ({
            guestId: member.guestId,
            attending: answers[member.guestId]?.attending ?? "",
            dietaryRestrictions:
              answers[member.guestId]?.dietaryRestrictions ?? "",
          })),
          plusOneName: plusOneEligible ? plusOneName : "",
          plusOneDietary: plusOneEligible ? plusOneDietary : "",
        }),
      });

      const body = (await response.json().catch(() => null)) as
        | { ok?: boolean; error?: string }
        | null;

      if (response.ok && body?.ok) {
        setSubmitState({ status: "success" });
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
        <h2 className={styles.successTitle}>Thank you!</h2>
        <p className={styles.successCopy}>
          We&rsquo;ve recorded your reply. We&rsquo;ll be in touch with the final
          details closer to the wedding.
        </p>
      </div>
    );
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate>
      <fieldset disabled={isSubmitting} className={styles.fieldset}>
        <legend className={styles.legendVisuallyHidden}>
          RSVP for your party
        </legend>

        {members.map((member) => (
          <MemberFields
            key={member.guestId}
            member={member}
            answer={answers[member.guestId]}
            onChange={(patch) => setMember(member.guestId, patch)}
          />
        ))}

        {plusOneEligible ? (
          <div className={styles.plusOneSection}>
            <p className={styles.sectionTitle}>Bringing a guest?</p>
            <div className={styles.field}>
              <label htmlFor={plusOneNameId} className={styles.label}>
                Plus-one name
                <span className={styles.optional}> (optional)</span>
              </label>
              <input
                id={plusOneNameId}
                type="text"
                name="plusOneName"
                value={plusOneName}
                onChange={(event) => setPlusOneName(event.target.value)}
                autoComplete="off"
                maxLength={200}
                aria-describedby={`${plusOneNameId}-help`}
                className={styles.input}
              />
              <p id={`${plusOneNameId}-help`} className={styles.fieldHelp}>
                Leave blank if you&rsquo;re coming on your own.
              </p>
            </div>
            <div className={styles.field}>
              <label htmlFor={plusOneDietaryId} className={styles.label}>
                Their dietary restrictions
                <span className={styles.optional}> (optional)</span>
              </label>
              <textarea
                id={plusOneDietaryId}
                name="plusOneDietary"
                value={plusOneDietary}
                onChange={(event) => setPlusOneDietary(event.target.value)}
                rows={2}
                maxLength={1000}
                className={styles.textarea}
              />
            </div>
          </div>
        ) : null}

        {submitState.status === "error" ? (
          <div role="alert" id={formErrorId} className={styles.formError}>
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

function MemberFields({
  member,
  answer,
  onChange,
}: {
  member: PartyMemberView;
  answer: MemberAnswer;
  onChange: (patch: Partial<MemberAnswer>) => void;
}) {
  const dietaryId = useId();
  const groupName = `attending-${member.guestId}`;

  return (
    <div className={styles.memberBlock}>
      <p className={styles.memberName}>{member.name}</p>

      <fieldset className={styles.field}>
        <legend className={styles.label}>Will you attend?</legend>
        <div className={styles.radioGroup}>
          <label className={styles.radioLabel}>
            <input
              type="radio"
              name={groupName}
              value="yes"
              checked={answer.attending === "yes"}
              onChange={() => onChange({ attending: "yes" })}
            />
            <span>Yes, joining</span>
          </label>
          <label className={styles.radioLabel}>
            <input
              type="radio"
              name={groupName}
              value="no"
              checked={answer.attending === "no"}
              onChange={() => onChange({ attending: "no" })}
            />
            <span>Can&rsquo;t make it</span>
          </label>
        </div>
      </fieldset>

      {answer.attending === "yes" ? (
        <div className={styles.field}>
          <label htmlFor={dietaryId} className={styles.label}>
            Dietary restrictions
            <span className={styles.optional}> (optional)</span>
          </label>
          <textarea
            id={dietaryId}
            name={`dietary-${member.guestId}`}
            value={answer.dietaryRestrictions}
            onChange={(event) =>
              onChange({ dietaryRestrictions: event.target.value })
            }
            rows={2}
            maxLength={1000}
            className={styles.textarea}
          />
        </div>
      ) : null}
    </div>
  );
}
