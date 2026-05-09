// Shared RSVP types + validation. Used by both the API route and any client
// or test that needs to know the shape of a submission.

export type RsvpSubmission = {
  fullName: string;
  attending: boolean;
  plusOneName: string;
  dietaryRestrictions: string;
};

export type RsvpValidationResult =
  | { ok: true; value: RsvpSubmission }
  | { ok: false; errors: Record<string, string> };

const MAX_NAME_LENGTH = 200;
const MAX_DIETARY_LENGTH = 1000;

/**
 * Validate an unknown payload against the RSVP submission shape. Returns the
 * normalized submission on success, or a per-field error map on failure.
 *
 * Validation rules:
 * - fullName: required, trimmed, 1–200 chars
 * - attending: required boolean
 * - plusOneName: optional, trimmed, ≤ 200 chars; ignored if not attending
 * - dietaryRestrictions: optional, trimmed, ≤ 1000 chars
 */
export function validateRsvp(input: unknown): RsvpValidationResult {
  if (typeof input !== "object" || input === null) {
    return { ok: false, errors: { _root: "Body must be a JSON object." } };
  }

  const data = input as Record<string, unknown>;
  const errors: Record<string, string> = {};

  const fullName =
    typeof data.fullName === "string" ? data.fullName.trim() : "";
  if (fullName.length === 0) {
    errors.fullName = "Full name is required.";
  } else if (fullName.length > MAX_NAME_LENGTH) {
    errors.fullName = `Name must be ${MAX_NAME_LENGTH} characters or fewer.`;
  }

  let attending: boolean | null = null;
  if (data.attending === true || data.attending === false) {
    attending = data.attending;
  } else if (data.attending === "yes" || data.attending === "no") {
    attending = data.attending === "yes";
  } else {
    errors.attending = "Please indicate whether you're attending.";
  }

  const rawPlusOne =
    typeof data.plusOneName === "string" ? data.plusOneName.trim() : "";
  if (rawPlusOne.length > MAX_NAME_LENGTH) {
    errors.plusOneName = `Plus-one name must be ${MAX_NAME_LENGTH} characters or fewer.`;
  }
  // Plus-one only applies when attending — silently drop it otherwise so a
  // guest who flips Y → N → Y doesn't lose meaningful prior input client-side.
  const plusOneName = attending === true ? rawPlusOne : "";

  const dietaryRestrictions =
    typeof data.dietaryRestrictions === "string"
      ? data.dietaryRestrictions.trim()
      : "";
  if (dietaryRestrictions.length > MAX_DIETARY_LENGTH) {
    errors.dietaryRestrictions = `Dietary restrictions must be ${MAX_DIETARY_LENGTH} characters or fewer.`;
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    value: {
      fullName,
      // Validation guarantees attending is non-null if errors is empty.
      attending: attending as boolean,
      plusOneName,
      dietaryRestrictions,
    },
  };
}
