import { ApiError } from "@/lib/api";

export type PharmacistErrorKind =
  | "session_expired"
  | "not_active"
  | "no_account"
  | "network"
  | "generic";

export function classifyPharmacistError(error: unknown): PharmacistErrorKind {
  if (error instanceof ApiError) {
    if (error.status === 401) return "session_expired";
    if (error.status === 403) return "not_active";
    if (error.status === 404) return "no_account";
    return "generic";
  }
  return "network";
}

export type RegistrationErrorKind =
  | "email_taken"
  | "rate_limited"
  | "not_found"
  | "network"
  | "generic";

export function classifyRegistrationError(error: unknown): RegistrationErrorKind {
  if (error instanceof ApiError) {
    if (error.status === 409) return "email_taken";
    if (error.status === 429) return "rate_limited";
    if (error.status === 404) return "not_found";
    return "generic"; // 422, 500, 503
  }
  return "network";
}

/** Mirrors step 4's REPORT_SLOW_AFTER_MS. */
export const TOGGLE_SLOW_AFTER_MS = 6_000;
