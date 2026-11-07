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
  | "pharmacy_taken"
  | "pharmacy_exists"
  | "file_too_large"
  | "file_type"
  | "rate_limited"
  | "not_found"
  | "network"
  | "generic";

export function classifyRegistrationError(error: unknown): RegistrationErrorKind {
  if (error instanceof ApiError) {
    if (error.status === 409 && error.detail === "pharmacy already has an account") return "pharmacy_taken";
    if (error.status === 409 && error.detail === "pharmacy already exists") return "pharmacy_exists";
    if (error.status === 409) return "email_taken";
    if (error.status === 413) return "file_too_large";
    if (error.status === 415) return "file_type";
    if (error.status === 429) return "rate_limited";
    if (error.status === 404) return "not_found";
    return "generic"; // 422, 500, 503
  }
  return "network";
}

/** Mirrors step 4's REPORT_SLOW_AFTER_MS. */
export const TOGGLE_SLOW_AFTER_MS = 6_000;
