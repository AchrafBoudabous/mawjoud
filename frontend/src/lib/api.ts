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
  address: string;
  city: string;
  governorate: string;
  lat: number;
  lng: number;
  phone: string | null;
  verified: boolean;
};

export type PharmacyListResponse = { pharmacies: Pharmacy[]; count: number };

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
};
export type StockSummary = {
  in_stock: number;
  out_of_stock: number;
  unsure: number;
  none: number;
};
export type MedicationStockResponse = {
  medication: Medication;
  pharmacies: PharmacyStock[];
  count: number;
  summary: StockSummary;
};

export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
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
  method?: "GET" | "POST";
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
      : method === "POST"
        ? { cache: "no-store" as const }
        : revalidate !== undefined
          ? { next: { revalidate, ...(tags ? { tags } : {}) } }
          : { cache: "no-store" as const }),
    headers: {
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
      `Request to ${path} failed with status ${response.status}`
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

export function getApiHealth(): Promise<HealthResponse> {
  return fetchJson<HealthResponse>("/health");
}

export function getDbHealth(): Promise<DbHealthResponse> {
  return fetchJson<DbHealthResponse>("/health/db");
}

export function getPharmacies(): Promise<PharmacyListResponse> {
  return fetchJson<PharmacyListResponse>("/api/pharmacies", { revalidate: 300 });
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

export function getMedicationStock(slug: string): Promise<MedicationStockResponse> {
  return fetchJson<MedicationStockResponse>(
    `/api/medications/${encodeURIComponent(slug)}/pharmacies`,
    { revalidate: 60, tags: [medicationStockTag(slug)] }
  );
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
};

export type PharmacistPharmacy = {
  id: string;
  name: string;
  address: string;
  city: string;
  governorate: string;
  phone: string | null;
  verified: boolean;
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
};

export type PharmacistRegistrationInput = {
  pharmacy_id: string;
  email: string;
  full_name: string;
  phone: string;
};

export type PharmacistRegistrationCreated = {
  id: string;
  email: string;
  full_name: string;
  status: PharmacistAccountStatus;
  pharmacy_id: string;
  pharmacy_name: string;
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

export function registerPharmacist(
  input: PharmacistRegistrationInput
): Promise<PharmacistRegistrationCreated> {
  return fetchJson<PharmacistRegistrationCreated>("/api/pharmacist/registrations", {
    method: "POST",
    body: input,
    timeoutMs: 60_000,
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
export function logMedicationView(slug: string): Promise<void> {
  return fetchJson<void>(`/api/medications/${encodeURIComponent(slug)}/views`, {
    method: "POST",
    timeoutMs: 15_000,
  });
}
