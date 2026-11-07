const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

export type HealthResponse = {
  status: "ok";
  service: string;
  version: string;
  environment: string;
};

export type DbHealthResponse =
  | {
      status: "ok";
      supabase: "reachable";
      latency_ms: number;
    }
  | {
      status: "error";
      supabase: "unreachable";
      detail: string;
    };

export type Pharmacy = {
  id: string;
  name: string;
  name_ar?: string | null;
  address: string;
  city: string;
  governorate: string;
  governorate_slug: string;
  lat: number;
  lng: number;
  phone: string | null;
  verified: boolean;
  /** Open all night (24/7 or a "pharmacie de nuit"). */
  is_24h: boolean;
  /** Set while a declared garde is in progress: when it ends. */
  on_duty_until: string | null;
};

export type PharmacyListResponse = { pharmacies: Pharmacy[]; count: number; governorate: string | null };

export type Governorate = {
  slug: string;
  iso_code: string;
  name_fr: string;
  name_ar: string;
  lat: number;
  lng: number;
  pharmacy_count: number;
};

export type GovernorateListResponse = { governorates: Governorate[]; count: number };

export type MedicationCategory = "thyroid" | "insulin" | "psychiatric" | "cancer_pain";
export type StockStatus = "in_stock" | "out_of_stock" | "unsure";
export type StockStatusView = StockStatus | "none";
export type ReportSource = "patient" | "pharmacist";

export type Medication = {
  id: string;
  slug: string;
  name: string;
  generic_name: string;
  form: string | null;
  category: MedicationCategory;
};
export type MedicationMatch = Medication & { score: number };
export type MedicationListResponse = { medications: Medication[]; count: number };
export type MedicationSearchResponse = {
  query: string;
  medications: MedicationMatch[];
  count: number;
};

/** Superset of Pharmacy — `id` is the pharmacy id. */
export type PharmacyStock = Pharmacy & {
  status: StockStatusView;
  reported_at: string | null; // ISO 8601 with offset
  reported_by: ReportSource | null;
  /** Distinct reporters in the last 24 h agreeing / disagreeing. */
  confirmations_24h: number;
  contradictions_24h: number;
  pharmacist_confirmed_24h: boolean;
};
export type StockSummary = {
  in_stock: number;
  out_of_stock: number;
  unsure: number;
  none: number;
};
export type MedicationStockResponse = {
  medication: Medication;
  governorate: Governorate;
  pharmacies: PharmacyStock[];
  count: number;
  summary: StockSummary;
};

export type GovernorateAvailability = {
  slug: string;
  name_fr: string;
  name_ar: string;
  pharmacy_count: number;
  in_stock: number;
  out_of_stock: number;
  unsure: number;
  last_report_at: string | null;
};

export type MedicationAvailabilityResponse = {
  medication: Medication;
  governorates: GovernorateAvailability[];
  totals: StockSummary;
  max_age_days: number;
};

export type ObservatoryWeek = {
  week_start: string; // YYYY-MM-DD, Monday
  in_stock_reports: number;
  out_of_stock_reports: number;
  viewers: number;
};

export type ObservatoryMedication = {
  medication: Medication;
  in_stock_pharmacies: number;
  out_of_stock_pharmacies: number;
  unsure_pharmacies: number;
  governorates_reporting: number;
  weeks: ObservatoryWeek[];
};

export type ObservatoryResponse = {
  generated_at: string;
  weeks: number;
  max_age_days: number;
  medications: ObservatoryMedication[];
};

export class ApiError extends Error {
  readonly status: number;
  /** The API's `detail` string when it sent one (e.g. "pharmacy already
   *  has an account"), so callers can tell two 409s apart. */
  readonly detail: string | null;

  constructor(status: number, message: string, detail: string | null = null) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.detail = detail;
  }
}

async function readDetail(response: Response): Promise<string | null> {
  try {
    const body = (await response.json()) as { detail?: unknown };
    return typeof body.detail === "string" ? body.detail : null;
  } catch {
    return null;
  }
}

export function getApiBaseUrl(): string {
  if (!API_BASE_URL) {
    throw new Error(
      "NEXT_PUBLIC_API_BASE_URL is not set. Add it to frontend/.env (see frontend/.env.example)."
    );
  }
  return API_BASE_URL;
}

