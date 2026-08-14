/**
 * Which policy's revision date a save should move.
 *
 * Two rules, both of which matter for a legal document:
 *
 *   1. A page that is not in the request is not touched. The dashboard saves
 *      one page at a time, so editing the terms cannot redate the privacy
 *      policy.
 *   2. A page whose body came back unchanged is not touched either. Re-saving
 *      a form after fixing a title, or clicking save twice, is not an
 *      amendment and must not claim to be one.
 *
 * Pure and separate from the route so it can be tested directly — the route
 * itself is behind an admin session.
 */

export type LegalBody = { body?: string } | null | undefined;

export type LegalSavePayload = {
  content?: LegalBody;
  privacyPolicyContent?: LegalBody;
};

export type LegalStored = {
  content?: unknown;
  privacyPolicyContent?: unknown;
};

export type LegalRevisionDates = {
  termsUpdatedAt?: Date;
  privacyUpdatedAt?: Date;
};

/** The HTML inside a { body } document, or "" for anything else. */
export function bodyOf(value: unknown): string {
  return value && typeof value === "object"
    ? ((value as { body?: string }).body ?? "")
    : "";
}

export function legalRevisionDates(
  payload: LegalSavePayload,
  stored: LegalStored,
  now: Date = new Date()
): LegalRevisionDates {
  const dates: LegalRevisionDates = {};

  if (payload.content !== undefined && bodyOf(payload.content) !== bodyOf(stored.content)) {
    dates.termsUpdatedAt = now;
  }

  if (
    payload.privacyPolicyContent !== undefined &&
    bodyOf(payload.privacyPolicyContent) !== bodyOf(stored.privacyPolicyContent)
  ) {
    dates.privacyUpdatedAt = now;
  }

  return dates;
}
