"use client";

import { Fragment, useId, useState } from "react";
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
  | { status: "success"; outcome: "attending" | "declined" }
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
  const [bringingPlusOne, setBringingPlusOne] = useState(false);
  const [plusOneName, setPlusOneName] = useState("");
  const [plusOneDietary, setPlusOneDietary] = useState("");
  const [plusOneNameError, setPlusOneNameError] = useState(false);
  const [submitState, setSubmitState] = useState<SubmitState>({
    status: "idle",
  });

  const plusOneNameId = useId();
  const plusOneDietaryId = useId();
  const formErrorId = useId();

  const isSubmitting = submitState.status === "submitting";
  const isSuccess = submitState.status === "success";

  // The +1 belongs to whoever is actually coming: it only exists when someone in
  // the party is attending, and only carries data when the guest opts in. Flip
  // attendance off OR the toggle off and the +1 drops, stale typed text and all.
  const attendingForPlusOne = members.some(
    (member) => answers[member.guestId]?.attending === "yes"
  );
  // Let an eligible Guest see their +1 invitation before answering. Once every
  // displayed Party member declines, hide the controls because nobody can bring
  // the +1. This keeps the initial invitation visible without allowing a
  // declined RSVP to submit stale +1 data.
  const showPlusOneSection =
    plusOneEligible &&
    !members.every(
      (member) => answers[member.guestId]?.attending === "no"
    );
  const plusOneActive =
    plusOneEligible && attendingForPlusOne && bringingPlusOne;

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
    if (!answered) {
      setSubmitState({
        status: "error",
        message: "Please answer for at least one guest before sending.",
      });
      return;
    }

    // A named +1 is the signal the server writes back, so an opted-in +1 must be
    // named; the guest can always uncheck the toggle to come on their own.
    if (plusOneActive && plusOneName.trim() === "") {
      setPlusOneNameError(true);
      setSubmitState({ status: "idle" });
      return;
    }
    setPlusOneNameError(false);

    // The crux of the +1 gate: only an active +1 carries a name/diet to the
    // server; otherwise both are dropped regardless of what was typed earlier.
    const outboundPlusOneName = plusOneActive ? plusOneName.trim() : "";
    const outboundPlusOneDietary = plusOneActive ? plusOneDietary : "";

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
          plusOneName: outboundPlusOneName,
          plusOneDietary: outboundPlusOneDietary,
        }),
      });

      const body = (await response.json().catch(() => null)) as
        | { ok?: boolean; error?: string }
        | null;

      if (response.ok && body?.ok) {
        // Decline confirmation only when nobody is coming: every answered member
        // said no AND no guest is being brought. Any Yes, or a brought guest,
        // reads as attending.
        const anyYes = members.some(
          (member) => answers[member.guestId]?.attending === "yes"
        );
        const bringingGuest = outboundPlusOneName !== "";
        const outcome = anyYes || bringingGuest ? "attending" : "declined";
        setSubmitState({ status: "success", outcome });
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

  if (submitState.status === "success") {
    const declined = submitState.outcome === "declined";
    return (
      <div className={styles.successCard} role="status" aria-live="polite">
        <p className={styles.successEyebrow}>Got it</p>
        <h2 className={styles.successTitle}>
          {declined ? "We’ll miss you" : "Thank you!"}
        </h2>
        <p className={styles.successCopy}>
          {declined
            ? "Thanks for letting us know. We’re sorry you can’t be there — you’ll be missed, and we hope to catch up soon."
            : "We’ve got your RSVP — we can’t wait to celebrate with you. We’ll be in touch with the final details closer to the day."}
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

        {members.map((member, index) => (
          <Fragment key={member.guestId}>
            <MemberFields
              member={member}
              answer={answers[member.guestId]}
              onChange={(patch) => setMember(member.guestId, patch)}
            />

            {index === 0 && showPlusOneSection ? (
              <div className={styles.plusOneSection}>
                <p className={styles.sectionTitle}>You have a +1!</p>
                <p className={styles.sectionSubtitle}>
                  You’re welcome to bring a guest — let us know below.
                </p>
                <label className={styles.toggleLabel}>
                  <input
                    type="checkbox"
                    name="bringingPlusOne"
                    checked={bringingPlusOne}
                    onChange={(event) => {
                      setBringingPlusOne(event.target.checked);
                      if (!event.target.checked) setPlusOneNameError(false);
                    }}
                  />
                  <span>I’m bringing a guest</span>
                </label>

                {bringingPlusOne ? (
                  <>
                    <div className={styles.field}>
                      <label htmlFor={plusOneNameId} className={styles.label}>
                        Guest’s name
                      </label>
                      <input
                        id={plusOneNameId}
                        type="text"
                        name="plusOneName"
                        value={plusOneName}
                        onChange={(event) => {
                          setPlusOneName(event.target.value);
                          if (plusOneNameError) setPlusOneNameError(false);
                        }}
                        placeholder="First and last name"
                        autoComplete="off"
                        maxLength={200}
                        aria-invalid={plusOneNameError || undefined}
                        aria-describedby={
                          plusOneNameError
                            ? `${plusOneNameId}-error`
                            : undefined
                        }
                        className={styles.input}
                      />
                      {plusOneNameError ? (
                        <p
                          id={`${plusOneNameId}-error`}
                          className={styles.fieldError}
                          role="alert"
                        >
                          Please add your guest’s name, or uncheck “I’m bringing
                          a guest” if you’re coming on your own.
                        </p>
                      ) : null}
                    </div>
                    <div className={styles.field}>
                      <label
                        htmlFor={plusOneDietaryId}
                        className={styles.label}
                      >
                        Their dietary restrictions
                        <span className={styles.optional}> (optional)</span>
                      </label>
                      <textarea
                        id={plusOneDietaryId}
                        name="plusOneDietary"
                        value={plusOneDietary}
                        onChange={(event) =>
                          setPlusOneDietary(event.target.value)
                        }
                        rows={2}
                        maxLength={1000}
                        className={styles.textarea}
                      />
                    </div>
                  </>
                ) : null}
              </div>
            ) : null}
          </Fragment>
        ))}

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
            <span>Can’t make it</span>
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