type FetchOptions = {
  /** Seconds of ISR caching. Omit for `cache: "no-store"`. */
  revalidate?: number;
  /** Next.js Data Cache tags, for on-demand purge via revalidateTag. Only
   *  meaningful together with `revalidate`. */
  tags?: string[];
  /** Defaults to 60_000 to tolerate Render cold starts. */
  timeoutMs?: number;
  /** Combined with the timeout via AbortSignal.any, so a caller can cancel
   *  a superseded request (e.g. the typeahead) independently of the
   *  cold-start timeout. */
  signal?: AbortSignal;
  /** Defaults to "GET". */
  method?: "GET" | "POST" | "DELETE";
  /** JSON-serialised when present. */
  body?: unknown;
  /** A pharmacist's Supabase access token. When present, sets
   *  `Authorization: Bearer …` and FORCES `cache: "no-store"` — a
   *  per-user response must never land in Next's shared Data Cache. */
  accessToken?: string;
};

async function fetchJson<T>(path: string, options: FetchOptions = {}): Promise<T> {
  const { revalidate, tags, timeoutMs = 60_000, signal, method = "GET", body, accessToken } =
    options;

  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    method,
    ...(accessToken !== undefined
      ? { cache: "no-store" as const }
      : method !== "GET"
        ? { cache: "no-store" as const }
        : revalidate !== undefined
          ? { next: { revalidate, ...(tags ? { tags } : {}) } }
          : { cache: "no-store" as const }),
    headers: {
      // Forces a CORS preflight on every write, so only ALLOWED_ORIGINS
      // can make a browser send one (see backend routers/medications.py).
      ...(method !== "GET" ? { "X-Mawjoud-Client": "web" } : {}),
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      ...(accessToken !== undefined ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    signal: signal
      ? AbortSignal.any([signal, AbortSignal.timeout(timeoutMs)])
      : AbortSignal.timeout(timeoutMs),
  });

  if (!response.ok) {
    throw new ApiError(
      response.status,
      `Request to ${path} failed with status ${response.status}`,
      await readDetail(response)
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

/** Single definition of the Data Cache tag for a medication's stock
 *  results, used by both `getMedicationStock` and the revalidation Server
 *  Action so they can never drift. */
export function medicationStockTag(slug: string): string {
  return `medication-stock:${slug}`;
}

export function getApiBaseUrlOrNull(): string | null {
  return API_BASE_URL ?? null;
}

export function getApiHealth(): Promise<HealthResponse> {
  return fetchJson<HealthResponse>("/health");
}

export function getDbHealth(): Promise<DbHealthResponse> {
  return fetchJson<DbHealthResponse>("/health/db");
}

export function getGovernorates(): Promise<GovernorateListResponse> {
  return fetchJson<GovernorateListResponse>("/api/governorates", { revalidate: 3600 });
}

export function getPharmacies(
  governorate: string,
  options: { onDuty?: boolean; signal?: AbortSignal } = {}
): Promise<PharmacyListResponse> {
  const params = new URLSearchParams({ governorate });
  if (options.onDuty) params.set("on_duty", "true");
  return fetchJson<PharmacyListResponse>(`/api/pharmacies?${params}`, {
    revalidate: 120,
    signal: options.signal,
  });
}

export function getMedications(): Promise<MedicationListResponse> {
  return fetchJson<MedicationListResponse>("/api/medications", { revalidate: 300 });
}

export function searchMedications(
  q: string,
  signal?: AbortSignal
): Promise<MedicationSearchResponse> {
  return fetchJson<MedicationSearchResponse>(
    `/api/medications/search?q=${encodeURIComponent(q)}&limit=8`,
    { timeoutMs: 10_000, signal }
  );
}

export function getMedicationStock(
  slug: string,
  governorate: string
): Promise<MedicationStockResponse> {
  return fetchJson<MedicationStockResponse>(
    `/api/medications/${encodeURIComponent(slug)}/pharmacies?governorate=${encodeURIComponent(governorate)}`,
    { revalidate: 60, tags: [medicationStockTag(slug)] }
  );
}

export function getMedicationAvailability(slug: string): Promise<MedicationAvailabilityResponse> {
  return fetchJson<MedicationAvailabilityResponse>(
    `/api/medications/${encodeURIComponent(slug)}/availability`,
    { revalidate: 120, tags: [medicationStockTag(slug)] }
  );
}

export function getObservatory(weeks = 12): Promise<ObservatoryResponse> {
  return fetchJson<ObservatoryResponse>(`/api/observatory?weeks=${weeks}`, { revalidate: 600 });
}

export function observatoryCsvUrl(weeks = 12): string | null {
  const base = getApiBaseUrlOrNull();
  return base ? `${base}/api/observatory/export.csv?weeks=${weeks}` : null;
}

export type PatientReportStatus = "in_stock" | "out_of_stock";

export type StockReportCreated = {
  id: string;
  medication_id: string;
  medication_slug: string;
  pharmacy_id: string;
  status: StockStatus;
  reported_at: string; // ISO 8601 with offset
  reported_by: ReportSource; // always "patient" today
};

export function reportStock(
  slug: string,
  pharmacyId: string,
  status: PatientReportStatus,
  signal?: AbortSignal
): Promise<StockReportCreated> {
  return fetchJson<StockReportCreated>(
    `/api/medications/${encodeURIComponent(slug)}/pharmacies/${encodeURIComponent(pharmacyId)}/reports`,
    { method: "POST", body: { status }, timeoutMs: 60_000, signal }
  );
}

// ---------------------------------------------------------------------
// Step 5 — pharmacist auth, dashboard, toggle, and the search-view logger.
// ---------------------------------------------------------------------

export type PharmacistAccountStatus = "pending" | "active" | "rejected" | "suspended";

export type PharmacistAccount = {
  id: string;
  email: string;
  full_name: string;
  status: PharmacistAccountStatus;
  created_at: string;
  /** Admin's reason, present when rejected or suspended. */
  review_note: string | null;
};

export type PharmacistPharmacy = {
  id: string;
  name: string;
  address: string;
  city: string;
  governorate: string;
  governorate_slug: string;
  phone: string | null;
  verified: boolean;
  is_24h: boolean;
};

export type DutyKind = "night" | "weekend" | "holiday";

export type DutyShift = {
  id: string;
  kind: DutyKind;
  starts_at: string;
  ends_at: string;
};

export type DashboardMedication = Medication & {
  status: StockStatusView;
  reported_at: string | null;
  reported_by: ReportSource | null;
  searches_last_7_days: number;
};

export type PharmacistDashboardResponse = {
  account: PharmacistAccount;
  pharmacy: PharmacistPharmacy;
  medications: DashboardMedication[];
  count: number;
  stats_window_days: number;
  stats_governorate: string;
  duty_shifts: DutyShift[];
};

export type NewPharmacyProposal = {
  name: string;
  address: string;
  city: string;
  governorate_slug: string;
  lat: number;
  lng: number;
  phone: string | null;
};

export type PharmacistRegistrationInput = {
  /** Exactly one of pharmacy_id / new_pharmacy. */
  pharmacy_id: string | null;
  new_pharmacy: NewPharmacyProposal | null;
  email: string;
  full_name: string;
  phone: string;
  certificate: File;
};

export type PharmacistRegistrationCreated = {
  id: string;
  email: string;
  full_name: string;
  status: PharmacistAccountStatus;
  pharmacy_id: string;
  pharmacy_name: string;
  new_pharmacy: boolean;
};

export type PharmacistReportCreated = {
  id: string;
  medication_id: string;
  medication_slug: string;
  pharmacy_id: string;
  status: StockStatus;
  reported_at: string;
  reported_by: ReportSource;
};

/** Multipart: the certificate travels with the form. The browser sets
 *  the multipart Content-Type (with its boundary) itself. */
export async function registerPharmacist(
  input: PharmacistRegistrationInput
): Promise<PharmacistRegistrationCreated> {
  const form = new FormData();
  form.set("email", input.email);
  form.set("full_name", input.full_name);
  form.set("phone", input.phone);
  if (input.pharmacy_id) form.set("pharmacy_id", input.pharmacy_id);
  if (input.new_pharmacy) form.set("new_pharmacy", JSON.stringify(input.new_pharmacy));
  form.set("certificate", input.certificate);

  const response = await fetch(`${getApiBaseUrl()}/api/pharmacist/registrations`, {
    method: "POST",
    cache: "no-store",
    headers: { "X-Mawjoud-Client": "web" },
    body: form,
    signal: AbortSignal.timeout(90_000),
  });
  if (!response.ok) {
    throw new ApiError(response.status, `Registration failed with status ${response.status}`, await readDetail(response));
  }
  return (await response.json()) as PharmacistRegistrationCreated;
}

// ---------------------------------------------------------------------
// Admin review
// ---------------------------------------------------------------------

export type AdminRegistrationStatus = PharmacistAccountStatus | "all";
export type AdminAction = "approve" | "reject" | "suspend" | "reactivate";

export type AdminRegistration = {
  id: string;
  email: string;
  full_name: string;
  phone: string;
  status: PharmacistAccountStatus;
  created_at: string;
  reviewed_at: string | null;
  review_note: string | null;
  has_certificate: boolean;
  certificate_content_type: string | null;
  certificate_uploaded_at: string | null;
  new_pharmacy: boolean;
  pharmacy: {
    id: string;
    name: string;
    address: string;
    city: string;
    governorate: string;
    governorate_slug: string | null;
    lat: number;
    lng: number;
    phone: string | null;
    is_public: boolean;
    source: string;
    verified: boolean;
  };
};

export function getAdminMe(accessToken: string): Promise<{ email: string }> {
  return fetchJson<{ email: string }>("/api/admin/me", { accessToken, timeoutMs: 60_000 });
}

export function getAdminRegistrations(
  status: AdminRegistrationStatus,
  accessToken: string
): Promise<{ registrations: AdminRegistration[]; count: number }> {
  return fetchJson(`/api/admin/registrations?status=${status}`, { accessToken, timeoutMs: 60_000 });
}

export function getCertificateLink(
  id: string,
  accessToken: string
): Promise<{ url: string; content_type: string | null; expires_in: number }> {
  return fetchJson(`/api/admin/registrations/${encodeURIComponent(id)}/certificate`, { accessToken });
}

export function decideRegistration(
  id: string,
  action: AdminAction,
  note: string | null,
  accessToken: string
): Promise<AdminRegistration> {
  return fetchJson<AdminRegistration>(`/api/admin/registrations/${encodeURIComponent(id)}/decision`, {
    method: "POST",
    body: { action, note },
    accessToken,
  });
}

export function deleteRegistration(id: string, accessToken: string): Promise<void> {
  return fetchJson<void>(`/api/admin/registrations/${encodeURIComponent(id)}`, {
    method: "DELETE",
    accessToken,
  });
}

export function getPharmacistDashboard(
  accessToken: string
): Promise<PharmacistDashboardResponse> {
  return fetchJson<PharmacistDashboardResponse>("/api/pharmacist/dashboard", {
    accessToken,
    timeoutMs: 60_000,
  });
}

export function reportStockAsPharmacist(
  slug: string,
  status: StockStatus,
  accessToken: string
): Promise<PharmacistReportCreated> {
  return fetchJson<PharmacistReportCreated>(
    `/api/pharmacist/medications/${encodeURIComponent(slug)}/reports`,
    { method: "POST", body: { status }, accessToken, timeoutMs: 60_000 }
  );
}

/** Fire-and-forget: resolves on 204, throws on non-2xx. Every caller
 *  ignores the result — see SearchEventLogger. Uses a short 15 s timeout
 *  because nothing waits on it and a hung request on a hot page is pure
 *  waste. */
export function logMedicationView(slug: string, governorate?: string): Promise<void> {
  const query = governorate ? `?governorate=${encodeURIComponent(governorate)}` : "";
  return fetchJson<void>(`/api/medications/${encodeURIComponent(slug)}/views${query}`, {
    method: "POST",
    timeoutMs: 15_000,
  });
}

export function createDutyShift(
  input: { kind: DutyKind; starts_at: string; ends_at: string },
  accessToken: string
): Promise<DutyShift> {
  return fetchJson<DutyShift>("/api/pharmacist/duty-shifts", {
    method: "POST",
    body: input,
    accessToken,
    timeoutMs: 60_000,
  });
}

export function deleteDutyShift(id: string, accessToken: string): Promise<void> {
  return fetchJson<void>(`/api/pharmacist/duty-shifts/${encodeURIComponent(id)}`, {
    method: "DELETE",
    accessToken,
    timeoutMs: 60_000,
  });
}
