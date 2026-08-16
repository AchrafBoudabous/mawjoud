# Mawjoud — Architecture & Build Spec

Running record of concrete, implementable decisions, one section per
build-order step from `docs/BRIEF.md`. Earlier sections are never
rewritten when a later step is specced — if a later step changes an
earlier decision, that is recorded as an amendment inside the later
step's section and cross-referenced here.

| Step | Title | Status |
| --- | --- | --- |
| 1 | Scaffold Next.js + FastAPI + Supabase; deploy skeleton end to end | Specced |
| 2 | Pharmacy directory + map view (seeded Bizerte data) | Specced |
| 3 | Medication search + stock display (read-only) | Specced |
| 4 | Public community stock reporting (no auth) | Specced |
| 5 | Pharmacist auth + dashboard + stock toggle | Specced |
| 6 | Notify-me subscriptions + Resend alerts | Not specced |
| 7 | Prescription upload + hold request flow | Not specced |
| 8 | Polish: disclaimers, mobile QA, loading/empty states | Not specced |

---

# Step 1 — Scaffold & end-to-end pipeline

**Goal:** a deployed, empty-but-real skeleton. A visitor loads the Vercel
URL, the page renders in French, and a client-side call reaches the
FastAPI service on Render, which in turn proves it can reach Supabase.
Nothing else.

## 1. Repo layout

Single Git repo, two deployable apps side by side. No workspace tooling
(no pnpm workspaces, no Turborepo) — the two apps have no shared JS code
and each platform builds its own subdirectory.

```
Mawjoud/
├── .gitignore                     # new (single root-level ignore file)
├── README.md                      # new
├── render.yaml                    # new — Render Blueprint for the API
├── CLAUDE.md                      # exists
├── docs/
│   ├── BRIEF.md                   # exists
│   └── ARCHITECTURE.md            # this file
├── backend/                       # FastAPI service (Render root dir)
│   ├── .env.example
│   ├── .python-version
│   ├── requirements.txt
│   └── app/
│       ├── __init__.py
│       ├── main.py
│       ├── config.py
│       ├── supabase_client.py
│       └── routers/
│           ├── __init__.py
│           └── health.py
└── frontend/                       # Next.js app (Vercel root dir)
    ├── .env.example
    ├── package.json
    ├── tsconfig.json
    ├── next.config.ts
    ├── postcss.config.mjs
    ├── eslint.config.mjs
    ├── next-env.d.ts
    ├── public/
    └── src/
        ├── app/
        │   ├── layout.tsx
        │   ├── page.tsx
        │   └── globals.css
        ├── components/
        │   ├── Disclaimer.tsx
        │   ├── ApiStatus.tsx
        │   └── SiteFooter.tsx
        └── lib/
            ├── api.ts
            └── i18n/
                ├── fr.ts
                └── index.ts
```

Naming is fixed: `frontend/` and `backend/` — deployment configs below
reference these exact paths.

### Root `.gitignore`

One file at the repo root covering both apps. Must include at minimum:

```
# Node / Next.js
node_modules/
.next/
out/
.vercel/
*.tsbuildinfo

# Python
__pycache__/
*.py[cod]
.venv/
venv/
.pytest_cache/
.ruff_cache/

# Env — never commit real secrets
.env
.env.*
!.env.example

# OS / editor
.DS_Store
Thumbs.db
.idea/
.vscode/
```

### Root `README.md`

Short and practical, not marketing copy. Sections:

1. One-paragraph description of Mawjoud (French-facing product, docs in
   English).
2. Stack list (copy from `docs/BRIEF.md`).
3. Repo layout (the tree above, abbreviated).
4. Local development — exact commands for `backend/` and `frontend/`, including
   creating `.env` from `.env.example`.
5. Environment variables — pointer to section 5 of this document, not a
   duplicated list.
6. Deployment — one line each for Vercel and Render, pointer to section 6.
7. A note that `docs/BRIEF.md` is the scope source of truth and
   `docs/ARCHITECTURE.md` is the per-step spec.

## 2. Next.js app (`frontend/`)

### Scaffold parameters

Generate with `create-next-app` using: TypeScript **yes**, ESLint
**yes**, Tailwind CSS **yes**, `src/` directory **yes**, App Router
**yes**, Turbopack **yes**, import alias `@/*` **yes**. Target Next.js
15.x / React 19.x, Node 22.

Add to `frontend/package.json`:

```json
"engines": { "node": ">=22.0.0" }
```

No extra runtime dependencies in this step. Do **not** install
`@supabase/supabase-js`, `leaflet`, `react-leaflet`, or any UI kit yet —
those arrive with the steps that use them.

### Tailwind configuration approach — decision

Use **Tailwind CSS v4 with CSS-first configuration**. That means:

- `frontend/postcss.config.mjs` uses the `@tailwindcss/postcss` plugin only.
- There is **no** `tailwind.config.ts` / `tailwind.config.js` file.
- `frontend/src/app/globals.css` starts with `@import "tailwindcss";` and
  declares project design tokens in an `@theme` block.

Design tokens to declare in `@theme` now, so later steps reuse them
rather than inventing colours (calm, clinical, non-flashy palette):

| Token | Value | Use |
| --- | --- | --- |
| `--color-brand-50` | `#f0f7f6` | tinted surfaces |
| `--color-brand-600` | `#0f766e` | primary actions, links |
| `--color-brand-700` | `#115e59` | hover/active |
| `--color-ink` | `#1f2937` | body text |
| `--color-muted` | `#6b7280` | secondary text |
| `--color-surface` | `#ffffff` | cards |
| `--color-canvas` | `#f8fafc` | page background |
| `--color-warn-bg` | `#fffbeb` | disclaimer background |
| `--color-warn-border` | `#fcd34d` | disclaimer border |
| `--color-warn-text` | `#92400e` | disclaimer text |

Status colours for in-stock / out-of-stock / unknown are deliberately
deferred to step 3, where the stock display is designed.

Mobile-first: every layout is written for a ~360px viewport first and
widened with `sm:` / `md:` / `lg:` modifiers. No fixed pixel widths on
containers; use `max-w-screen-sm mx-auto px-4` style constraints.

### French copy / i18n structure

Non-negotiable: no user-visible French string is hard-coded inside a
component in this or any later step. All copy lives in a typed
dictionary so a second locale (Tunisian Arabic) can be added in phase 2
without touching components.

`frontend/src/lib/i18n/fr.ts`:

```ts
export const fr = {
  common: {
    appName: "Mawjoud",
    tagline: "…",
    disclaimer: "…",
  },
  home: { /* … */ },
  apiStatus: { /* … */ },
} as const;
```

`frontend/src/lib/i18n/index.ts` exports:

- `export const defaultLocale = "fr" as const;`
- `export const locales = ["fr"] as const;`
- `export type Locale = (typeof locales)[number];`
- `export type Dictionary = typeof fr;`
- `export function getDictionary(locale: Locale = defaultLocale): Dictionary`
  — returns `fr` for every input today.

Components call `getDictionary()` with no argument for now. Locale
routing (`/[locale]/…`), a locale switcher, and an `ar` dictionary are
explicitly **out of scope for step 1**.

Required exact strings (French):

- `common.appName`: `Mawjoud`
- `common.tagline`: `Vérifiez la disponibilité de vos médicaments dans les pharmacies de Bizerte.`
- `common.disclaimer`: `Informations signalées par la communauté — il ne s'agit pas d'un flux de stock officiel ni garanti. Appelez la pharmacie avant de vous déplacer.`
- `common.footerNote`: `Mawjoud — projet en cours de construction. Aucune information médicale n'est fournie sur ce site.`
- `home.status`: `Squelette technique en ligne.`
- `home.buildNote`: `Les fonctionnalités de recherche et de signalement arrivent prochainement.`
- `apiStatus.title`: `État des services`
- `apiStatus.checking`: `Vérification en cours…`
- `apiStatus.apiOk`: `API connectée`
- `apiStatus.apiError`: `API injoignable`
- `apiStatus.dbOk`: `Base de données connectée`
- `apiStatus.dbError`: `Base de données injoignable`
- `apiStatus.retry`: `Réessayer`
- `apiStatus.coldStart`: `Le serveur gratuit peut mettre jusqu'à une minute à démarrer.`

`frontend/src/app/layout.tsx` sets `<html lang="fr">` and exports `metadata`
with `title: "Mawjoud — Disponibilité des médicaments"` and a French
`description`.

### Pages & components

**`src/app/page.tsx`** — server component, the only route. Renders, in
order:

1. `<header>` with `common.appName` as `<h1>` and `common.tagline`.
2. `<Disclaimer />`.
3. `<ApiStatus />`.
4. A short section with `home.status` and `home.buildNote`.
5. `<SiteFooter />`.

No navigation bar, no other routes, no `loading.tsx` / `error.tsx` yet
(those are step 8 polish).

**`src/components/Disclaimer.tsx`** — server component, no props.
Renders `common.disclaimer` inside a `role="note"` element styled with
the `warn-*` tokens. This component is the canonical implementation of
the brief's non-negotiable disclaimer; every patient-facing page in
later steps imports it rather than repeating the text.

**`src/components/SiteFooter.tsx`** — server component, renders
`common.footerNote`.

**`src/components/ApiStatus.tsx`** — **client component**
(`"use client"`). This is deliberate: fetching from the browser is what
actually proves CORS and public reachability of the Render service in
production. A server-side fetch would not.

Behaviour:

- On mount, and again when the retry button is pressed, call
  `getApiHealth()` and `getDbHealth()` from `@/lib/api` (in parallel via
  `Promise.allSettled`).
- Three states per check: `checking` / `ok` / `error`. Render one line
  per check with a coloured dot and the matching dictionary string.
- While `checking`, also show `apiStatus.coldStart` (Render's free tier
  spins down after inactivity and can take ~50s to wake).
- On error, show the retry button (`apiStatus.retry`).
- Never render raw error objects or URLs containing keys to the user;
  `console.error` is fine for debugging.

**`src/lib/api.ts`** — the single place that knows the backend base URL.

```ts
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;
```

- Export `getApiBaseUrl(): string` which throws a clear developer-facing
  error if `NEXT_PUBLIC_API_BASE_URL` is unset or empty.
- Export `getApiHealth(): Promise<HealthResponse>` → `GET {base}/health`.
- Export `getDbHealth(): Promise<DbHealthResponse>` → `GET {base}/health/db`.
- Both use `fetch` with `cache: "no-store"` and a 60s `AbortSignal.timeout(60_000)`
  to tolerate Render cold starts. Non-2xx responses throw.
- Export the TypeScript types `HealthResponse` and `DbHealthResponse`
  mirroring the FastAPI response models in section 3.

No other file in `frontend/` may hard-code the backend URL.

## 3. FastAPI app (`backend/`)

### Package layout & dependency management

Use a package (`app/`), not a bare `main.py`, so later steps can add
routers without restructuring. Use **`requirements.txt`** (not Poetry /
uv / pyproject) — it is what Render's Python runtime auto-detects with
zero configuration.

`backend/.python-version`:

```
3.12.7
```

`backend/requirements.txt` (pinned):

```
fastapi==0.115.6
uvicorn[standard]==0.34.0
pydantic==2.10.5
pydantic-settings==2.7.1
supabase==2.11.0
httpx>=0.27,<0.29
```

`httpx` is intentionally a range, not a pin: `supabase` constrains it
transitively and an exact pin causes resolution failures on upgrade.

### `app/config.py`

A `pydantic-settings` `Settings` class, instantiated once and exposed
via a module-level `settings` object (or an `lru_cache`d
`get_settings()` — either is fine, pick one and use it consistently).

| Field | Type | Required | Default |
| --- | --- | --- | --- |
| `supabase_url` | `str` | yes | — |
| `supabase_service_role_key` | `str` | yes | — |
| `allowed_origins` | `list[str]` | no | `["http://localhost:3000"]` |
| `allowed_origin_regex` | `str \| None` | no | `None` |
| `environment` | `str` | no | `"development"` |
| `app_version` | `str` | no | `"0.1.0"` |

- Reads from environment variables (upper-cased field names) and, in
  local dev, from `backend/.env` via `model_config = SettingsConfigDict(env_file=".env", ...)`.
- `ALLOWED_ORIGINS` is supplied as a **comma-separated string** and
  parsed into a list (strip whitespace, drop empties, drop trailing
  slashes). Do not rely on pydantic's JSON-list parsing for this env var.
- Missing required vars must fail fast at import/startup with a readable
  message — a deploy with no Supabase credentials should not boot green.

### `app/supabase_client.py`

- `get_supabase() -> Client` — creates the `supabase` client once
  (module-level singleton or `lru_cache`) from
  `settings.supabase_url` + `settings.supabase_service_role_key`.
- The backend uses the **service role key only**. It never receives or
  uses the anon key. Because the service role key bypasses RLS, no
  request-supplied value is ever interpolated into a Supabase query in
  any step without validation.

### `app/main.py`

- Creates `FastAPI(title="Mawjoud API", version=settings.app_version)`.
- Adds `CORSMiddleware` **before** including routers:
  - `allow_origins=settings.allowed_origins`
  - `allow_origin_regex=settings.allowed_origin_regex` (omit/None if unset)
  - `allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"]`
  - `allow_headers=["*"]`
  - `allow_credentials=False` (no cookie-based auth; step 5 uses bearer
    tokens — revisit there if that changes)
- Includes `app.routers.health.router`.
- Defines `GET /` returning `{"service": "mawjoud-api", "docs": "/docs"}`.
- Does **not** disable `/docs`; leaving the OpenAPI UI on is useful and
  exposes nothing sensitive at this stage.

### Endpoint contract

Route-prefix convention for the whole project, established here:
`/health*` is unprefixed (Render's health check hits it); every future
feature endpoint lives under `/api/…`. Step 1 adds no `/api/…` routes.

#### `GET /health`

Liveness. Touches nothing external, always fast.

- **Request:** no params, no body, no auth.
- **200 response** (`HealthResponse`):

```json
{
  "status": "ok",
  "service": "mawjoud-api",
  "version": "0.1.0",
  "environment": "production"
}
```

- Never returns non-200 while the process is alive.

#### `GET /health/db`

Readiness of the Supabase connection. This is the step-1 proof that the
backend really can reach the project, and it must work with **no schema
whatsoever** — there are no tables yet.

- **Request:** no params, no body, no auth.
- **Implementation:** call `get_supabase()` (proves the credentials parse
  and a client can be constructed), then issue an authenticated HTTP GET
  with `httpx` to `f"{settings.supabase_url}/rest/v1/"` with headers
  `apikey` and `Authorization: Bearer …` set to the service role key,
  `timeout=10.0`. PostgREST's root endpoint returns 200 and the OpenAPI
  description of the (currently empty) schema, so this needs no tables.
  Measure elapsed time in milliseconds.
  - Do **not** create a `health_check` table or any other table. Schema
    work starts in step 2.
- **200 response** (`DbHealthResponse`):

```json
{
  "status": "ok",
  "supabase": "reachable",
  "latency_ms": 128
}
```

- **503 response** on timeout, connection error, or non-2xx from
  Supabase:

```json
{
  "status": "error",
  "supabase": "unreachable",
  "detail": "connection timeout"
}
```

  `detail` is a short, sanitised string. It must never contain the
  service role key, the `Authorization` header, or a full stack trace.
  Log the real exception server-side. Return 503 via
  `JSONResponse(status_code=503, content=…)` or an
  `HTTPException(503, detail=…)` — if using `HTTPException`, note the
  body shape becomes `{"detail": …}`, so prefer `JSONResponse` to match
  the schema above exactly, and mirror that shape in
  `frontend/src/lib/api.ts`.

### Local run command

```
uvicorn app.main:app --reload --port 8000     # run from backend/
```

## 4. Supabase connection

### Manual prerequisite (the user does this, not the developer subagent)

Before implementation can be verified, a Supabase project must exist:

1. Create a free-tier Supabase project (suggested name `mawjoud`,
   region `eu-central-1` / Frankfurt — closest free region to Tunisia).
2. From **Project Settings → API**, copy:
   - Project URL → `SUPABASE_URL` (e.g. `https://abcdefgh.supabase.co`)
   - `anon` `public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` `secret` key → `SUPABASE_SERVICE_ROLE_KEY`
3. Do not create any tables, buckets, or auth settings yet.

If the developer subagent cannot verify `/health/db` because no project
exists, it should implement against the spec, note the blocker, and stop
— not stub the check out.

### Credential split — rule for the whole project

| Key | Where it lives | Why |
| --- | --- | --- |
| `anon` public key | Browser (Next.js, `NEXT_PUBLIC_*`) only | Safe to expose; RLS is what protects data. |
| `service_role` secret key | FastAPI on Render only | Bypasses RLS. Must never appear in `frontend/`, in any `NEXT_PUBLIC_*` var, or in a client bundle. |

Any future code that puts the service role key in the frontend is a bug,
regardless of what a later spec says.

### Frontend Supabase client — deferred

`@supabase/supabase-js` is **not** installed in step 1. The frontend
makes no Supabase calls. `NEXT_PUBLIC_SUPABASE_URL` and
`NEXT_PUBLIC_SUPABASE_ANON_KEY` are nevertheless listed in
`frontend/.env.example` and set in Vercel now, so step 2 (which reads
pharmacy data and, later, subscribes to Realtime) needs no environment
changes. Unused-at-runtime env vars are harmless; add a comment in
`.env.example` saying they are reserved for step 2.

## 5. Environment variables

Real values are never committed. Only `.env.example` files are tracked;
`.env` is gitignored (see section 1). `.env.example` files contain
placeholder values and a one-line comment per variable.

### `backend/.env.example`

| Variable | Required | Example / default | Notes |
| --- | --- | --- | --- |
| `SUPABASE_URL` | yes | `https://your-project-ref.supabase.co` | No trailing slash. |
| `SUPABASE_SERVICE_ROLE_KEY` | yes | `your-service-role-key` | Secret. Backend only. |
| `ALLOWED_ORIGINS` | yes in prod | `http://localhost:3000` | Comma-separated, no trailing slashes. In prod: the Vercel production URL (plus a custom domain later). |
| `ALLOWED_ORIGIN_REGEX` | no | `https://.*\.vercel\.app` | Lets Vercel preview deployments call the API. Leave empty to disable. |
| `ENVIRONMENT` | no | `development` | Echoed by `/health`. Render sets `production`. |
| `APP_VERSION` | no | `0.1.0` | Echoed by `/health`. |
| `PORT` | no | — | Injected by Render; do not set locally. |

### `frontend/.env.example`

| Variable | Required | Example / default | Notes |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_API_BASE_URL` | yes | `http://localhost:8000` | No trailing slash. In prod: the Render service URL. |
| `NEXT_PUBLIC_SUPABASE_URL` | reserved | `https://your-project-ref.supabase.co` | Unused in step 1; set now for step 2. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | reserved | `your-anon-key` | Unused in step 1; set now for step 2. |

Not needed until later steps, and deliberately absent from step 1:
`RESEND_API_KEY` (step 6), Supabase Storage bucket config (step 7).

## 6. Deployment

Deploy order matters — the API URL is needed to configure the frontend,
and the frontend URL is needed to configure the API's CORS.

### 6a. Render (FastAPI) — Blueprint

Use a repo-root `render.yaml` (Blueprint). It is more standard than
clicking through the dashboard and it keeps the build/start commands in
version control. Secrets stay out of it via `sync: false`.

`render.yaml`:

```yaml
services:
  - type: web
    name: mawjoud-api
    runtime: python
    plan: free
    region: frankfurt
    rootDir: api
    buildCommand: pip install -r requirements.txt
    startCommand: uvicorn app.main:app --host 0.0.0.0 --port $PORT
    healthCheckPath: /health
    autoDeploy: true
    envVars:
      - key: PYTHON_VERSION
        value: 3.12.7
      - key: ENVIRONMENT
        value: production
      - key: APP_VERSION
        value: 0.1.0
      - key: SUPABASE_URL
        sync: false
      - key: SUPABASE_SERVICE_ROLE_KEY
        sync: false
      - key: ALLOWED_ORIGINS
        sync: false
      - key: ALLOWED_ORIGIN_REGEX
        sync: false
```

Manual steps for the user: Render dashboard → **New → Blueprint** →
connect this repo → fill the four `sync: false` values. The resulting
public URL is `https://mawjoud-api.onrender.com` (Render may append a
suffix if the name is taken — whatever it is, that value is what goes
into `NEXT_PUBLIC_API_BASE_URL`).

Known free-tier behaviour to design around, not fight: the service
sleeps after ~15 minutes idle and the next request can take ~50 seconds.
That is why `ApiStatus` shows `apiStatus.coldStart` and `api.ts` uses a
60s timeout.

### 6b. Vercel (Next.js) — dashboard

No `vercel.json` needed. In the Vercel dashboard: **Add New → Project** →
import this repo → set **Root Directory** to `web` (this is the critical
monorepo setting; framework preset auto-detects as Next.js) → add the
three `NEXT_PUBLIC_*` environment variables from section 5 to the
Production, Preview, and Development scopes → Deploy.

### 6c. Wiring order

1. Push the repo to GitHub.
2. Create the Supabase project (section 4) and collect the three values.
3. Deploy Render with `ALLOWED_ORIGINS=http://localhost:3000` initially.
   Note the resulting API URL.
4. Deploy Vercel with `NEXT_PUBLIC_API_BASE_URL` = that API URL. Note the
   resulting production URL.
5. Update `ALLOWED_ORIGINS` on Render to the Vercel production URL
   (comma-append `http://localhost:3000` to keep local dev working
   against the deployed API if desired) and set `ALLOWED_ORIGIN_REGEX`
   to `https://.*\.vercel\.app`. Render redeploys on env change.

### 6d. Acceptance test — "the pipeline works end to end"

Step 1 is done when **all** of the following pass.

Local:

1. `cd api && uvicorn app.main:app --reload --port 8000`; `curl http://localhost:8000/health`
   returns 200 with `status: "ok"`.
2. `curl http://localhost:8000/health/db` returns 200 with
   `supabase: "reachable"`.
3. `cd web && npm run dev`; `http://localhost:3000` renders the French
   landing page, the disclaimer is visible without scrolling on a 360px
   viewport, and `ApiStatus` shows both green lines.
4. `npm run build` and `npm run lint` in `frontend/` both succeed with no
   errors.

Production:

5. The Vercel production URL loads the landing page over HTTPS, in
   French, with `<html lang="fr">`.
6. On that deployed page, `ApiStatus` — running in the browser, against
   the Render service — resolves to `apiStatus.apiOk` **and**
   `apiStatus.dbOk` (allowing one cold-start retry). The browser
   devtools Network tab shows two cross-origin requests to the
   `onrender.com` host returning 200 with no CORS error.
7. Temporarily removing the Vercel origin from `ALLOWED_ORIGINS` makes
   those requests fail with a CORS error — confirming the allowlist is
   actually enforced and not wide open. Restore it afterwards.
8. `view-source` / the JS bundle on the deployed site contains no
   `service_role` key (grep the built output for the key's first 12
   characters).

Item 6 is the real deliverable: browser → Vercel → Render → Supabase,
proven in production.

## 7. Explicit non-goals for step 1

Do not build, and do not "just quickly add", any of the following. They
belong to later steps and building them now breaks the build discipline
in `CLAUDE.md`.

- **No database schema.** No tables, no enums, no `pg_trgm`, no
  migrations, no seed data, no RLS policies. `/health/db` deliberately
  works against an empty database. (Schema begins in step 2.)
- **No auth.** No Supabase Auth configuration, no magic links, no login
  page, no protected routes, no pharmacist accounts.
- **No storage.** No buckets, no upload UI.
- **No Realtime** subscriptions.
- **No maps.** Leaflet is not installed.
- **No search**, no medication list, no stock display, no reporting UI,
  no subscriptions, no Resend integration, no prescription requests.
- **No routes beyond `/`** in Next.js. No `/pharmacies`, no `/recherche`,
  no API routes in Next.js (`app/api/…`) — the backend is FastAPI.
- **No `/api/…` endpoints** in FastAPI beyond the two health routes.
- **No locale routing**, no Arabic dictionary — only the i18n structure
  from section 2.
- **No component library**, no custom fonts beyond the Next.js default,
  no animation library, no analytics, no error-tracking SDK.
- **No tests** beyond the manual acceptance checks in 6d. A test harness
  is worth adding later; it is not step 1.

## 8. Decisions recorded in this step

Choices the brief left open, decided here and binding on later steps
unless amended:

1. `frontend/` + `backend/` directory names; single repo; no JS workspace tooling.
2. Tailwind v4 CSS-first config, no `tailwind.config.ts`; design tokens
   in `@theme` in `globals.css`.
3. All user-visible copy in a typed dictionary under
   `frontend/src/lib/i18n/`; French only for now; no locale routing yet.
4. `requirements.txt` over Poetry/uv; Python 3.12.7.
5. FastAPI route convention: `/health*` unprefixed, features under
   `/api/…`.
6. Backend holds the service role key exclusively; the browser only ever
   gets the anon key.
7. CORS via explicit `ALLOWED_ORIGINS` allowlist plus an optional
   `ALLOWED_ORIGIN_REGEX` for Vercel previews; `allow_credentials=False`.
8. Render via `render.yaml` Blueprint; Vercel via dashboard Root
   Directory = `web`, no `vercel.json`.
9. Frontend calls the backend only through `frontend/src/lib/api.ts`.
10. `Disclaimer.tsx` is the single canonical implementation of the
    community-data disclaimer.

## 9. Open questions for the user (non-blocking for step 1)

None of these block implementation; they need answers before the steps
noted.

- **Custom domain / final Vercel project name** — affects
  `ALLOWED_ORIGINS`. Fine to defer; the brief says start on the free
  Vercel subdomain.
- **Supabase region** — this spec assumes Frankfurt. If the project is
  created elsewhere, nothing breaks, but latency to Tunisia is worse.
- **Contact channel for patients in the hold-request flow** (email vs
  phone number) — needed before step 7, not now.

---

# Step 2 — Pharmacy directory + map view (seeded Bizerte data)

**Goal:** a patient opens `/pharmacies` and sees every seeded Bizerte
pharmacy as a list *and* on an OpenStreetMap map, with the disclaimer
visible. Name, address, phone. Nothing about medications, nothing about
stock, no login, no writes of any kind.

This is the first step with a real database schema, so the decisions in
sections 2.1 and 2.2 are load-bearing for steps 3–7.

## 2.0 The architectural fork: who reads Supabase?

Step 1 left this open (`@supabase/supabase-js` was "reserved for step 2").

**Decision: the frontend does NOT talk to Supabase. All reads go
`browser/Vercel → FastAPI → Supabase`, exactly like `/health/db` did.
`@supabase/supabase-js` is still not installed in `frontend/`. The anon key
stays unused.**

Why:

1. **Consistency with step 1.** `frontend/src/lib/api.ts` is already "the
   single place that knows the backend". One data path is simpler to
   reason about than two, and step 1's CORS/allowlist work already
   covers it.
2. **Later steps need a server anyway.** Step 3's fuzzy search is a
   `pg_trgm` query best expressed as SQL/RPC with ranking logic; step 4's
   anonymous stock reporting needs rate limiting and abuse heuristics
   that cannot live in the browser; step 6 must call Resend with a secret
   key; step 7 needs signed upload URLs. If the browser reads directly,
   we end up with a split brain where some features are RLS-enforced and
   some are FastAPI-enforced. Pick one now.
3. **RLS gets radically simpler.** With no browser access, every table in
   the project can be `enable row level security` with **zero policies**
   (deny-all), and the service-role backend is the only reader/writer.
   That is a much smaller security surface to get right than hand-writing
   anon policies per table, and it means a leaked anon key exposes
   nothing.
4. **Scraping.** A public anon key with a `select` policy on
   `pharmacies` + (later) `stock_reports` is a free, complete export of
   the dataset — which *is* the product.

Accepted cost and its mitigation:

- Render's free tier sleeps after ~15 min and can take ~50 s to wake.
  Mitigated by fetching in a **React Server Component with ISR**
  (`revalidate = 300`), so Vercel serves cached HTML to users and only
  the background revalidation pays the cold start. The existing 60 s
  `AbortSignal.timeout` in `api.ts` covers a cold start that happens
  during a Vercel build.

**Known future exception, not decided here:** Supabase Realtime (brief:
"Realtime for live stock status updates on the frontend") genuinely
requires a browser↔Supabase websocket and cannot be proxied through
FastAPI. When step 3 or 4 specs Realtime, that spec must decide whether
to (a) install `@supabase/supabase-js` for the *realtime channel only*
while all HTTP reads stay on FastAPI, or (b) drop Realtime for polling.
Until then the anon key remains unused. Amend `frontend/.env.example`'s
comment from "reserved for step 2" to "reserved for a possible Realtime
channel in a later step; unused today".

## 2.1 Database: migration tooling and file layout

There is no migration tooling yet. Introduce the **files** now without
introducing the **CLI** dependency:

```
Mawjoud/
└── supabase/                       # new
    ├── README.md                   # how to apply, in what order
    ├── migrations/
    │   └── 20260813120000_create_pharmacies.sql
    └── seed.sql
```

- Plain `.sql` files, applied **manually via the Supabase SQL Editor**
  (or `psql "$SUPABASE_DB_URL" -f <file>` if the user prefers). The
  Supabase CLI is deliberately **not** added: local `supabase start`
  needs Docker, which is heavier than this project currently justifies.
- File names nevertheless follow the Supabase CLI convention
  (`migrations/<YYYYMMDDHHMMSS>_<name>.sql`, `seed.sql` at the
  `supabase/` root) so adopting `supabase db push` later is a no-op.
- Every migration must be **re-runnable** (`create ... if not exists`,
  `create or replace`, `drop trigger if exists`). Nobody is tracking
  which migrations have run, so idempotency is the safety net.
- `supabase/README.md` states: apply migrations in filename order, then
  `seed.sql`; never edit a migration that has already been applied to the
  hosted project — add a new one.

## 2.2 Schema: `public.pharmacies`

### Primary key strategy — `uuid`, project-wide

`uuid` with `gen_random_uuid()` (built into Postgres 13+, so no
`pgcrypto` extension needed on Supabase). **All tables in this project
use `uuid` primary keys and `uuid` foreign keys.** Reason: step 4 lets
anonymous users write `stock_reports` and step 7 gives patients
`prescription_requests` whose ids will appear in URLs and emails.
Sequential `bigint` ids leak row counts and make enumeration trivial.
Mixing key types across tables is worse than either choice, so this is
fixed here.

### Migration — `supabase/migrations/20260813120000_create_pharmacies.sql`

```sql
-- Step 2 — pharmacy directory. First real schema in the project.

-- Shared trigger helper; reused by every future table with updated_at.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.pharmacies (
  id           uuid         primary key default gen_random_uuid(),
  name         text         not null,
  address      text         not null,
  city         text         not null default 'Bizerte',
  governorate  text         not null default 'Bizerte',
  lat          numeric(9,6) not null,
  lng          numeric(9,6) not null,
  phone        text,
  verified     boolean      not null default false,
  created_at   timestamptz  not null default now(),
  updated_at   timestamptz  not null default now(),

  constraint pharmacies_name_not_blank    check (length(btrim(name)) > 0),
  constraint pharmacies_address_not_blank check (length(btrim(address)) > 0),
  constraint pharmacies_city_not_blank    check (length(btrim(city)) > 0),
  constraint pharmacies_lat_tunisia       check (lat between 30 and 38),
  constraint pharmacies_lng_tunisia       check (lng between 7 and 12),
  constraint pharmacies_phone_tn_e164     check (phone is null or phone ~ '^\+216[0-9]{8}$')
);

comment on table public.pharmacies is
  'Pharmacies shown in the Mawjoud directory. Read only through the FastAPI backend (service role). RLS denies anon/authenticated entirely.';
comment on column public.pharmacies.phone is
  'Canonical E.164 Tunisian number, no spaces (e.g. +21672431210). Formatting for display happens in the frontend.';
comment on column public.pharmacies.verified is
  'True only once a human has confirmed the pharmacy exists and its details are correct. All seed rows are false.';

-- Guards against duplicate manual seeding / re-seeding typos.
create unique index if not exists pharmacies_name_address_uniq
  on public.pharmacies (lower(btrim(name)), lower(btrim(address)));

drop trigger if exists pharmacies_set_updated_at on public.pharmacies;
create trigger pharmacies_set_updated_at
  before update on public.pharmacies
  for each row execute function public.set_updated_at();

alter table public.pharmacies enable row level security;

-- Intentionally ZERO policies. RLS on + no policies = anon and
-- authenticated see and write nothing. The service role bypasses RLS, so
-- the FastAPI backend is unaffected. Revoking the grants Supabase issues
-- by default makes the same intent explicit at the privilege layer.
revoke all on table public.pharmacies from anon, authenticated;
```

### Column notes / deviations from the brief's rough model

| Column | Decision |
| --- | --- |
| `lat` / `lng` | `numeric(9,6)`, not `float8`. 6 decimal places ≈ 11 cm — far more than a street address needs, and exact decimal storage means the value round-trips unchanged. Precision 9 fits `±180.000000`. |
| `phone` | Nullable in the schema (a future pharmacist self-registration might arrive incomplete) but **every seed row has one**, and the check constraint enforces the `+216XXXXXXXX` shape. The frontend must handle `null`. |
| `city` | **Added**, not in the brief. `governorate = 'Bizerte'` covers Menzel Jemil, Zarzouna, Menzel Abderrahmane etc.; the brief's step-6 `subscriptions` table needs "area/city", and the list UI reads better grouped by locality. Cheap to add now, annoying to backfill later. |
| `governorate` | Kept, default `'Bizerte'`. It is the expansion axis (Tunis, Sfax…) once the MVP validates. |
| `verified` | Kept, defaults `false`. **No UI treatment in step 2** — see 2.8. |
| `created_at` / `updated_at` | **Added.** Standard on every table from here on. |

### Indexes

Primary key + the `name/address` unique index only.

Explicitly **not** added: any lat/lng index, PostGIS, `earthdistance`,
`pg_trgm`. Step 2 issues exactly one query — "give me all rows" — and
there are ~12 of them. Geospatial querying ("pharmacies near me",
ordering by distance) is deferred; when it arrives, it gets its own
migration and its own justification.

## 2.3 Seed data — `supabase/seed.sql`

**12 pharmacies.** Enough for a map that looks like a real city (clusters
downtown, a few outliers across the bay and in the surrounding towns),
few enough to eyeball for correctness.

**Important honesty constraint, and it must be reflected in the file's
header comment:** these are *plausible demo rows using real Bizerte
streets and localities*, not a verified business registry. The phone
numbers are syntactically valid Tunisian landlines but are **not real
numbers** — they must not be presented to users as callable in a public
launch. Every row therefore has `verified = false`, and section 2.8
forbids any "verified" badge in the UI. Replacing this with sourced,
confirmed data is a prerequisite for going public, not for step 2.

All coordinates fall inside the Bizerte area (lat 37.22–37.29,
lng 9.83–9.92).

Fixed UUIDs are used so the seed is idempotent and so future manual
`stock_reports` fixtures can reference stable pharmacy ids.

```sql
-- supabase/seed.sql
-- DEMO DATA. Real Bizerte streets/localities, but the pharmacies, phone
-- numbers and coordinates are approximate/fictional placeholders for
-- development. Every row is verified = false. Replace with sourced,
-- human-confirmed data before any public launch.
-- Idempotent: safe to re-run.

insert into public.pharmacies
  (id, name, address, city, governorate, lat, lng, phone, verified)
values
  ('00000000-0000-4000-8000-000000000001', 'Pharmacie du Vieux Port',        '12 Quai Tarak Ibn Ziad, Vieux Port',            'Bizerte',              'Bizerte', 37.278900, 9.871300, '+21672431210', false),
  ('00000000-0000-4000-8000-000000000002', 'Pharmacie Habib Bourguiba',      '34 Avenue Habib Bourguiba',                     'Bizerte',              'Bizerte', 37.274600, 9.873700, '+21672431455', false),
  ('00000000-0000-4000-8000-000000000003', 'Pharmacie de la Corniche',       'Route de la Corniche, face au Jardin Public',   'Bizerte',              'Bizerte', 37.283500, 9.864100, '+21672432880', false),
  ('00000000-0000-4000-8000-000000000004', 'Pharmacie El Andalous',          '8 Rue d''Espagne',                              'Bizerte',              'Bizerte', 37.276100, 9.872200, '+21672433117', false),
  ('00000000-0000-4000-8000-000000000005', 'Pharmacie Ben Ammar',            '21 Avenue d''Algérie',                          'Bizerte',              'Bizerte', 37.273800, 9.870900, '+21672434502', false),
  ('00000000-0000-4000-8000-000000000006', 'Pharmacie Bab Mateur',           'Avenue Taieb Mhiri, Bab Mateur',                'Bizerte',              'Bizerte', 37.272200, 9.861700, '+21672435940', false),
  ('00000000-0000-4000-8000-000000000007', 'Pharmacie Ennour',               'Cité Bougatfa 2, Rue de l''Environnement',      'Bizerte',              'Bizerte', 37.266500, 9.860400, '+21672436773', false),
  ('00000000-0000-4000-8000-000000000008', 'Pharmacie Ibn Khaldoun',         '5 Rue Ibn Khaldoun, Centre-ville',              'Bizerte',              'Bizerte', 37.275400, 9.868800, '+21672437264', false),
  ('00000000-0000-4000-8000-000000000009', 'Pharmacie Zarzouna Centre',      'Avenue de la République, Zarzouna',             'Zarzouna',             'Bizerte', 37.254700, 9.876800, '+21672590214', false),
  ('00000000-0000-4000-8000-000000000010', 'Pharmacie Sidi Salem',           'Route de Sidi Salem, Zarzouna',                 'Zarzouna',             'Bizerte', 37.258800, 9.898100, '+21672591386', false),
  ('00000000-0000-4000-8000-000000000011', 'Pharmacie Sidi Ahmed',           'Avenue de l''Indépendance, Sidi Ahmed',         'Bizerte',              'Bizerte', 37.250400, 9.833400, '+21672592470', false),
  ('00000000-0000-4000-8000-000000000012', 'Pharmacie Menzel Jemil',         'Avenue Habib Bourguiba, Menzel Jemil',          'Menzel Jemil',         'Bizerte', 37.237100, 9.914500, '+21672491638', false)
on conflict (id) do update set
  name        = excluded.name,
  address     = excluded.address,
  city        = excluded.city,
  governorate = excluded.governorate,
  lat         = excluded.lat,
  lng         = excluded.lng,
  phone       = excluded.phone,
  verified    = excluded.verified;
```

(Note the doubled apostrophes in `Rue d''Espagne`, `Avenue d''Algérie`,
`Rue de l''Environnement`, `Avenue de l''Indépendance` — SQL escaping,
not typos. The stored values contain single apostrophes.)

## 2.4 API surface

### New files

```
backend/app/
├── main.py                     # modified: include the new router
├── routers/
│   └── pharmacies.py           # new
└── schemas/                    # new package
    ├── __init__.py
    └── pharmacy.py
```

A `schemas/` package is introduced now (rather than inline Pydantic
models) because steps 3–7 add several models each; establishing the
location once avoids a later refactor. A `services/` layer is *not*
introduced — this endpoint is one query. Introduce it when step 3's
search logic makes routers unwieldy.

### `backend/app/schemas/pharmacy.py`

```python
from uuid import UUID

from pydantic import BaseModel


class Pharmacy(BaseModel):
    id: UUID
    name: str
    address: str
    city: str
    governorate: str
    lat: float
    lng: float
    phone: str | None
    verified: bool


class PharmacyListResponse(BaseModel):
    pharmacies: list[Pharmacy]
    count: int
```

`lat`/`lng` are `float` in the API even though they are `numeric` in
Postgres: JSON has no decimal type, and 6 dp survives a float64 round
trip exactly enough for map rendering. `created_at`/`updated_at` are
deliberately **not** exposed — nothing in the UI uses them.

An **envelope** (`{pharmacies, count}`) is used rather than a bare JSON
array so pagination/filter metadata can be added later without a
breaking change. This is the convention for all list endpoints in the
project.

### `GET /api/pharmacies`

- **Router:** `APIRouter(prefix="/api/pharmacies", tags=["pharmacies"])`,
  handler registered at `""`. Follows step 1's rule: features live under
  `/api/…`.
- **Auth:** none. Public.
- **Query params:** none. No `?city=`, no `?q=`, no pagination — filtering
  by medication is step 3, and 12 rows do not need pages. Adding unused
  params now is speculative.
- **Handler is `def`, not `async def`** — `supabase-py`'s client is
  synchronous, so FastAPI must run it in the threadpool. Same pattern as
  `health_db`.
- **Query:**

```python
get_supabase()
    .table("pharmacies")
    .select("id,name,address,city,governorate,lat,lng,phone,verified")
    .order("name")
    .execute()
```

  Explicit column list, never `select("*")`, so adding a private column
  later cannot silently leak it. `order("name")` gives a deterministic,
  alphabetical list that matches the UI order.
- **200 response** (`PharmacyListResponse`):

```json
{
  "pharmacies": [
    {
      "id": "00000000-0000-4000-8000-000000000005",
      "name": "Pharmacie Ben Ammar",
      "address": "21 Avenue d'Algérie",
      "city": "Bizerte",
      "governorate": "Bizerte",
      "lat": 37.2738,
      "lng": 9.8709,
      "phone": "+21672434502",
      "verified": false
    }
  ],
  "count": 12
}
```

- **Response header:** `Cache-Control: public, max-age=300`. Harmless,
  and it lets Vercel/CDN layers do the right thing without extra config.
- **503 on Supabase failure.** Catch the exception, `logger.exception`
  the real error server-side, and raise
  `HTTPException(status_code=503, detail="pharmacy directory temporarily unavailable")`.

  **Error convention for every `/api/…` endpoint, established here:**
  errors use FastAPI's default `HTTPException`, so the body is
  `{"detail": "<short, sanitised, English, developer-facing string>"}`.
  User-facing French copy is the frontend's job, chosen per HTTP status —
  never rendered from `detail`. (`/health/db`'s hand-rolled
  `{status, supabase, detail}` shape stays as-is; it predates this rule
  and is not an `/api/…` route.)
- `detail` must never contain the service role key, a Supabase URL with
  credentials, or a stack trace.

### `backend/app/main.py` change

Import `pharmacies` alongside `health` and add
`app.include_router(pharmacies.router)`. Nothing else changes — CORS
already allows `GET`.

## 2.5 Frontend: routing and data access

### Route

**New route `/pharmacies`.** `/` stays the landing page. Rationale: step
3 turns the home page into the medication search, which is the actual
product entry point; making the directory the home page now would just
have to be undone.

`/` gets one change: the step-1 "coming soon" section gains a link to
`/pharmacies` (`home.ctaPharmacies`), styled as a prominent button using
`brand-600`. `ApiStatus` **stays on `/` for now** — step 1's production
acceptance test depends on it; removing it is step 8 polish.

### New/changed files in `frontend/`

```
frontend/src/
├── app/
│   ├── page.tsx                        # modified: CTA link to /pharmacies
│   ├── globals.css                     # modified: two Leaflet interop rules
│   └── pharmacies/
│       ├── page.tsx                    # new — async Server Component
│       └── loading.tsx                 # new — plain "Chargement…" text
├── components/
│   ├── PharmacyDirectory.tsx           # new — CLIENT, owns list/map layout + state
│   ├── PharmacyList.tsx                # new
│   ├── PharmacyListItem.tsx            # new
│   ├── ViewToggle.tsx                  # new — CLIENT, mobile Liste/Carte switch
│   ├── PharmacyMap.tsx                 # new — CLIENT, dynamic(ssr:false) wrapper
│   └── PharmacyMapInner.tsx            # new — CLIENT, the actual react-leaflet tree
└── lib/
    ├── api.ts                          # modified: fetch options + getPharmacies()
    ├── geo.ts                          # new — Bizerte map constants
    ├── format.ts                       # new — formatPhone()
    └── i18n/fr.ts                      # modified: new copy keys
```

`PharmacyList` and `PharmacyListItem` have **no** `"use client"`
directive but are imported by a client component, so they end up in the
client bundle. That is fine and intentional — they are pure
presentational functions with no server-only imports. Do not add
`"use client"` to them; do not try to keep them server-rendered.

### `frontend/src/lib/api.ts` — modification

Extend `fetchJson` with an options argument so callers can opt into ISR
instead of step 1's `no-store`. Step 1's two health functions keep their
exact current behaviour.

```ts
type FetchOptions = {
  /** Seconds of ISR caching. Omit for `cache: "no-store"`. */
  revalidate?: number;
  /** Defaults to 60_000 to tolerate Render cold starts. */
  timeoutMs?: number;
};
```

- When `revalidate` is set, pass `next: { revalidate }`; otherwise pass
  `cache: "no-store"`. Never both — Next.js errors on the combination.
- New exported types, mirroring section 2.4 exactly:

```ts
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
```

- `export function getPharmacies(): Promise<PharmacyListResponse>` →
  `GET {base}/api/pharmacies` with `{ revalidate: 300 }`.

No component may fetch the backend except through `api.ts`.

### `frontend/src/lib/geo.ts`

```ts
export const BIZERTE_CENTER: [number, number] = [37.2744, 9.8739];
export const BIZERTE_DEFAULT_ZOOM = 13;
export const BIZERTE_FOCUS_ZOOM = 16;
export const OSM_TILE_URL = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
export const OSM_MAX_ZOOM = 19;
```

Use the subdomain-less `tile.openstreetmap.org` host — the old
`{s}.tile.openstreetmap.org` form is deprecated.

### `frontend/src/lib/format.ts`

```ts
export function formatPhone(phone: string): string
```

`"+21672431210"` → `"+216 72 431 210"`. If the input does not match
`^\+216\d{8}$`, return it unchanged rather than throwing.
`tel:` hrefs use the raw unformatted value.

### `frontend/src/app/pharmacies/page.tsx`

Async Server Component.

```ts
export const revalidate = 300;
export const metadata: Metadata = { title: "Pharmacies de Bizerte — Mawjoud", description: … };
```

Render order (mirrors `/`'s structure and container classes):

1. `<header>`: a `<Link href="/">` back-link (`nav.home`), `<h1>`
   `pharmacies.title`, `<p>` `pharmacies.subtitle`.
2. `<Disclaimer />` — the step-1 component, imported unchanged. Placed
   here, above the content, so it is on screen without scrolling at
   360px. It must **not** be nested inside the scrollable list panel.
3. The data region (below).
4. `<SiteFooter />`.

Container: `mx-auto flex min-h-screen w-full max-w-screen-sm flex-col gap-6 px-4 py-8 md:max-w-6xl`
— wider than `/` because of the side-by-side desktop layout.

Data region logic:

```
try { const data = await getPharmacies(); }
catch  → render <p role="alert"> pharmacies.error </p>
         plus <a href="/pharmacies"> pharmacies.retry </a>  (plain anchor = full reload)
data.count === 0 → render <p> pharmacies.empty </p>, no map
otherwise        → <PharmacyDirectory pharmacies={data.pharmacies} />
```

The `try/catch` is required: without it a Render cold start during a
Vercel build fails the build. With it, the build succeeds and ISR
regenerates a good page within 300 s. (`error.tsx` boundaries are step 8.)

### `frontend/src/app/pharmacies/loading.tsx`

Deliberately minimal — no skeletons, that is step 8. A centred
`<p className="py-12 text-center text-muted">{dict.pharmacies.loading}</p>`
inside the same container classes.

## 2.6 Frontend: list view

### `PharmacyDirectory.tsx` (client)

Props: `{ pharmacies: Pharmacy[] }`.

State:
- `view: "list" | "map"`, default `"list"` (mobile-first: the list is
  useful without waiting for tiles).
- `selectedId: string | null`, default `null`.

Layout — exact Tailwind behaviour:

```tsx
<div className="flex flex-col gap-4">
  <ViewToggle view={view} onChange={setView} className="md:hidden" />
  <p className="text-sm text-muted">{dict.pharmacies.count(pharmacies.length)}</p>

  <div className="flex flex-col gap-4 md:flex-row md:items-start md:gap-6">
    {/* list panel */}
    <div className={`${view === "list" ? "block" : "hidden"} md:block md:w-2/5 md:max-h-[70vh] md:overflow-y-auto`}>
      <PharmacyList … />
    </div>

    {/* map panel */}
    <div className={`${view === "map" ? "block" : "hidden"} md:block md:w-3/5 md:sticky md:top-4`}>
      <PharmacyMap … />
    </div>
  </div>
</div>
```

**Decision on the list/map relationship:**
- `< md` (mobile, the default): **one at a time**, switched by
  `ViewToggle`. A 360 px screen cannot usefully show both, and stacking
  them means the map is always below the fold.
- `≥ md`: **side by side**, list left at 2/5 with its own scroll, map
  right at 3/5 and `sticky` so it stays in view while the list scrolls.
  The toggle is `md:hidden` — on desktop both are always rendered.

Both panels are always **mounted**, only `display`-toggled. That keeps
the Leaflet instance alive across toggles (remounting refetches tiles),
at the cost of one `invalidateSize()` call — see 2.7.

### `ViewToggle.tsx` (client)

Props: `{ view, onChange, className? }`. A two-button segmented control,
not a `<select>`. Semantics: a `<div role="group" aria-label={dict.pharmacies.viewToggleLabel}>`
containing two `<button type="button" aria-pressed={…}>` with labels
`pharmacies.viewList` / `pharmacies.viewMap`. Active button uses
`bg-brand-600 text-white`, inactive `bg-surface text-ink border`. Touch
targets at least 44 px tall.

### `PharmacyList.tsx`

Props: `{ pharmacies, selectedId, onSelect }`. Renders
`<ul className="flex flex-col gap-3">` of `PharmacyListItem`. No
grouping by city in this step (12 rows do not need it).

### `PharmacyListItem.tsx`

Props: `{ pharmacy, isSelected, onSelect }`. An `<li>` card:
`rounded-lg border bg-surface p-4` and, when `isSelected`,
`border-brand-600 ring-1 ring-brand-600` (otherwise a neutral border).

Fields shown, in order:

1. `<h3 className="font-semibold text-ink">` — `pharmacy.name`
2. `<p className="text-sm text-muted">` — `pharmacy.address`
3. `<p className="text-sm text-muted">` — `pharmacy.city` (only rendered
   when `city !== "Bizerte"`, so the outlying towns stand out without 8
   redundant "Bizerte" lines)
4. Phone: if present, `<a href={"tel:" + pharmacy.phone}>`
   `{formatPhone(pharmacy.phone)}` styled `text-brand-600 underline`,
   preceded by the `pharmacies.call` label; if `null`, `pharmacies.noPhone`
   in `text-muted`.
5. `<button type="button" onClick={() => onSelect(pharmacy.id)}
   className="md:hidden …">` `pharmacies.showOnMap` — mobile only,
   because on desktop the map is already visible and selection happens
   by clicking the item card.

Not shown: `verified` (see 2.8), `lat`/`lng`, `governorate`, distance,
opening hours, stock.

## 2.7 Frontend: map view

### Packages to install (in `frontend/`)

```
leaflet@1.9.4
react-leaflet@5.0.0
-D @types/leaflet@1.9.22
```

`react-leaflet@5` is the version whose peer deps are `react@^19` /
`react-dom@^19` / `leaflet@^1.9` — v4 peers on React 18 and will not
install cleanly against this project's React 19.1.0. Do not use
`--legacy-peer-deps` to force v4.

`leaflet` itself has no React dependency and needs no API key or account
for OSM tiles.

### SSR gotchas — read this before writing the components

These are the things that break, in the order people hit them:

1. **Leaflet touches `window` at import time.** Any module that
   transitively imports `leaflet` must never be evaluated during SSR or
   the build will fail with `ReferenceError: window is not defined`.
2. **`next/dynamic` with `ssr: false` is not allowed inside a Server
   Component in the App Router** (Next.js 15 throws at build time). So
   the file that *calls* `dynamic()` must itself carry `"use client"`.
   This is why there are two map files:
   - `PharmacyMap.tsx` — `"use client"`, does nothing but
     `dynamic(() => import("./PharmacyMapInner"), { ssr: false, loading: () => <MapPlaceholder /> })`
     and forward its props.
   - `PharmacyMapInner.tsx` — `"use client"`, contains every
     `react-leaflet` / `leaflet` import.
   Do not merge them; do not `dynamic()`-import from
   `app/pharmacies/page.tsx`.
3. **Leaflet's stylesheet must be imported**, or the map renders as a
   pile of unpositioned tiles: `import "leaflet/dist/leaflet.css";` at
   the top of `PharmacyMapInner.tsx`.
4. **Default marker icons break under bundlers** (Leaflet resolves
   `marker-icon.png` relative to the CSS and gets a 404). The usual
   `delete L.Icon.Default.prototype._getIconUrl` hack is not used here.
   Instead use an `L.divIcon` with an inline SVG pin — no image requests,
   no CDN dependency, and it can use the project's brand colour.
5. **`.leaflet-div-icon` has a default white background and grey
   border.** It must be overridden or every marker is a white square.
6. **Tailwind Preflight vs Leaflet images.** Leaflet 1.9's CSS carries
   `!important` rules for this, but add the defensive rule below anyway.
7. **A `display:none` container gives Leaflet a 0×0 canvas.** Because the
   mobile toggle hides the map panel rather than unmounting it, the map
   must be told to re-measure when it becomes visible — see
   `InvalidateSizeOnShow` below.

### `globals.css` addition

Appended after the existing `body` rule:

```css
/* Leaflet interop */
.leaflet-container img {
  max-width: none;
}
.mawjoud-marker {
  background: transparent;
  border: 0;
}
```

### `PharmacyMap.tsx` (client)

```tsx
"use client";
// dynamic(..., { ssr: false }) — only legal because this file is a client component
```

Props: identical to `PharmacyMapInner`'s. The `loading` fallback renders
a div with the same height classes as the map and the centred string
`pharmacies.mapLoading`, so the layout does not jump.

### `PharmacyMapInner.tsx` (client)

Props: `{ pharmacies: Pharmacy[]; selectedId: string | null; isVisible: boolean }`.

Wrapper element:

```tsx
<div
  role="region"
  aria-label={dict.pharmacies.mapAriaLabel}
  className="h-[60vh] min-h-80 w-full overflow-hidden rounded-lg border md:h-[70vh]"
>
  <MapContainer className="h-full w-full" … />
</div>
```

`MapContainer` props:

- Framing: when `pharmacies.length > 0`, pass
  `bounds={L.latLngBounds(pharmacies.map(p => [p.lat, p.lng]))}` and
  `boundsOptions={{ padding: [24, 24], maxZoom: 15 }}` so the whole
  dataset frames itself on any viewport. Otherwise fall back to
  `center={BIZERTE_CENTER} zoom={BIZERTE_DEFAULT_ZOOM}`. Build the props
  as a spread object — passing both `bounds` and `center` is invalid.
- `scrollWheelZoom={false}` — prevents the map from hijacking page scroll
  on mobile. Zoom is via the default `+`/`−` control.
- Do not use `whenCreated` (removed in react-leaflet v4+); reach the map
  instance through `useMap()` in a child component.

Children:

1. `<TileLayer url={OSM_TILE_URL} maxZoom={OSM_MAX_ZOOM} attribution={…} />`.
   Attribution is **mandatory** under the OSM tile usage policy. Use the
   HTML string
   `'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'`,
   stored in the dictionary as `pharmacies.osmAttribution`.
2. One `<Marker key={p.id} position={[p.lat, p.lng]} icon={markerIcon} />`
   per pharmacy, each wrapping a `<Popup>`.
3. `<FlyToSelected selectedId={selectedId} pharmacies={pharmacies} />`
4. `<InvalidateSizeOnShow isVisible={isVisible} />`

Popup content — name, address, phone only. No stock status (there is no
stock data in the database yet), no directions link, no photo:

```tsx
<Popup>
  <strong>{p.name}</strong>
  <span>{p.address}</span>
  {p.phone && <a href={`tel:${p.phone}`}>{formatPhone(p.phone)}</a>}
</Popup>
```

Marker icon — created once with `useMemo(() => L.divIcon({...}), [])`:

```ts
L.divIcon({
  className: "mawjoud-marker",
  html: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 32" width="24" height="32" aria-hidden="true"><path d="M12 0C5.4 0 0 5.4 0 12c0 8.4 12 20 12 20s12-11.6 12-20C24 5.4 18.6 0 12 0z" fill="#0f766e"/><circle cx="12" cy="12" r="4.5" fill="#ffffff"/></svg>',
  iconSize: [24, 32],
  iconAnchor: [12, 32],
  popupAnchor: [0, -30],
})
```

`#0f766e` is `--color-brand-600` from step 1. It is hard-coded here
because the value goes into an SVG string, not a class — add a comment
pointing at the token so the two stay in sync.

Two tiny internal components, defined in the same file (they are
implementation details, not shared UI):

```tsx
function FlyToSelected({ selectedId, pharmacies }) {
  const map = useMap();
  useEffect(() => {
    if (!selectedId) return;
    const p = pharmacies.find((x) => x.id === selectedId);
    if (p) map.flyTo([p.lat, p.lng], BIZERTE_FOCUS_ZOOM);
  }, [selectedId, pharmacies, map]);
  return null;
}

function InvalidateSizeOnShow({ isVisible }) {
  const map = useMap();
  useEffect(() => {
    if (!isVisible) return;
    const t = setTimeout(() => map.invalidateSize(), 0);
    return () => clearTimeout(t);
  }, [isVisible, map]);
  return null;
}
```

`PharmacyDirectory` passes `isVisible={view === "map"}`. On desktop the
map is always visible, so pass `isVisible={true}`… except the component
cannot know the breakpoint. Simplest correct behaviour: pass
`isVisible={view === "map"}` and additionally run `invalidateSize()` once
on mount (the `setTimeout(…, 0)` above already handles the desktop case
because the effect runs on mount when `view === "list"` is false only on
mobile — so also run an unconditional mount-time `invalidateSize()`).
Concretely: keep the `isVisible` effect **and** add a second
`useEffect(() => { map.invalidateSize(); }, [map])`.

Auto-opening a marker's popup when its list item is selected is
**deferred** — it needs marker refs and adds no information the fly-to
does not already convey.

### Contingency

If `next dev --turbopack` or `next build` fails to bundle
`react-leaflet` v5 (ESM-only), add to `frontend/next.config.ts`:

```ts
transpilePackages: ["react-leaflet", "@react-leaflet/core"],
```

Only add it if a real error appears; do not add it pre-emptively.

## 2.8 `verified` — no UI in this step

`verified` exists in the schema and is returned by the API, but **nothing
in the UI renders it.** Reasoning: 100 % of current rows are
`verified = false` demo data (2.3). A "verified" badge would either be
absent everywhere (dead code) or, worse, an "unverified" warning on every
single pharmacy, which reads as "this whole site is untrustworthy" and
fights the calm/trustworthy design requirement. The badge earns its place
in step 5, when pharmacist registration produces genuinely verified rows
to contrast against.

## 2.9 French copy — additions to `frontend/src/lib/i18n/fr.ts`

No user-visible string may be hard-coded in a component (step 1 rule,
still binding).

**Extension to the i18n pattern, decided here:** a dictionary value may
be a **function** when the copy takes a parameter. Never build strings by
concatenation in a component. French pluralisation differs from English —
0 and 1 both take the singular.

```ts
common: { /* unchanged */ },
nav: {
  home: "← Accueil",
},
home: {
  /* existing keys unchanged */
  ctaPharmacies: "Voir les pharmacies de Bizerte",
},
pharmacies: {
  title: "Pharmacies de Bizerte",
  subtitle:
    "Annuaire des pharmacies de la région de Bizerte. La recherche de médicaments arrive prochainement.",
  count: (n: number) => `${n} pharmacie${n > 1 ? "s" : ""}`,
  loading: "Chargement des pharmacies…",
  error:
    "Impossible de charger la liste des pharmacies pour le moment.",
  retry: "Réessayer",
  empty: "Aucune pharmacie n'est enregistrée pour le moment.",
  viewToggleLabel: "Choisir l'affichage",
  viewList: "Liste",
  viewMap: "Carte",
  showOnMap: "Voir sur la carte",
  call: "Téléphone",
  noPhone: "Téléphone non renseigné",
  mapAriaLabel: "Carte des pharmacies de Bizerte",
  mapLoading: "Chargement de la carte…",
  osmAttribution:
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
},
```

`Dictionary = typeof fr` already picks up the function type; `getDictionary`
needs no change.

## 2.10 Acceptance test — step 2 is done when all of these pass

Database:

1. The migration applies cleanly to the hosted Supabase project, and
   re-applying it is a no-op (no errors).
2. `seed.sql` applies, `select count(*) from public.pharmacies` = 12, and
   re-running it still yields 12.
3. Inserting a row with `lat = 9.87, lng = 37.27` (swapped) is rejected by
   `pharmacies_lng_tunisia`.
4. Inserting `phone = '72431210'` is rejected by `pharmacies_phone_tn_e164`.
5. Querying the table from the **Supabase SQL editor's anon role**
   (`set local role anon; select * from public.pharmacies;`) returns no
   rows / permission denied — proving RLS + the revoke are in force.

API:

6. `GET http://localhost:8000/api/pharmacies` returns 200, `count == 12`,
   rows sorted by `name`, and no `created_at` / `updated_at` fields.
7. `/docs` shows the endpoint with the `PharmacyListResponse` schema.
8. With `SUPABASE_URL` pointed at an unreachable host, the endpoint
   returns 503 with `{"detail": "pharmacy directory temporarily unavailable"}`
   and no key material anywhere in the body.

Frontend, local:

9. `npm run build` and `npm run lint` succeed — in particular the build
   does **not** fail with `window is not defined` (proves the
   `ssr: false` split is right).
10. At a 360 px viewport, `/pharmacies` shows: back-link, title, the
    disclaimer *without scrolling*, the Liste/Carte toggle, and the 12
    cards. Tapping "Carte" shows a correctly sized map — not a grey box
    and not a sliver (proves `invalidateSize`).
11. All 12 markers appear as teal pins (not broken images, not white
    squares) and tapping one opens a popup with name, address and a
    tappable phone number.
12. Tapping "Voir sur la carte" on the Menzel Jemil card switches to the
    map and flies to it.
13. At ≥ 768 px, list and map are side by side, the toggle is hidden, the
    map stays put while the list scrolls.
14. OSM attribution is visible in the map's bottom-right corner.
15. With the FastAPI server stopped, `/pharmacies` renders the French
    error message and a working retry link — not a stack trace, not a
    blank page.

Production:

16. The Vercel deployment of `/pharmacies` renders the full list and map
    over HTTPS.
17. The browser Network tab shows **no requests to `*.supabase.co`** from
    the page — confirming the 2.0 decision holds in the shipped bundle.

## 2.11 Explicit non-goals for step 2

- **No medications.** No `medications` table, no medication list, no
  search input, no `pg_trgm`. (Step 3.)
- **No stock.** No `stock_reports` table, no status colours, no "confirmé
  il y a 2 h" timestamps, no status legend. The map markers are all
  identical on purpose — there is nothing to differentiate them by yet.
- **No reporting UI.** No "j'ai trouvé / pas trouvé" buttons. (Step 4.)
- **No auth**, no `pharmacist_accounts`, no protected routes. (Step 5.)
- **No `@supabase/supabase-js` in `frontend/`**, no Realtime, no anon-key
  usage.
- **No writes at all.** `GET` is the only method on the new endpoint; the
  frontend never POSTs.
- **No geolocation.** No "pharmacies near me", no browser
  `navigator.geolocation`, no distance sorting, no PostGIS.
- **No filtering, searching or sorting** of the directory — 12 rows,
  alphabetical.
- **No `verified` badge.** (2.8.)
- **No opening hours / pharmacie de garde.** Not in the brief; it is what
  the competitors do and the brief explicitly positions against it.
- **No marker clustering** (`react-leaflet-cluster`), no custom map
  tiles, no geocoder.
- **No skeleton loaders, no `error.tsx` boundaries, no empty-state
  illustrations** — plain text states only. (Step 8.)
- **No Supabase CLI**, no ORM, no Alembic, no migration runner.
- **No tests.** Still manual acceptance only.

## 2.12 Decisions recorded in this step

Binding on later steps unless explicitly amended:

1. **All Supabase access goes through FastAPI.** The browser never calls
   Supabase over HTTP. Realtime is the one flagged possible exception,
   to be decided in step 3 or 4.
2. **Every table gets RLS enabled with zero policies** (deny-all for
   `anon`/`authenticated`), plus an explicit
   `revoke all ... from anon, authenticated`. The service role is the
   only accessor.
3. **`uuid` primary keys everywhere**, `gen_random_uuid()` default.
4. Schema lives in `supabase/migrations/<timestamp>_<name>.sql` + a
   single `supabase/seed.sql`, applied manually, written to be
   idempotent, named to the Supabase CLI convention. No CLI dependency.
5. Every table carries `created_at` / `updated_at timestamptz not null
   default now()` with the shared `public.set_updated_at()` trigger.
6. Coordinates are `numeric(9,6)`; Tunisian phone numbers are stored E.164
   (`+216XXXXXXXX`) and formatted only at render time.
7. **List endpoints return an envelope** `{ <items>: [...], count: N }`,
   never a bare array. Column lists in Supabase queries are always
   explicit — never `select("*")`.
8. **`/api/…` errors use `HTTPException`**, body `{"detail": "<english,
   sanitised>"}`. French user-facing copy is chosen frontend-side by
   status code, never echoed from `detail`.
9. Backend-backed pages are **Server Components with ISR**
   (`revalidate = 300`) and a `try/catch` fallback, so Render cold starts
   never block a user or fail a Vercel build.
10. **Mobile = one pane with a toggle; `md:` and up = list left / sticky
    map right.** Both panes stay mounted; visibility is CSS-only.
11. Leaflet is isolated behind a `"use client"` `dynamic(..., { ssr:
    false })` wrapper (`PharmacyMap` → `PharmacyMapInner`). Markers are
    `L.divIcon` inline SVG, never Leaflet's default PNG icons.
12. **Parameterised copy is a function in the i18n dictionary**, never
    string concatenation in a component.
13. Patient-facing route naming is French-ish but URL-safe and
    unaccented: `/pharmacies`. `/` remains the landing page and becomes
    the search page in step 3.

## 2.13 Open questions for the user (non-blocking for step 2)

Step 2 can be implemented in full without answers to these.

- **Where does real pharmacy data come from?** The seed is honest demo
  data with fictional phone numbers. Options for real data: the Conseil
  National de l'Ordre des Pharmaciens de Tunisie directory, an
  OpenStreetMap `amenity=pharmacy` extract for the Bizerte governorate
  (ODbL — attribution required, and re-publishing it may make the whole
  dataset share-alike), or manual collection. **This must be settled
  before any public launch**, because publishing wrong phone numbers for
  named pharmacies is a real-world harm. Not needed to build step 2.
- **Coverage boundary: Bizerte city or Bizerte governorate?** The seed
  currently includes Zarzouna and Menzel Jemil. If the MVP should be the
  city only, drop rows 9–12 — no code changes needed.
- **Realtime (deferred fork).** Confirm at step 3/4 whether live stock
  updates are worth installing `@supabase/supabase-js` and adding
  read policies for `stock_reports`, or whether a 30–60 s poll through
  FastAPI is good enough for the MVP. The polling option keeps decision
  2.12.1 clean.
- **Should `/pharmacies` survive step 3?** Once the home page is a
  medication search whose results are pharmacies, a standalone directory
  may be redundant — or may remain useful as "browse all". Decide in
  step 3's spec.
- **Opening hours / pharmacie de garde** were not in the brief. Confirm
  they stay out; if not, `pharmacies` needs an `opening_hours` column and
  the out-of-scope list needs revisiting.

---

# Step 3 — Medication search + stock display (read-only)

**Goal:** a patient lands on `/`, types part of a medication name (typos
allowed), picks it from a suggestion list, and lands on
`/medicaments/<slug>` where all 12 Bizerte pharmacies are shown as a list
*and* on the map, each tagged **Disponible / En rupture / Incertain /
Aucun signalement** with "signalé il y a 2 heures". The disclaimer is on
every one of those pages.

**Read-only.** Nothing in this step writes to the database from the
frontend or the API. Every row of stock data comes from `seed.sql`.
Reporting is step 4, auth is step 5.

## 3.0 Two forks step 2 left open — resolved here

### 3.0.1 Realtime — declined for the MVP

Step 2 §2.0 flagged Supabase Realtime as the one possible exception to
"all Supabase access goes through FastAPI" and deferred the call to
"step 3 or 4". **Decision: no Supabase Realtime. `@supabase/supabase-js`
stays uninstalled. The anon key stays unused.** Stock freshness comes
from ISR (`revalidate = 60`) on the results page plus an ordinary browser
reload.

Reasons, in order of weight:

1. **Realtime would break decision 2.12.2.** Supabase's
   `postgres_changes` applies RLS *to the subscribing role*: a browser
   subscribed with the anon key only receives rows it could `select`.
   Making live stock updates work therefore requires a permissive
   `select` policy on `stock_reports` for `anon` — which is precisely the
   deny-all posture 2.12.2 established, and precisely the free bulk
   export of the dataset that §2.0 point 4 refused. Realtime is not a
   small addition; it forces a second, weaker security model.
2. **There is nothing to push in step 3.** No code path writes a
   `stock_report` until step 4. A Realtime channel here could not be
   demonstrated or tested — it would be untested infrastructure shipped
   on faith.
3. **The product need is speculative.** A patient reads one medication
   page for seconds to minutes. At MVP traffic the probability that a
   report lands inside that window is ~0. Live cross-tab updates are a
   feature for a busy product, not a launch requirement.
4. **Cost is real.** ~40 kB of JS on every page load, one websocket per
   visitor against a free-tier quota (200 concurrent, 2M messages/month),
   plus a second data path to secure, monitor and reason about.

**What replaces it, and when to revisit.** In step 4, after a patient
submits their own report, the frontend calls `router.refresh()` (and/or
the API triggers an on-demand `revalidatePath`) so *their* report appears
immediately — which is 95 % of the perceived need for "live". Reconsider
Realtime no earlier than step 5, and only if pharmacist dashboards create
genuine multi-writer concurrency. If it is ever adopted, it must be
adopted as "Realtime channel only, all HTTP reads still via FastAPI", and
it needs its own RLS design section.

**Consequence:** amend the comment on `NEXT_PUBLIC_SUPABASE_ANON_KEY` in
`frontend/.env.example` from "reserved for a possible Realtime channel in a
later step" to: `# Unused. Realtime was declined in step 3 (see docs/ARCHITECTURE.md 3.0.1). Kept only so the value is already configured if that decision is ever reversed.`

### 3.0.2 `/pharmacies` survives step 3

Step 2 §2.13 asked whether the standalone directory should survive once
`/` becomes a search page. **Decision: keep it, unchanged.** It is the
only way to look up a pharmacy's address and phone without knowing a
medication; it costs nothing to keep (it is already built and verified);
and step 5's pharmacist registration will link into it. It stays linked
from the home page and from the site footer, but it is no longer the
primary call to action.

## 3.1 Shape of the search flow — two API calls, one user action

The brief describes one action ("search a medication… see results as a
list + map"). Implemented as **two backend calls in one flow**, not one
combined call:

1. **Typeahead.** As the patient types (debounced, ≥ 3 characters), the
   browser calls `GET /api/medications/search?q=…` and renders a
   suggestion listbox of *medications* (name + generic name + form).
2. **Commit.** Picking a suggestion navigates to `/medicaments/<slug>`,
   a Server Component that calls
   `GET /api/medications/<slug>/pharmacies` once and renders the
   list + map.

Why not one call that returns pharmacy results for the top-ranked
medication:

- **Fuzzy matching is ambiguous and the ambiguity matters clinically.**
  "levo" matches `Levothyrox 50 µg` and `Levothyrox 100 µg`; "morphine"
  matches `Skenan LP 30 mg` and `Actiskenan 10 mg`. Silently picking the
  top hit and showing stock for it invites a patient to travel for the
  wrong dose. The patient must confirm *which* product.
- **The result must be linkable.** `/medicaments/levothyrox-50` is
  shareable, ISR-cacheable per medication, gets a real `<title>`, and is
  the URL step 6's "notify me" emails will point at. A POST-ish
  "search results" blob is none of those.
- **Cache profiles differ.** Typeahead is per-keystroke and must be
  uncached and fast-failing (10 s timeout). Results are stable for
  minutes and want ISR. Merging them forces the worse of both.

The typeahead never leaves the page and the commit is one tap, so the
user experiences a single action.

## 3.2 Migration 1 — `public.medications`

`supabase/migrations/20260814090000_create_medications.sql`

### Where pg_trgm lives — read this first

**pg_trgm must be installed in the `extensions` schema** (Supabase's
convention, and what the dashboard's Database → Extensions toggle does).
Every pg_trgm reference in this project is therefore **schema-qualified**
(`extensions.gin_trgm_ops`, `extensions.word_similarity`). Do not rely on
`search_path`.

Troubleshooting for the developer: if `\dx` (or
`select extname, nspname from pg_extension e join pg_namespace n on n.oid = e.extnamespace;`)
shows `pg_trgm` in `public`, run
`alter extension pg_trgm set schema extensions;` before applying this
migration.

### How aliases get fuzzy-searched — the schema's one hard problem

`aliases` is `text[]`, and a trigram index cannot be built on an array.
Three approaches were considered:

| Approach | Verdict |
| --- | --- |
| GIN trgm index per column (`name`, `generic_name`) | Leaves `aliases` unsearchable. Rejected. |
| **Generated column** `search_text generated always as (name \|\| ' ' \|\| array_to_string(aliases,' ')) stored` | **Does not compile.** `array_to_string`, `concat`, `concat_ws` and `format` are all `STABLE`, not `IMMUTABLE`, and Postgres rejects non-immutable generation expressions. Rejected. |
| Unnest aliases into a `medication_aliases` join table | Correct, but it turns one ranked query into a union over two tables and doubles the seed file for 26 rows. Deferred; revisit if aliases ever get managed through a UI. |
| **Trigger-maintained `search_text text` column + GIN trgm index** | **Chosen.** A plpgsql trigger has no volatility restriction, so the concatenation is trivial; the column is a plain `text` column, so the index is a plain GIN index. |

**Do not "simplify" `search_text` into a generated column.** It will fail
with `generation expression is not immutable`. The comment in the
migration says so.

Second half of the answer: **`similarity()` is the wrong operator for a
concatenated field.** `similarity(a, b)` is symmetric over whole strings,
so a short query against a long concatenation scores near zero.
**`word_similarity(needle, haystack)`** compares the needle's trigram set
against the best *continuous extent* of the haystack — exactly the
"does this short query match a word inside this text" question. It is
what this project uses everywhere, and it is what makes one denormalised
`search_text` column viable.

### Normalisation helper

Accents (`fluoxétine`, `codéine`, `rispéridone`) and punctuation
(`Néo-Mercazole`, `L-Thyroxine`) are stripped on both sides — stored text
and query text — by one shared function, so there is exactly one
definition of "the same string".

The `unaccent` extension is deliberately **not** used: `unaccent(text)`
is `STABLE`, the `unaccent(regdictionary, text)` immutable form requires
a schema-qualified dictionary reference, and it adds a second extension
for 29 characters of Latin-1. A `translate()` table is immutable, has no
dependencies, and covers every accent that appears in French drug names.

```sql
-- Step 3 — medications + fuzzy search. Requires pg_trgm in the
-- `extensions` schema (see docs/ARCHITECTURE.md 3.2).

create schema if not exists extensions;
create extension if not exists pg_trgm with schema extensions;

-- Shared text normaliser: lowercase, strip French accents, replace every
-- run of non-alphanumeric characters with a single space, trim.
-- IMMUTABLE on purpose: it is safe in indexes and generated expressions.
-- The two translate() strings MUST stay the same length (29 chars each).
create or replace function public.mawjoud_normalize(input text)
returns text
language sql
immutable
strict
set search_path = ''
as $$
  select btrim(
    regexp_replace(
      translate(
        lower(input),
        'àáâãäåçèéêëìíîïñòóôõöùúûüýÿœæ',
        'aaaaaaceeeeiiiinooooouuuuyyoa'
      ),
      '[^a-z0-9]+', ' ', 'g'
    )
  );
$$;

comment on function public.mawjoud_normalize(text) is
  'Canonical search normalisation for Mawjoud. Applied to stored medication text AND to every user query, so the two are always comparable.';

create table if not exists public.medications (
  id            uuid        primary key default gen_random_uuid(),
  slug          text        not null unique,
  name          text        not null,
  generic_name  text        not null,
  form          text,
  category      text        not null,
  aliases       text[]      not null default '{}'::text[],
  is_active     boolean     not null default true,
  search_text   text        not null default '',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),

  constraint medications_slug_format
    check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  constraint medications_name_not_blank
    check (length(btrim(name)) > 0),
  constraint medications_generic_not_blank
    check (length(btrim(generic_name)) > 0),
  constraint medications_category_allowed
    check (category in ('thyroid', 'insulin', 'psychiatric', 'cancer_pain')),
  constraint medications_aliases_no_nulls
    check (array_position(aliases, null) is null)
);

comment on table public.medications is
  'The ~26 chronic / high-shortage medications Mawjoud tracks. Reference data, curated by hand. Read only through the FastAPI backend (service role); RLS denies anon/authenticated entirely.';
comment on column public.medications.slug is
  'Stable, human-readable public identifier. It is the URL key (/medicaments/<slug>) and the API path key. The uuid remains the internal FK and the write key.';
comment on column public.medications.form is
  'Presentation as dispensed, e.g. "Comprimé sécable, boîte de 30". Displayed verbatim; never parsed.';
comment on column public.medications.aliases is
  'Brand variants, generic spellings and common misspellings. Feeds search_text only — never displayed.';
comment on column public.medications.search_text is
  'DENORMALISED. Maintained by the medications_set_search_text trigger; never write it by hand. It is mawjoud_normalize(name || generic_name || aliases) and exists purely to back the GIN trigram index. It cannot be a GENERATED column: array_to_string() is STABLE, not IMMUTABLE.';

-- Keeps search_text in step with the columns it derives from.
create or replace function public.medications_set_search_text()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.search_text := public.mawjoud_normalize(
    coalesce(new.name, '') || ' ' ||
    coalesce(new.generic_name, '') || ' ' ||
    coalesce(array_to_string(new.aliases, ' '), '')
  );
  return new;
end;
$$;

drop trigger if exists medications_set_search_text on public.medications;
create trigger medications_set_search_text
  before insert or update of name, generic_name, aliases
  on public.medications
  for each row execute function public.medications_set_search_text();

drop trigger if exists medications_set_updated_at on public.medications;
create trigger medications_set_updated_at
  before update on public.medications
  for each row execute function public.set_updated_at();

-- The fuzzy-search index. Backs both `word_similarity` filtering and
-- `like '%…%'` containment on search_text.
create index if not exists medications_search_text_trgm
  on public.medications using gin (search_text extensions.gin_trgm_ops);

-- Cheap ordering support for the "all tracked medications" endpoint.
create index if not exists medications_category_name
  on public.medications (category, name)
  where is_active;

alter table public.medications enable row level security;

-- Intentionally ZERO policies (decision 2.12.2).
revoke all on table public.medications from anon, authenticated;
grant select on table public.medications to service_role;
```

### Column notes / deviations from the brief's rough model

| Column | Decision |
| --- | --- |
| `slug` | **Added.** Public URL and API key (`/medicaments/levothyrox-50`). Shareable, readable, and stable enough for step 6's email links. The `uuid` stays the internal FK and the step-4 write key — decision 2.12.3 is not weakened, it is complemented. |
| `form` | **Added**, nullable. Tunisian patients think in presentations ("stylo", "comprimé sécable"), and it disambiguates two rows with the same brand. Display-only. |
| `category` | **Added**, `text` + check constraint (not an enum — see 3.3). Drives the "tracked medications" browse list and its French headings. Values are exactly the brief's four shortage areas. |
| `is_active` | **Added.** Lets a medication be retired from search without deleting rows that `stock_reports` still references. Every seed row is `true`. |
| `aliases` | Kept as `text[]`, `not null default '{}'`. Never displayed. |
| `search_text` | **Added.** Denormalised; see above. |

### Granularity — one row per brand + presentation

`Levothyrox 50 µg` and `Levothyrox 100 µg` are two rows; `Levothyrox
25/75/125/150 µg` are **not** tracked. Splitting every strength triples
the reporting burden on pharmacists in step 5 for little patient benefit
at MVP scale. Revisit once real pharmacists are using the dashboard.

## 3.3 Migration 2 — `public.stock_reports`

`supabase/migrations/20260814090100_create_stock_reports.sql`

### Enum vs check constraint — the precedent

There is no existing pattern, so this decision is the precedent:

- **Native Postgres enum types** for closed domain vocabularies that
  behave like a state machine and are shared across tables and steps:
  `stock_status`, `report_source`, and later
  `prescription_request_status`. Type safety at the storage layer means a
  typo'd status can never enter the table from *any* path, including a
  hand-run SQL statement.
- **`text` + `check` constraint** for taxonomies that are expected to
  grow as coverage widens: `medications.category`, and later a
  governorate or area list. Adding a value is a one-line constraint
  replacement rather than `alter type … add value` plus its transaction
  caveats.

Enums are created idempotently through a `do $$ … $$` guard, since there
is no `create type if not exists`.

### Current status is derived, not stored — confirmed

**There is no `current_stock` table and no `status` column on
`pharmacies` or `medications`.** The current status of a
(pharmacy, medication) pair is, by definition, *the most recent row in
`stock_reports` for that pair* — and "no row" is itself a meaningful
state ("Aucun signalement"). `stock_reports` is **append-only**: reports
are historical facts, never edited, never deleted. This matches the
brief's flow exactly (reports accumulate, latest wins) and it means
step 4 needs nothing but an `insert`.

The efficient "latest per pair" query is `distinct on` / a `lateral`
top-1 backed by a composite index whose trailing column is
`reported_at desc` — spelled out in 3.4.

Cost of not materialising a current-state table: one index lookup per
(pharmacy, medication) pair rendered. At 12 pharmacies × 26 medications
that is at most 312 lookups for a full table scan of the view, and 12 for
a real request. Materialising is premature.

```sql
-- Step 3 — community stock reports. Append-only; the latest row per
-- (pharmacy, medication) IS the current status. See ARCHITECTURE.md 3.3.

do $$
begin
  if not exists (
    select 1 from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where t.typname = 'stock_status' and n.nspname = 'public'
  ) then
    create type public.stock_status as enum ('in_stock', 'out_of_stock', 'unsure');
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1 from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where t.typname = 'report_source' and n.nspname = 'public'
  ) then
    create type public.report_source as enum ('patient', 'pharmacist');
  end if;
end
$$;

create table if not exists public.stock_reports (
  id            uuid                 primary key default gen_random_uuid(),
  pharmacy_id   uuid                 not null references public.pharmacies(id)  on delete cascade,
  medication_id uuid                 not null references public.medications(id) on delete cascade,
  status        public.stock_status  not null,
  reported_by   public.report_source not null,
  reported_at   timestamptz          not null default now(),
  created_at    timestamptz          not null default now(),
  updated_at    timestamptz          not null default now(),

  constraint stock_reports_not_in_future
    check (reported_at <= now() + interval '5 minutes')
);

comment on table public.stock_reports is
  'Append-only log of community stock reports. The most recent row per (pharmacy_id, medication_id) is the current status; absence of a row means "no report yet". Never update or delete rows. Read/written only through the FastAPI backend (service role).';
comment on column public.stock_reports.reported_at is
  'When the observation was made. This is what the UI displays ("signalé il y a 2 heures"). created_at is the row insert time and exists only for audit; the two are equal for every report the app writes.';
comment on column public.stock_reports.reported_by is
  'Who observed it. Every step-3 seed row is ''patient'' — no pharmacist accounts exist until step 5.';

-- THE index for step 3's read pattern: "for medication X, the latest
-- report per pharmacy". Equality on medication_id, then ordered by
-- pharmacy_id, then reported_at desc — exactly a `distinct on
-- (pharmacy_id) … order by pharmacy_id, reported_at desc` plan, and
-- exactly the lateral top-1 in the view.
create index if not exists stock_reports_medication_pharmacy_recent
  on public.stock_reports (medication_id, pharmacy_id, reported_at desc);

drop trigger if exists stock_reports_set_updated_at on public.stock_reports;
create trigger stock_reports_set_updated_at
  before update on public.stock_reports
  for each row execute function public.set_updated_at();

alter table public.stock_reports enable row level security;

revoke all on table public.stock_reports from anon, authenticated;
grant select, insert on table public.stock_reports to service_role;
```

Notes:

- `on delete cascade` on both FKs: a deleted pharmacy or medication has
  no meaningful reports. Neither is deleted in practice
  (`medications.is_active` is the soft-delete path).
- `updated_at` + trigger are kept for consistency with decision 2.12.5
  even though the table is append-only and the value will never change.
  Consistency beats a one-table exception.
- **The mirror index `(pharmacy_id, medication_id, reported_at desc)`**
  is what step 5's pharmacist dashboard ("latest per medication for *my*
  pharmacy") will need. It is deliberately **not** created here — step 5
  adds it in its own migration, with its own justification.
- Step 4 will add abuse-control columns (a coarse reporter fingerprint,
  a rate-limit surface). They are deliberately absent here; step 3 never
  inserts.

## 3.4 Migration 3 — status view + search function

`supabase/migrations/20260814090200_create_stock_views_and_functions.sql`

Two database objects, because `supabase-py` speaks PostgREST and
PostgREST cannot express `distinct on` or trigram ranking:

- the **view** `public.pharmacy_medication_status` — a plain filtered
  read, so it keeps step 2's `.table().select().eq().order()` idiom;
- the **function** `public.search_medications(q, max_results)` — takes a
  parameter that shapes ranking, so it must be an RPC.

```sql
-- Step 3 — derived read surfaces. See docs/ARCHITECTURE.md 3.4.

-- One row per (active medication × pharmacy), annotated with the most
-- recent stock report for that pair, or 'none' when there is no report.
-- The cross join is what produces the "no reports yet" rows: a left join
-- from stock_reports alone could never show a pharmacy that has never
-- been reported on.
create or replace view public.pharmacy_medication_status as
select
  m.id                             as medication_id,
  p.id                             as pharmacy_id,
  p.name                           as pharmacy_name,
  p.address                        as address,
  p.city                           as city,
  p.governorate                    as governorate,
  p.lat                            as lat,
  p.lng                            as lng,
  p.phone                          as phone,
  p.verified                       as verified,
  coalesce(r.status::text, 'none') as status,
  r.reported_at                    as reported_at,
  r.reported_by::text              as reported_by,
  r.id                             as report_id
from public.medications m
cross join public.pharmacies p
left join lateral (
  select sr.id, sr.status, sr.reported_by, sr.reported_at
  from public.stock_reports sr
  where sr.medication_id = m.id
    and sr.pharmacy_id   = p.id
  order by sr.reported_at desc, sr.id desc
  limit 1
) r on true
where m.is_active;

comment on view public.pharmacy_medication_status is
  'Derived current stock status. status is the enum value of the latest report cast to text, or the synthetic value ''none'' when no report exists. Invariant: status = ''none'' if and only if reported_at is null. Always query with a medication_id filter.';

alter view public.pharmacy_medication_status set (security_invoker = on);

revoke all on public.pharmacy_medication_status from anon, authenticated;
grant select on public.pharmacy_medication_status to service_role;

-- Fuzzy medication search.
--
-- Filtering uses word_similarity(), not similarity(): search_text is a
-- concatenation of name + generic_name + aliases, and plain similarity()
-- of a short query against a long string is always near zero.
-- word_similarity() scores the query against the best continuous extent
-- of the target, which is the question actually being asked.
--
-- Ranking is computed per field rather than against search_text, so a
-- brand-name hit outranks an alias hit at equal similarity. The weights
-- (1.00 name / 0.95 generic / 0.90 alias / 0.35 substring floor) and the
-- 0.4 candidate threshold are tuning constants — change them here, not
-- in application code.
create or replace function public.search_medications(
  q           text,
  max_results integer default 8
)
returns table (
  id           uuid,
  slug         text,
  name         text,
  generic_name text,
  form         text,
  category     text,
  score        real
)
language sql
stable
set search_path = ''
as $$
  with normalised as (
    select public.mawjoud_normalize(coalesce(q, '')) as q_norm
  ),
  candidates as (
    select
      m.id, m.slug, m.name, m.generic_name, m.form, m.category,
      greatest(
        extensions.word_similarity(n.q_norm, public.mawjoud_normalize(m.name)),
        0.95 * extensions.word_similarity(n.q_norm, public.mawjoud_normalize(m.generic_name)),
        0.90 * coalesce((
          select max(extensions.word_similarity(n.q_norm, public.mawjoud_normalize(a)))
          from unnest(m.aliases) as a
        ), 0),
        case when m.search_text like '%' || n.q_norm || '%' then 0.35 else 0 end
      )::real as score
    from public.medications m
    cross join normalised n
    where m.is_active
      and length(n.q_norm) >= 3
      and (
        m.search_text like '%' || n.q_norm || '%'
        or extensions.word_similarity(n.q_norm, m.search_text) >= 0.4
      )
  )
  select id, slug, name, generic_name, form, category, score
  from candidates
  order by score desc, name asc
  limit least(greatest(coalesce(max_results, 8), 1), 25);
$$;

comment on function public.search_medications(text, integer) is
  'Trigram medication search. Returns at most max_results (1..25) matches ordered by descending relevance. Queries shorter than 3 normalised characters return zero rows.';

-- CREATE FUNCTION grants EXECUTE to PUBLIC by default, which would let
-- anyone holding the anon key call this over PostgREST RPC.
revoke all on function public.search_medications(text, integer) from public, anon, authenticated;
grant execute on function public.search_medications(text, integer) to service_role;

revoke all on function public.mawjoud_normalize(text) from public, anon, authenticated;
grant execute on function public.mawjoud_normalize(text) to service_role;
```

### Behaviour of the search function — worked examples

| Query | Normalised | Matches | Why |
| --- | --- | --- | --- |
| `levotyrox` | `levotyrox` | `Levothyrox 50 µg`, `Levothyrox 100 µg` | `word_similarity` ≈ 0.62 against the `levothyrox` extent — one missing letter. |
| `levo` | `levo` | both Levothyrox rows | Prefix extent scores ≈ 0.8. |
| `Néo-Mercazole` | `neo mercazole` | `Néo-Mercazole 5 mg` | Both sides lose the accent and the hyphen. |
| `fluoxetine` | `fluoxetine` | `Prozac 20 mg` | Matches the alias and the de-accented `fluoxétine`. |
| `insu` | `insu` | all 7 insulins | Substring floor + high word similarity. |
| `doliprane` | `doliprane` | *(none)* | Not tracked. The frontend says so explicitly and points at the browse list. |
| `ab` | `ab` | *(none)* | Under the 3-character floor; returns zero rows, not an error. |

### PostgREST gotchas the developer will hit

1. **Schema cache.** A brand-new table, view or function is invisible to
   PostgREST until it reloads. Symptoms: `PGRST205` ("Could not find the
   table 'public.pharmacy_medication_status' in the schema cache") or
   `PGRST202` (same for the function). Supabase reloads automatically on
   DDL, usually within seconds; if it does not, run
   `notify pgrst, 'reload schema';` in the SQL editor.
2. **RPC arguments are matched by name.** The dict passed to `.rpc()`
   must use exactly `q` and `max_results`. A misspelt key produces
   `PGRST202`, not a Python error.
3. `supabase-py`'s `.rpc()` issues a POST. That is correct for a `stable`
   function and needs no configuration.
4. Views are addressed with `.table("pharmacy_medication_status")` — to
   PostgREST a view is just another resource.

### `supabase/README.md` update

Add the three new files to the ordered "How to apply" list, after
`20260813120000_create_pharmacies.sql`, and add one line to the Rules
section: *"pg_trgm must live in the `extensions` schema; every reference
to it in this project is schema-qualified."*

## 3.5 Seed data — append to `supabase/seed.sql`

**Append two new blocks to the existing file. Do not rewrite or reorder
the pharmacies block** — it is applied and verified. Order matters:
pharmacies → medications → stock_reports (FK dependencies).

### 3.5.1 Medications — 26 rows

Honesty constraint, to be stated in the file's block comment exactly as
step 2 did for pharmacies: **these are real products commonly dispensed
in Tunisia, but the presentations, box sizes and the assumption that each
is currently marketed locally are illustrative and unverified.** A
pharmacist must review this list before any public launch — a patient
travelling for a product that does not exist in Tunisia is a real-world
harm. The aliases deliberately include plausible misspellings so the
trigram search has something meaningful to match.

Fixed UUIDs, `10000000-0000-4000-8000-0000000000NN`, so `stock_reports`
can reference stable ids and the seed stays idempotent. (Pharmacies use
the `00000000-…` prefix; medications use `10000000-…`; stock reports use
`20000000-…`. Keeping the prefixes distinct makes hand-written fixtures
readable.)

Coverage: 4 thyroid, 7 insulin, 9 psychiatric, 6 cancer-pain = 26, inside
the brief's 20–30 band.

```sql
-- ---------------------------------------------------------------------
-- Step 3 — tracked medications.
-- DEMO/REFERENCE DATA. These are real products commonly dispensed in
-- Tunisia, but presentations, box sizes and current local availability
-- are illustrative and NOT verified. Have a pharmacist review this list
-- before any public launch. Aliases include deliberate misspellings so
-- the pg_trgm search has realistic input.
-- search_text is filled by the medications_set_search_text trigger —
-- never set it here.
-- Idempotent: safe to re-run.
-- ---------------------------------------------------------------------

insert into public.medications
  (id, slug, name, generic_name, form, category, aliases)
values
  ('10000000-0000-4000-8000-000000000001', 'levothyrox-50',       'Levothyrox 50 µg',              'Lévothyroxine sodique',            'Comprimé sécable, boîte de 30',                          'thyroid',     array['levotyrox','levothirox','levo thyrox','l-thyroxine','euthyrox 50','levothyroxine']),
  ('10000000-0000-4000-8000-000000000002', 'levothyrox-100',      'Levothyrox 100 µg',             'Lévothyroxine sodique',            'Comprimé sécable, boîte de 30',                          'thyroid',     array['levotyrox 100','levothirox 100','l-thyroxine 100','levothyroxine 100']),
  ('10000000-0000-4000-8000-000000000003', 'euthyral',            'Euthyral',                      'Lévothyroxine + liothyronine',     'Comprimé sécable, boîte de 30',                          'thyroid',     array['euthyrale','eutiral','euthyral t3 t4']),
  ('10000000-0000-4000-8000-000000000004', 'neo-mercazole-5',     'Néo-Mercazole 5 mg',            'Carbimazole',                      'Comprimé, boîte de 100',                                 'thyroid',     array['neomercazole','neo mercazol','mercazole','carbimazol']),
  ('10000000-0000-4000-8000-000000000005', 'lantus-solostar',     'Lantus SoloStar 100 UI/mL',     'Insuline glargine',                'Stylo prérempli 3 mL, boîte de 5',                       'insulin',     array['lantous','lantus solo star','glargine','lantis']),
  ('10000000-0000-4000-8000-000000000006', 'novorapid-flexpen',   'NovoRapid FlexPen 100 UI/mL',   'Insuline asparte',                 'Stylo prérempli 3 mL, boîte de 5',                       'insulin',     array['novo rapid','novorapide','nova rapid','asparte']),
  ('10000000-0000-4000-8000-000000000007', 'humalog-kwikpen',     'Humalog KwikPen 100 UI/mL',     'Insuline lispro',                  'Stylo prérempli 3 mL, boîte de 5',                       'insulin',     array['humalogue','humalog kwik pen','lispro']),
  ('10000000-0000-4000-8000-000000000008', 'insulatard-penfill',  'Insulatard Penfill 100 UI/mL',  'Insuline humaine isophane (NPH)',  'Cartouche 3 mL, boîte de 5',                             'insulin',     array['insulatarde','insulatard nph','insulatar']),
  ('10000000-0000-4000-8000-000000000009', 'actrapid-penfill',    'Actrapid Penfill 100 UI/mL',    'Insuline humaine rapide',          'Cartouche 3 mL, boîte de 5',                             'insulin',     array['actrapide','actrapid hm','actrapid']),
  ('10000000-0000-4000-8000-000000000010', 'mixtard-30-penfill',  'Mixtard 30 Penfill 100 UI/mL',  'Insuline humaine biphasique 30/70','Cartouche 3 mL, boîte de 5',                             'insulin',     array['mixtard 30 70','mixtar','mixtard hm']),
  ('10000000-0000-4000-8000-000000000011', 'levemir-flexpen',     'Levemir FlexPen 100 UI/mL',     'Insuline détémir',                 'Stylo prérempli 3 mL, boîte de 5',                       'insulin',     array['levemire','detemir','levimir']),
  ('10000000-0000-4000-8000-000000000012', 'zoloft-50',           'Zoloft 50 mg',                  'Sertraline',                       'Comprimé pelliculé, boîte de 28',                        'psychiatric', array['zolof','sertralin','sertraline 50','zoloft 50mg']),
  ('10000000-0000-4000-8000-000000000013', 'seroplex-10',         'Seroplex 10 mg',                'Escitalopram',                     'Comprimé pelliculé, boîte de 28',                        'psychiatric', array['seroplexe','ceroplex','escitalopram 10','cipralex']),
  ('10000000-0000-4000-8000-000000000014', 'prozac-20',           'Prozac 20 mg',                  'Fluoxétine',                       'Gélule, boîte de 28',                                    'psychiatric', array['prosac','fluoxetine','fluoxetine 20','prozac 20mg']),
  ('10000000-0000-4000-8000-000000000015', 'risperdal-2',         'Risperdal 2 mg',                'Rispéridone',                      'Comprimé pelliculé, boîte de 20',                        'psychiatric', array['risperidone','rispéridal','risperdale','risperdal 2mg']),
  ('10000000-0000-4000-8000-000000000016', 'zyprexa-10',          'Zyprexa 10 mg',                 'Olanzapine',                       'Comprimé pelliculé, boîte de 28',                        'psychiatric', array['ziprexa','olanzapine 10','zyprexa 10mg']),
  ('10000000-0000-4000-8000-000000000017', 'haldol-5',            'Haldol 5 mg',                   'Halopéridol',                      'Comprimé, boîte de 30',                                  'psychiatric', array['aldol','haloperidol','haldole','haloperidol 5']),
  ('10000000-0000-4000-8000-000000000018', 'depakine-chrono-500', 'Dépakine Chrono 500 mg',        'Valproate de sodium',              'Comprimé à libération prolongée, boîte de 30',           'psychiatric', array['depakine','depakine chrono','valproate','depakin']),
  ('10000000-0000-4000-8000-000000000019', 'teralithe-400',       'Téralithe 400 mg LP',           'Carbonate de lithium',             'Comprimé à libération prolongée, boîte de 30',           'psychiatric', array['teralite','lithium','teralithe lp','carbonate de lithium']),
  ('10000000-0000-4000-8000-000000000020', 'rivotril-2',          'Rivotril 2 mg',                 'Clonazépam',                       'Comprimé sécable, boîte de 30',                          'psychiatric', array['rivotrile','clonazepam','rivotril 2mg']),
  ('10000000-0000-4000-8000-000000000021', 'skenan-lp-30',        'Skenan LP 30 mg',               'Sulfate de morphine',              'Gélule à libération prolongée, boîte de 14',             'cancer_pain', array['skenane','morphine lp','sulfate de morphine','skenan 30']),
  ('10000000-0000-4000-8000-000000000022', 'actiskenan-10',       'Actiskenan 10 mg',              'Sulfate de morphine',              'Gélule à libération immédiate, boîte de 14',             'cancer_pain', array['actiskenane','morphine rapide','acti skenan']),
  ('10000000-0000-4000-8000-000000000023', 'durogesic-25',        'Durogésic 25 µg/h',             'Fentanyl transdermique',           'Dispositif transdermique, boîte de 5',                   'cancer_pain', array['durogesic','fentanyl','patch fentanyl','durogesique']),
  ('10000000-0000-4000-8000-000000000024', 'oxycontin-lp-10',     'OxyContin LP 10 mg',            'Oxycodone',                        'Comprimé à libération prolongée, boîte de 28',           'cancer_pain', array['oxycontine','oxycodone','oxy contin']),
  ('10000000-0000-4000-8000-000000000025', 'topalgic-lp-100',     'Topalgic LP 100 mg',            'Tramadol',                         'Comprimé à libération prolongée, boîte de 30',           'cancer_pain', array['topalgique','tramadol','contramal','topalgic 100']),
  ('10000000-0000-4000-8000-000000000026', 'dafalgan-codeine',    'Dafalgan Codéiné',              'Paracétamol + codéine',            'Comprimé effervescent, boîte de 16',                     'cancer_pain', array['dafalgan codeine','codeine','co-dafalgan','dafalgan codéine'])
on conflict (id) do update set
  slug         = excluded.slug,
  name         = excluded.name,
  generic_name = excluded.generic_name,
  form         = excluded.form,
  category     = excluded.category,
  aliases      = excluded.aliases,
  is_active    = true;
```

### 3.5.2 Stock reports — 27 rows

Design of the fixture, so the read-only UI has every state to render:

- **`reported_by` is `'patient'` on every row.** There are no pharmacist
  accounts until step 5, so a `'pharmacist'` report would be fiction that
  the UI then renders as "Confirmé par la pharmacie". The
  `'pharmacist'` display path exists in the frontend but is *not*
  exercised by seed data — that is intentional and noted in 3.12.
- **Timestamps are relative to `now()`**, not absolute literals, so the
  demo is always fresh and the "il y a X" formatting is always
  meaningful. Re-running the seed refreshes them.
- **`Levothyrox 50 µg` is the flagship fixture**: 8 reports over 5
  pharmacies, all four visual states present, 4 pharmacies with no
  report, and one pair (`Pharmacie du Vieux Port`) carrying **two**
  reports where the older one is `out_of_stock` and the newer one is
  `in_stock` — the "latest wins" proof.
- **7 of 26 medications have reports; 19 have none**, including
  `euthyral` and `oxycontin-lp-10`, which exercise the
  "aucun signalement pour ce médicament" page state.
- One deliberately stale report (`Pharmacie Ben Ammar` / Levothyrox 50,
  8 days old) exercises the "signalement ancien" warning (3.12).

| # | Pharmacy | Medication | Status | Age |
| --- | --- | --- | --- | --- |
| 01 | Vieux Port (…01) | levothyrox-50 | out_of_stock | 3 days |
| 02 | Vieux Port (…01) | levothyrox-50 | **in_stock** | 2 hours |
| 03 | Habib Bourguiba (…02) | levothyrox-50 | out_of_stock | 5 hours |
| 04 | Corniche (…03) | levothyrox-50 | in_stock | 26 hours |
| 05 | El Andalous (…04) | levothyrox-50 | unsure | 45 minutes |
| 06 | Ben Ammar (…05) | levothyrox-50 | out_of_stock | 8 days |
| 07 | Ibn Khaldoun (…08) | levothyrox-50 | in_stock | 20 minutes |
| 08 | Zarzouna Centre (…09) | levothyrox-50 | out_of_stock | 2 days |
| 09 | Habib Bourguiba (…02) | lantus-solostar | in_stock | 90 minutes |
| 10 | Corniche (…03) | lantus-solostar | out_of_stock | 6 hours |
| 11 | Bab Mateur (…06) | lantus-solostar | out_of_stock | 30 hours |
| 12 | Zarzouna Centre (…09) | lantus-solostar | unsure | 4 hours |
| 13 | Menzel Jemil (…12) | lantus-solostar | in_stock | 3 days |
| 14 | El Andalous (…04) | novorapid-flexpen | in_stock | 35 minutes |
| 15 | Ibn Khaldoun (…08) | novorapid-flexpen | out_of_stock | 18 hours |
| 16 | Vieux Port (…01) | zoloft-50 | out_of_stock | 12 hours |
| 17 | El Andalous (…04) | zoloft-50 | out_of_stock | 1 day |
| 18 | Ennour (…07) | zoloft-50 | in_stock | 55 minutes |
| 19 | Sidi Salem (…10) | zoloft-50 | unsure | 7 hours |
| 20 | Habib Bourguiba (…02) | depakine-chrono-500 | in_stock | 4 days |
| 21 | Ben Ammar (…05) | depakine-chrono-500 | in_stock | 3 hours |
| 22 | Sidi Ahmed (…11) | depakine-chrono-500 | out_of_stock | 9 hours |
| 23 | Vieux Port (…01) | skenan-lp-30 | out_of_stock | 2 days |
| 24 | Corniche (…03) | skenan-lp-30 | out_of_stock | 5 days |
| 25 | Ibn Khaldoun (…08) | skenan-lp-30 | unsure | 11 hours |
| 26 | Ennour (…07) | dafalgan-codeine | in_stock | 6 hours |
| 27 | Zarzouna Centre (…09) | dafalgan-codeine | in_stock | 25 hours |

```sql
-- ---------------------------------------------------------------------
-- Step 3 — community stock reports (DEMO DATA).
-- Every row is reported_by = 'patient': no pharmacist accounts exist
-- until step 5, so a 'pharmacist' report here would be fiction.
-- reported_at is relative to now() so the "il y a X" display is always
-- meaningful; re-running the seed refreshes the timestamps.
-- Idempotent: safe to re-run.
-- ---------------------------------------------------------------------

insert into public.stock_reports
  (id, pharmacy_id, medication_id, status, reported_by, reported_at)
values
  ('20000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'out_of_stock', 'patient', now() - interval '3 days'),
  ('20000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'in_stock',     'patient', now() - interval '2 hours'),
  ('20000000-0000-4000-8000-000000000003', '00000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', 'out_of_stock', 'patient', now() - interval '5 hours'),
  ('20000000-0000-4000-8000-000000000004', '00000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000001', 'in_stock',     'patient', now() - interval '26 hours'),
  ('20000000-0000-4000-8000-000000000005', '00000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000001', 'unsure',       'patient', now() - interval '45 minutes'),
  ('20000000-0000-4000-8000-000000000006', '00000000-0000-4000-8000-000000000005', '10000000-0000-4000-8000-000000000001', 'out_of_stock', 'patient', now() - interval '8 days'),
  ('20000000-0000-4000-8000-000000000007', '00000000-0000-4000-8000-000000000008', '10000000-0000-4000-8000-000000000001', 'in_stock',     'patient', now() - interval '20 minutes'),
  ('20000000-0000-4000-8000-000000000008', '00000000-0000-4000-8000-000000000009', '10000000-0000-4000-8000-000000000001', 'out_of_stock', 'patient', now() - interval '2 days'),
  ('20000000-0000-4000-8000-000000000009', '00000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000005', 'in_stock',     'patient', now() - interval '90 minutes'),
  ('20000000-0000-4000-8000-000000000010', '00000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000005', 'out_of_stock', 'patient', now() - interval '6 hours'),
  ('20000000-0000-4000-8000-000000000011', '00000000-0000-4000-8000-000000000006', '10000000-0000-4000-8000-000000000005', 'out_of_stock', 'patient', now() - interval '30 hours'),
  ('20000000-0000-4000-8000-000000000012', '00000000-0000-4000-8000-000000000009', '10000000-0000-4000-8000-000000000005', 'unsure',       'patient', now() - interval '4 hours'),
  ('20000000-0000-4000-8000-000000000013', '00000000-0000-4000-8000-000000000012', '10000000-0000-4000-8000-000000000005', 'in_stock',     'patient', now() - interval '3 days'),
  ('20000000-0000-4000-8000-000000000014', '00000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000006', 'in_stock',     'patient', now() - interval '35 minutes'),
  ('20000000-0000-4000-8000-000000000015', '00000000-0000-4000-8000-000000000008', '10000000-0000-4000-8000-000000000006', 'out_of_stock', 'patient', now() - interval '18 hours'),
  ('20000000-0000-4000-8000-000000000016', '00000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000012', 'out_of_stock', 'patient', now() - interval '12 hours'),
  ('20000000-0000-4000-8000-000000000017', '00000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000012', 'out_of_stock', 'patient', now() - interval '1 day'),
  ('20000000-0000-4000-8000-000000000018', '00000000-0000-4000-8000-000000000007', '10000000-0000-4000-8000-000000000012', 'in_stock',     'patient', now() - interval '55 minutes'),
  ('20000000-0000-4000-8000-000000000019', '00000000-0000-4000-8000-000000000010', '10000000-0000-4000-8000-000000000012', 'unsure',       'patient', now() - interval '7 hours'),
  ('20000000-0000-4000-8000-000000000020', '00000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000018', 'in_stock',     'patient', now() - interval '4 days'),
  ('20000000-0000-4000-8000-000000000021', '00000000-0000-4000-8000-000000000005', '10000000-0000-4000-8000-000000000018', 'in_stock',     'patient', now() - interval '3 hours'),
  ('20000000-0000-4000-8000-000000000022', '00000000-0000-4000-8000-000000000011', '10000000-0000-4000-8000-000000000018', 'out_of_stock', 'patient', now() - interval '9 hours'),
  ('20000000-0000-4000-8000-000000000023', '00000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000021', 'out_of_stock', 'patient', now() - interval '2 days'),
  ('20000000-0000-4000-8000-000000000024', '00000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000021', 'out_of_stock', 'patient', now() - interval '5 days'),
  ('20000000-0000-4000-8000-000000000025', '00000000-0000-4000-8000-000000000008', '10000000-0000-4000-8000-000000000021', 'unsure',       'patient', now() - interval '11 hours'),
  ('20000000-0000-4000-8000-000000000026', '00000000-0000-4000-8000-000000000007', '10000000-0000-4000-8000-000000000026', 'in_stock',     'patient', now() - interval '6 hours'),
  ('20000000-0000-4000-8000-000000000027', '00000000-0000-4000-8000-000000000009', '10000000-0000-4000-8000-000000000026', 'in_stock',     'patient', now() - interval '25 hours')
on conflict (id) do update set
  pharmacy_id   = excluded.pharmacy_id,
  medication_id = excluded.medication_id,
  status        = excluded.status,
  reported_by   = excluded.reported_by,
  reported_at   = excluded.reported_at;
```

## 3.6 API surface

### New / changed files

```
backend/app/
├── main.py                     # modified: include the medications router
├── routers/
│   └── medications.py          # new — all three endpoints
└── schemas/
    ├── medication.py           # new
    └── stock.py                # new
```

Still no `services/` layer: the router holds one Supabase call per
endpoint plus a sort. Introduce one in step 4 or 5 if that stops being
true.

### `backend/app/schemas/medication.py`

```python
from typing import Literal
from uuid import UUID

from pydantic import BaseModel

MedicationCategory = Literal["thyroid", "insulin", "psychiatric", "cancer_pain"]


class Medication(BaseModel):
    id: UUID
    slug: str
    name: str
    generic_name: str
    form: str | None
    category: MedicationCategory


class MedicationMatch(Medication):
    # Relevance score from public.search_medications. Informational and
    # useful when tuning; the frontend must not display it.
    score: float


class MedicationListResponse(BaseModel):
    medications: list[Medication]
    count: int


class MedicationSearchResponse(BaseModel):
    query: str
    medications: list[MedicationMatch]
    count: int
```

`aliases`, `search_text`, `is_active`, `created_at` and `updated_at` are
deliberately **not** exposed — nothing in the UI uses them and aliases
are internal search plumbing.

### `backend/app/schemas/stock.py`

```python
from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel

from app.schemas.medication import Medication

# What the database stores.
StockStatus = Literal["in_stock", "out_of_stock", "unsure"]
# What the API returns: the same values plus the synthetic "none",
# meaning "no report exists for this pharmacy + medication".
StockStatusView = Literal["in_stock", "out_of_stock", "unsure", "none"]
ReportSource = Literal["patient", "pharmacist"]


class PharmacyStock(BaseModel):
    # Superset of schemas.pharmacy.Pharmacy: `id` is the PHARMACY id.
    id: UUID
    name: str
    address: str
    city: str
    governorate: str
    lat: float
    lng: float
    phone: str | None
    verified: bool
    status: StockStatusView
    reported_at: datetime | None
    reported_by: ReportSource | None


class StockSummary(BaseModel):
    in_stock: int
    out_of_stock: int
    unsure: int
    none: int


class MedicationStockResponse(BaseModel):
    medication: Medication
    pharmacies: list[PharmacyStock]
    count: int
    summary: StockSummary
```

**Why `"none"` is an API value but not a database value.** The database
enum stays clean — three real observations, and absence is absence.
The API flattens absence into a fourth string so the frontend's status →
colour/label lookup is a total function over a closed union, with no
`null` key handling and no chance of an unhandled branch. The invariant
`status == "none"` ⟺ `reported_at is None` ⟺ `reported_by is None` is
produced by the view's `coalesce` and must hold in every response.

### `GET /api/medications`

The full tracked-medication list. Powers the browse section on `/` and
is the cold-start fallback when the typeahead cannot reach the API.

- **Router:** `APIRouter(prefix="/api/medications", tags=["medications"])`,
  handler registered at `""`.
- **Auth:** none. **Query params:** none.
- **Handler is `def`, not `async def`** (`supabase-py` is synchronous —
  same rule as step 2).
- **Query:**

```python
get_supabase()
    .table("medications")
    .select("id,slug,name,generic_name,form,category")
    .eq("is_active", True)
    .order("category")
    .order("name")
    .execute()
```

- **200** (`MedicationListResponse`): `{"medications": [...], "count": 26}`.
- **Response header:** `Cache-Control: public, max-age=300`.
- **503** on Supabase failure:
  `HTTPException(503, detail="medication list temporarily unavailable")`.

### `GET /api/medications/search`

- **Query params:**

| Param | Type | Required | Default | Validation |
| --- | --- | --- | --- | --- |
| `q` | `str` | yes | — | `Query(..., min_length=1, max_length=64)`, `.strip()` applied in the handler |
| `limit` | `int` | no | `8` | `Query(8, ge=1, le=25)` |

- **Route declaration order matters.** Register `/search` **before** any
  `"/{slug}"`-shaped route on this router, or FastAPI will match
  `slug="search"`. Step 3 has no bare `/{slug}` route, but the rule is
  recorded so step 6 does not trip on it.
- **Query:**

```python
get_supabase().rpc("search_medications", {"q": q, "max_results": limit}).execute()
```

  Keys must be exactly `q` and `max_results` (PostgREST matches RPC
  arguments by name).
- Queries shorter than 3 normalised characters are **not** an error: the
  function returns zero rows and the endpoint returns `count: 0`.
- **200** (`MedicationSearchResponse`):

```json
{
  "query": "levotyrox",
  "medications": [
    {
      "id": "10000000-0000-4000-8000-000000000001",
      "slug": "levothyrox-50",
      "name": "Levothyrox 50 µg",
      "generic_name": "Lévothyroxine sodique",
      "form": "Comprimé sécable, boîte de 30",
      "category": "thyroid",
      "score": 0.62
    }
  ],
  "count": 1
}
```

- **Response header:** `Cache-Control: public, max-age=30`. Shared caches
  may serve identical prefixes; the browser fetch uses `cache: "no-store"`
  so a user never sees their own stale suggestions.
- **503** on failure: `detail="medication search temporarily unavailable"`.

### `GET /api/medications/{slug}/pharmacies`

The results endpoint: one call returns the medication *and* every
pharmacy annotated with its current status.

- **Path param:** `slug: str = Path(..., min_length=1, max_length=80, pattern=r"^[a-z0-9]+(-[a-z0-9]+)*$")`.
  A slug that fails the pattern returns FastAPI's 422 — it can never
  reach Supabase.
- **Two queries, deliberately.** The first is the authority for 404:

```python
# 1. Resolve the slug. Zero rows -> 404, unambiguously.
med_result = (
    get_supabase()
    .table("medications")
    .select("id,slug,name,generic_name,form,category")
    .eq("slug", slug)
    .eq("is_active", True)
    .limit(1)
    .execute()
)
if not med_result.data:
    raise HTTPException(status_code=404, detail="medication not found")

medication = Medication(**med_result.data[0])

# 2. Current status for every pharmacy, from the derived view.
rows = (
    get_supabase()
    .table("pharmacy_medication_status")
    .select(
        "pharmacy_id,pharmacy_name,address,city,governorate,"
        "lat,lng,phone,verified,status,reported_at,reported_by"
    )
    .eq("medication_id", str(medication.id))
    .execute()
).data
```

  Folding both into one filtered view query would make "unknown slug" and
  "no pharmacies in the database" indistinguishable — both are zero rows.
  Two PostgREST round trips cost ~50 ms; a wrong 404 costs a user.
  `report_id` exists in the view but is not selected (decision 2.12.7:
  always an explicit column list).

- **Mapping:** `pharmacy_id → id`, `pharmacy_name → name`; every other
  column maps by name.
- **Ordering is done in Python**, not SQL, because it is a product
  decision that will be tuned and the result set is 12 rows:

```python
_STATUS_PRIORITY = {"in_stock": 0, "unsure": 1, "none": 2, "out_of_stock": 3}

def _sort_key(row: PharmacyStock) -> tuple[int, float, str]:
    # Freshest first inside a status group; rows with no report sort last
    # within their group. `-inf` -> `+inf` after negation.
    reported = row.reported_at.timestamp() if row.reported_at else float("-inf")
    return (_STATUS_PRIORITY[row.status], -reported, row.name)
```

  Rationale for the priority order: a patient wants somewhere to *go*, so
  confirmed stock first, then "incertain" (worth a phone call), then
  "aucun signalement" (unknown, still worth a call), then confirmed
  ruptures last.
- **`summary`** is a `collections.Counter` over `status`, materialised
  into `StockSummary` with explicit zeros for absent keys.
- **200** (`MedicationStockResponse`):

```json
{
  "medication": {
    "id": "10000000-0000-4000-8000-000000000001",
    "slug": "levothyrox-50",
    "name": "Levothyrox 50 µg",
    "generic_name": "Lévothyroxine sodique",
    "form": "Comprimé sécable, boîte de 30",
    "category": "thyroid"
  },
  "pharmacies": [
    {
      "id": "00000000-0000-4000-8000-000000000008",
      "name": "Pharmacie Ibn Khaldoun",
      "address": "5 Rue Ibn Khaldoun, Centre-ville",
      "city": "Bizerte",
      "governorate": "Bizerte",
      "lat": 37.2754,
      "lng": 9.8688,
      "phone": "+21672437264",
      "verified": false,
      "status": "in_stock",
      "reported_at": "2026-08-14T08:40:00+00:00",
      "reported_by": "patient"
    }
  ],
  "count": 12,
  "summary": { "in_stock": 3, "out_of_stock": 3, "unsure": 1, "none": 5 }
}
```

- **Wire format for timestamps:** ISO 8601 with an explicit offset, UTC
  (`+00:00`), as Pydantic v2 serialises `datetime`. The API **never**
  returns pre-formatted relative time — see 3.12.
- **Response header:** `Cache-Control: public, max-age=60`. Shorter than
  the directory's 300 s because stock is the volatile part.
- **404**: `{"detail": "medication not found"}` — unknown slug, or
  `is_active = false`.
- **503**: `detail="stock information temporarily unavailable"`.

### `backend/app/main.py` change

Import `medications` alongside `health` and `pharmacies`, and add
`app.include_router(medications.router)`. Nothing else changes.

## 3.7 Frontend — routes and file inventory

### Routing decision

Decision 2.12.13 already committed `/` to becoming the search page in
step 3. Honoured:

| Route | Role | Rendering |
| --- | --- | --- |
| `/` | **Medication search** — the product entry point | Server Component, `revalidate = 300` (fetches the tracked list) |
| `/medicaments/[slug]` | Stock results for one medication | Server Component, `revalidate = 60` |
| `/pharmacies` | Directory (step 2, unchanged) | Server Component, `revalidate = 300` |
| `/statut` | **New.** The step-1 `ApiStatus` diagnostics widget, moved off the home page | Static shell + client fetch |

Route names stay unaccented and URL-safe (`/medicaments`), consistent
with 2.12.13.

**Why `/statut` exists.** `/` must now be a calm patient page; an
"État des services / API injoignable" panel on it is developer furniture
that undermines trust. But step 1's production acceptance test #6
(browser → Render → Supabase, cross-origin, proven in the deployed app)
is genuinely valuable and must not be deleted. Moving the component to
its own route preserves the test and cleans the home page. See 3.15.

### File inventory

```
frontend/src/
├── app/
│   ├── page.tsx                          # REWRITTEN — search home
│   ├── globals.css                       # modified — stock status tokens
│   ├── medicaments/
│   │   └── [slug]/
│   │       ├── page.tsx                  # new — results (Server Component)
│   │       ├── loading.tsx               # new
│   │       └── not-found.tsx             # new — French 404 for this segment
│   ├── statut/
│   │   └── page.tsx                      # new — hosts <ApiStatus />
│   └── pharmacies/…                      # unchanged
├── components/
│   ├── MedicationSearch.tsx              # new — CLIENT, combobox
│   ├── TrackedMedications.tsx            # new — browse list
│   ├── StockResults.tsx                  # new — CLIENT, list/map shell
│   ├── StockPharmacyList.tsx             # new
│   ├── StockPharmacyListItem.tsx         # new
│   ├── StockStatusBadge.tsx              # new
│   ├── StockLegend.tsx                   # new
│   ├── StockReportTime.tsx               # new — CLIENT, relative time
│   ├── StockMap.tsx                      # new — CLIENT, adapter over MapView
│   ├── MapView.tsx                       # new — CLIENT, dynamic(ssr:false) wrapper
│   ├── MapViewInner.tsx                  # new — CLIENT, all Leaflet code
│   ├── PharmacyMap.tsx                   # REWRITTEN — thin adapter over MapView
│   ├── PharmacyMapInner.tsx              # DELETED — superseded by MapViewInner
│   ├── SiteFooter.tsx                    # modified — footer links
│   ├── ApiStatus.tsx                     # unchanged, now imported by /statut
│   └── …                                 # step 2 components unchanged
└── lib/
    ├── api.ts                            # modified — ApiError, signal, 3 functions
    ├── format.ts                         # modified — time formatting
    ├── stock.ts                          # new — status styling + constants
    ├── medications.ts                    # new — category order
    └── i18n/fr.ts                        # modified — new copy
```

**No new npm dependencies.** No combobox library, no date library (`date-fns`,
`dayjs`, `Intl.RelativeTimeFormat` are all unnecessary for four
thresholds — see 3.12), no `@supabase/supabase-js`.

### `frontend/src/lib/api.ts` — modifications

1. **A typed error**, so callers can distinguish 404 from 503:

```ts
export class ApiError extends Error {
  readonly status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}
```

  `fetchJson` throws `new ApiError(response.status, …)` instead of a bare
  `Error` on non-2xx. The message is developer-facing only; the response
  body's `detail` is **never** shown to a user (decision 2.12.8).

2. **An optional caller-supplied `AbortSignal`**, so the typeahead can
   cancel superseded requests:

```ts
type FetchOptions = {
  revalidate?: number;
  timeoutMs?: number;      // default 60_000
  signal?: AbortSignal;    // combined with the timeout via AbortSignal.any
};
```

  When `signal` is provided, pass
  `AbortSignal.any([signal, AbortSignal.timeout(timeoutMs)])`; otherwise
  behaviour is exactly as today. Existing callers are unaffected.

3. **New types**, mirroring 3.6 exactly:

```ts
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
  reported_at: string | null;   // ISO 8601 with offset
  reported_by: ReportSource | null;
};
export type StockSummary = {
  in_stock: number; out_of_stock: number; unsure: number; none: number;
};
export type MedicationStockResponse = {
  medication: Medication;
  pharmacies: PharmacyStock[];
  count: number;
  summary: StockSummary;
};
```

4. **New functions:**

```ts
export function getMedications(): Promise<MedicationListResponse>;
// GET /api/medications                       { revalidate: 300 }

export function searchMedications(
  q: string,
  signal?: AbortSignal
): Promise<MedicationSearchResponse>;
// GET /api/medications/search?q=…&limit=8    no-store, timeoutMs: 10_000
// q is passed through encodeURIComponent.

export function getMedicationStock(slug: string): Promise<MedicationStockResponse>;
// GET /api/medications/{slug}/pharmacies     { revalidate: 60 }
// slug is passed through encodeURIComponent.
```

  The typeahead's 10 s timeout is a deliberate departure from the 60 s
  cold-start default: a suggestion list that arrives after a minute is
  worse than one that fails fast and lets the user browse instead.

No component may fetch the backend except through `api.ts` (decision
2.12.9 / step 1 §8.9 — still binding).

## 3.8 Status vocabulary, colours and tokens

### `globals.css` — new `@theme` tokens

Step 1 deferred status colours to this step. Append inside the existing
`@theme` block (do not create a second one):

```css
  --color-stock-in: #15803d;
  --color-stock-in-bg: #dcfce7;
  --color-stock-out: #b91c1c;
  --color-stock-out-bg: #fee2e2;
  --color-stock-unsure: #b45309;
  --color-stock-unsure-bg: #fef3c7;
  --color-stock-none: #4b5563;
  --color-stock-none-bg: #f3f4f6;
```

Every foreground/background pair clears WCAG AA (4.5:1) for body text:
in 4.57:1, out 5.35:1, unsure 4.54:1, none 6.85:1. Hues stay muted —
these are the desaturated 700-level tones, not alert reds and greens, per
the brief's "calm, trustworthy, not flashy" requirement.

**Colour is never the only signal.** Every badge carries its French text
label, so the four states are fully distinguishable without colour
vision. There is no icon-only rendering anywhere.

### `frontend/src/lib/stock.ts`

```ts
import type { StockStatusView } from "@/lib/api";

export const STOCK_STATUSES = [
  "in_stock", "out_of_stock", "unsure", "none",
] as const satisfies readonly StockStatusView[];

/**
 * Class strings must be written out literally — Tailwind v4 scans source
 * text and will not see a class name assembled at runtime.
 * `pin` mirrors the --color-stock-* foreground tokens in globals.css
 * because it goes into an SVG string, not a class. Keep the two in sync.
 */
export const STOCK_STYLES: Record<StockStatusView, { badge: string; pin: string }> = {
  in_stock:     { badge: "bg-stock-in-bg text-stock-in",         pin: "#15803d" },
  out_of_stock: { badge: "bg-stock-out-bg text-stock-out",       pin: "#b91c1c" },
  unsure:       { badge: "bg-stock-unsure-bg text-stock-unsure", pin: "#b45309" },
  none:         { badge: "bg-stock-none-bg text-stock-none",     pin: "#4b5563" },
};

/** A report older than this is flagged as stale in the UI. */
export const STALE_AFTER_HOURS = 72;
```

### `frontend/src/lib/medications.ts`

```ts
import type { MedicationCategory } from "@/lib/api";

/** Display order of the browse list; also the API's `order("category")` is
 *  alphabetical, so the frontend re-orders rather than relying on it. */
export const CATEGORY_ORDER = [
  "thyroid", "insulin", "psychiatric", "cancer_pain",
] as const satisfies readonly MedicationCategory[];
```

### French labels

| Status | Label | Meaning shown in the legend |
| --- | --- | --- |
| `in_stock` | `Disponible` | Quelqu'un l'a trouvé sur place. |
| `out_of_stock` | `En rupture` | Quelqu'un ne l'a pas trouvé. |
| `unsure` | `Incertain` | Signalement peu sûr. |
| `none` | `Aucun signalement` | Personne n'a encore signalé ce médicament ici. |

## 3.9 `MedicationSearch.tsx` — the typeahead

Client component. Props:

```ts
type MedicationSearchProps = {
  /** Rendered above the input. Defaults to dict.search.label. */
  label?: string;
  /** Compact variant used in the results page header (smaller, no help text). */
  compact?: boolean;
  autoFocus?: boolean;
};
```

Rendered on **both** `/` (full) and `/medicaments/[slug]` (compact), so a
patient can search again without going back.

### Behaviour

- Controlled `<input type="search">`. State: `query`, `results`,
  `status: "idle" | "loading" | "ready" | "error"`, `activeIndex`,
  `open`.
- **Debounce 250 ms** after the last keystroke.
- **Minimum 3 characters** (after `trim()`), matching the SQL floor.
  Below that: no request, listbox closed, no error.
- Every request carries an `AbortController`; a new keystroke aborts the
  in-flight one. This is the only defence against out-of-order responses
  overwriting newer results. An `AbortError` is swallowed, never shown.
- On success: `status = "ready"`, `open = true`, `activeIndex = 0`.
- On failure (including the 10 s timeout): `status = "error"`, listbox
  shows `search.error` — one line, no retry button; the user can simply
  keep typing, and the browse list below still works.
- Selecting an option (click, `Enter`, or tap) calls
  `router.push(\`/medicaments/${slug}\`)` via `useRouter` from
  `next/navigation`.
- `Enter` with no explicit highlight selects `activeIndex`, which
  defaults to the top-ranked result. `Enter` with zero results does
  nothing.
- No search-results *page*. There is no `/recherche?q=` route: the
  listbox is the result surface, and the committed result is a medication
  page. Keeps one canonical URL per medication.

### Markup — WAI-ARIA 1.2 combobox, hand-rolled

No headless-UI dependency (step 1: "no component library").

```tsx
<label htmlFor="medication-search">{label}</label>
<input
  id="medication-search"
  type="search"
  role="combobox"
  aria-expanded={open}
  aria-controls="medication-search-listbox"
  aria-autocomplete="list"
  aria-activedescendant={open && results.length ? `medication-option-${activeIndex}` : undefined}
  autoComplete="off"
  enterKeyHint="search"
  placeholder={dict.search.placeholder}
/>
<ul id="medication-search-listbox" role="listbox" hidden={!open}>
  <li id={`medication-option-${i}`} role="option" aria-selected={i === activeIndex}>…</li>
</ul>
<p aria-live="polite" className="sr-only">{/* dict.search.resultCount(n) */}</p>
```

Keyboard: `ArrowDown` / `ArrowUp` move `activeIndex` (no wrap),
`Enter` selects, `Escape` closes the listbox and keeps the text,
`Tab` closes without selecting. Clicking outside closes it
(`pointerdown` listener on `document`, cleaned up on unmount).

Each option renders the medication `name` in `font-medium text-ink`, and
`generic_name` + `form` on a second line in `text-sm text-muted`. `score`
is never displayed.

Mobile: input is `h-12 text-base` (16 px prevents iOS zoom-on-focus);
options have ≥ 44 px touch targets; the listbox is
`max-h-80 overflow-y-auto`.

`autoFocus` is `true` on `/` and `false` on the results page — auto-
focusing on mobile pops the keyboard over the content, which is right for
the search page and wrong for a results page.

## 3.10 `TrackedMedications.tsx` — the browse list

Plain presentational component (no `"use client"`), rendered by `/`.
Props: `{ medications: Medication[] }`.

Why it exists, and why it is not optional: Mawjoud tracks 26 products out
of the thousands sold in Tunisia. A bare search box returns nothing for
almost anything a patient types, which reads as "this site is broken"
rather than "this drug is not tracked". The list makes the scope honest
and visible, and it is the working fallback whenever the Render instance
is asleep (the list is ISR-cached HTML; the typeahead is a live call).

Rendering: group by `category` in `CATEGORY_ORDER`; each group gets an
`<h3>` from `dict.medications.categories[category]` and a `<ul>` of
`<Link href={`/medicaments/${m.slug}`}>` cards showing `name` (medium
weight) and `generic_name` (small, muted). One column on mobile,
`sm:grid-cols-2` above.

Header: `dict.medications.trackedTitle` +
`dict.medications.trackedCount(n)` + `dict.medications.trackedNote`
("Mawjoud ne suit qu'une sélection de médicaments en tension…").

## 3.11 Results page and the map refactor

### `frontend/src/app/medicaments/[slug]/page.tsx`

Async Server Component.

```ts
export const revalidate = 60;

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> }
): Promise<Metadata>;

export default async function MedicationPage(
  { params }: { params: Promise<{ slug: string }> }
);
```

**Next.js 15:** `params` is a Promise — `const { slug } = await params;`
in both functions. Getting this wrong is the most likely build failure in
this step.

`generateMetadata` and the page both call `getMedicationStock(slug)`.
Because both use the identical URL and `next: { revalidate: 60 }`
options, Next deduplicates them into a single network request per render.
Do not add a second, different fetch to avoid "duplication" — that is
what would actually cause two requests. On error in
`generateMetadata`, return a generic title and let the page handle it.

Title: `` `${medication.name} — disponibilité à Bizerte | Mawjoud` ``.
Description mentions community reporting.

**No `generateStaticParams`.** Pre-rendering 26 pages at build time would
hit a sleeping Render instance 26 times and lengthen every Vercel build
for pages most users never open. On-demand ISR only.

Error handling:

```
try   { data = await getMedicationStock(slug); }
catch (e) {
  if (e instanceof ApiError && e.status === 404) notFound();   // -> not-found.tsx
  data = null;                                                  // -> error state
}
```

`notFound()` comes from `next/navigation`. Any other failure renders
`dict.stock.error` plus a plain `<a href>` retry (full reload), exactly
like step 2's directory — never a stack trace, never a blank page, never
a failed build (decision 2.12.9).

Render order, same container classes as `/pharmacies`
(`mx-auto flex min-h-screen w-full max-w-screen-sm flex-col gap-6 px-4 py-8 md:max-w-6xl`):

1. `<header>`: `<Link href="/">` back-link (`nav.home`), `<h1>`
   `medication.name`, `<p>` `generic_name` · `form`.
2. **`<Disclaimer />`** — the step-1 component, imported unchanged, third
   element so it is on screen without scrolling at 360 px. Never nested
   inside the scrollable list panel.
3. `<MedicationSearch compact />`.
4. Summary line: `dict.stock.summary(summary.in_stock, count)` and, when
   `summary.in_stock + summary.out_of_stock + summary.unsure === 0`, the
   banner `dict.stock.noReportsAtAll` + `dict.stock.reportingSoon`.
5. `<StockResults pharmacies={data.pharmacies} />`.
6. `<SiteFooter />`.

`loading.tsx`: one centred `<p className="py-12 text-center text-muted">{dict.stock.loading}</p>`
in the same container. No skeletons (step 8).

`not-found.tsx` (scoped to this route segment): French copy —
`dict.stock.notFoundTitle` / `dict.stock.notFoundBody` — plus a link back
to `/`. Next's built-in 404 page is English and would be the only English
string on the site.

### `StockResults.tsx` (client)

Props: `{ pharmacies: PharmacyStock[] }`. Structurally identical to step
2's `PharmacyDirectory` — same state (`view`, `selectedId`), same
`handleSelect`, **same exact Tailwind layout classes** (mobile: one pane
plus `ViewToggle`; `md:` and up: list 2/5 scrolling left, map 3/5 sticky
right; both panes always mounted, CSS-toggled). Decision 2.12.10 is
reused verbatim, not reinvented.

`ViewToggle` is imported unchanged from step 2 — its labels
(`pharmacies.viewList` / `pharmacies.viewMap`) are already generic.

Additions relative to `PharmacyDirectory`:

- `<StockLegend />` between the toggle and the panes.
- The count line uses `dict.stock.pharmacyCount(n)` rather than
  `pharmacies.count(n)`.

### `StockPharmacyList.tsx` / `StockPharmacyListItem.tsx`

Same card shape as step 2 (`rounded-lg border bg-surface p-4`, selected =
`border-brand-600 ring-1 ring-brand-600`). Fields in order:

1. Row: `<h3 className="font-semibold text-ink">` name, and
   `<StockStatusBadge status={p.status} />` right-aligned
   (`flex items-start justify-between gap-3`).
2. `<StockReportTime iso={p.reported_at} source={p.reported_by} />` —
   rendered only when `p.status !== "none"`. For `"none"` the badge
   already says everything and a second line would be noise.
3. `<p className="text-sm text-muted">` address.
4. City, only when `city !== "Bizerte"` (step 2's rule).
5. Phone: `tel:` link with `formatPhone`, or `pharmacies.noPhone`.
   **The phone link matters more here than in the directory** — it is the
   action the disclaimer asks for. Style it as the primary affordance of
   the card (`text-brand-600 underline`, ≥ 44 px tap area).
6. `md:hidden` "Voir sur la carte" button → `onSelect(p.id)`.

Not shown: `verified` (§2.8 still applies), `lat`/`lng`, `governorate`,
distance.

### `StockStatusBadge.tsx`

```tsx
<span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${STOCK_STYLES[status].badge}`}>
  <span aria-hidden className="size-1.5 rounded-full bg-current" />
  {dict.stock.status[status]}
</span>
```

### `StockLegend.tsx`

A `<ul>` (`flex flex-wrap gap-x-4 gap-y-2 text-xs`) of the four badges,
each followed by its one-line explanation from `dict.stock.legend[status]`,
under a small `dict.stock.legendTitle` heading. Always visible; not
collapsible (four short items).

### The map: generalise, do not duplicate

Step 2's `PharmacyMapInner` is ~120 lines of Leaflet with six documented
SSR gotchas. Copying it into a `StockMapInner` that differs only in pin
colour and popup content would be the worst outcome. **Amendment to
decision 2.12.11:** the Leaflet plumbing moves into a generic component
and both features become thin adapters.

`frontend/src/components/MapView.tsx` — `"use client"`, does nothing but

```tsx
dynamic(() => import("./MapViewInner"), { ssr: false, loading: () => <MapPlaceholder /> })
```

and forward props. (The `dynamic(..., { ssr: false })` call must live in a
client component — Next 15 throws at build time otherwise. That
constraint is unchanged.)

`frontend/src/components/MapViewInner.tsx` — `"use client"`, holds **every**
`leaflet` / `react-leaflet` import, `import "leaflet/dist/leaflet.css"`,
and the `FlyToSelected` / `InvalidateSizeOnShow` helpers, ported verbatim
from `PharmacyMapInner` (including the mount-time `invalidateSize()`).

```ts
export type MapMarker = {
  id: string;
  lat: number;
  lng: number;
  /** Hex fill for the pin SVG. */
  color: string;
  popup: React.ReactNode;
};

type MapViewProps = {
  markers: MapMarker[];
  selectedId: string | null;
  isVisible: boolean;
  ariaLabel: string;
};
```

Icons are built per distinct colour and memoised:

```ts
const icons = useMemo(() => {
  const cache = new Map<string, L.DivIcon>();
  for (const m of markers) {
    if (!cache.has(m.color)) cache.set(m.color, makeMarkerIcon(m.color));
  }
  return cache;
}, [markers]);
```

`makeMarkerIcon(color)` is the step-2 `L.divIcon` inline-SVG pin with the
fill interpolated (`className: "mawjoud-marker"`, `iconSize: [24, 32]`,
`iconAnchor: [12, 32]`, `popupAnchor: [0, -30]`). Still no PNG icons, no
CDN, no `_getIconUrl` hack. `bounds` framing, `scrollWheelZoom={false}`,
`OSM_TILE_URL`, `OSM_MAX_ZOOM` and the mandatory OSM attribution are
carried over unchanged.

`frontend/src/components/PharmacyMap.tsx` — **rewritten** as an adapter with
its **props and name unchanged**, so `PharmacyDirectory.tsx` is not
touched at all. It maps `Pharmacy[]` → `MapMarker[]` with
`color: "#0f766e"` (brand-600) and the step-2 popup (name / address /
phone), and renders `<MapView … ariaLabel={dict.pharmacies.mapAriaLabel} />`.

`frontend/src/components/PharmacyMapInner.tsx` — **deleted.** Nothing else
imports it.

`frontend/src/components/StockMap.tsx` — the new adapter: maps
`PharmacyStock[]` → `MapMarker[]` with
`color: STOCK_STYLES[p.status].pin` and a popup containing name,
`<StockStatusBadge />`, `<StockReportTime />` (when a report exists),
address, and the `tel:` link. `ariaLabel` is
`dict.stock.mapAriaLabel(medicationName)` — so `StockResults` passes the
medication name down.

Regression requirement: `/pharmacies` must look and behave **exactly** as
it did before this refactor. It is an explicit acceptance check (3.16.14).

## 3.12 Time display — absolute on the wire, relative in the browser

**The API never sends "il y a 2 heures".** It sends
`reported_at` as ISO 8601, and the browser formats it. Three reasons:

1. **ISR caching would freeze a baked-in relative string.** Next serves
   stale HTML while revalidating, and with no traffic that HTML can be
   hours old. "Confirmé il y a 5 minutes" rendered into a page served
   three hours later is not a cosmetic bug — in a shortage app it sends
   someone across town.
2. An absolute instant is timezone- and locale-agnostic; the client
   already knows "now".
3. Step 6's emails will need a different formatting of the same field.

### `frontend/src/lib/format.ts` — additions

```ts
/** Tunisia is UTC+1 all year (no DST since 2009). Hard-coding the offset
 *  keeps server and client output byte-identical without Intl. */
export const TUNIS_UTC_OFFSET_MINUTES = 60;

/** "14/08/2026 à 09:30" — deterministic, no Intl, no locale data. */
export function formatAbsoluteDateTime(iso: string): string;

/** "à l'instant" | "il y a 12 minutes" | "il y a 3 heures" | "il y a 5 jours"
 *  | "le 14/08/2026 à 09:30" (≥ 30 days). */
export function formatRelativeTime(
  iso: string,
  now: number,
  t: Dictionary["time"]
): string;

/** true when the report is older than STALE_AFTER_HOURS. */
export function isStaleReport(iso: string, now: number): boolean;
```

`Intl.DateTimeFormat` / `Intl.RelativeTimeFormat` are deliberately **not**
used: their output can differ between the Node ICU on Vercel and the
browser's (narrow no-break spaces, separator variations), which produces
hydration mismatches on exactly the string this app cares about. Manual
`padStart` formatting from UTC getters plus the fixed +60 minute offset is
deterministic everywhere.

Thresholds, exactly: `< 60 s` → `justNow`; `< 60 min` → `minutes(n)`;
`< 24 h` → `hours(n)`; `< 30 days` → `days(n)`; otherwise
`onDate(formatAbsoluteDateTime(iso))`. A timestamp in the future (clock
skew) renders as `justNow`, never a negative number. `n` is
`Math.floor()`ed.

### `StockReportTime.tsx` (client)

Props: `{ iso: string; source: ReportSource | null }`.

```tsx
const [now, setNow] = useState<number | null>(null);
useEffect(() => { setNow(Date.now()); }, []);

const when = now === null
  ? dict.time.onDate(formatAbsoluteDateTime(iso))   // deterministic SSR text
  : formatRelativeTime(iso, now, dict.time);

const sentence = (source === "pharmacist"
  ? dict.stock.reportedPharmacist
  : dict.stock.reportedPatient)(when);
```

Rendered as `<time dateTime={iso} title={formatAbsoluteDateTime(iso)}>`.

**Why the two-phase render.** The server (or a cached page) has no
trustworthy "now", so it emits the absolute date — always true, no matter
how old the HTML is. After mount, the client swaps in the relative
phrasing computed against the real clock. Server and first client render
produce the identical string, so there is **no hydration mismatch and no
`suppressHydrationWarning`**. The sentence frame is the same in both
phases; only the time expression changes.

No timers, no auto-refresh — a page open for an hour is not worth an
interval.

Staleness: when `isStaleReport(iso, now)` (and only after mount), the
component also renders `<p className="text-xs text-muted">{dict.stock.staleWarning}</p>`.
This directly reinforces the brief's disclaimer where it matters most.

**`reported_by` distinction.** "Signalé par un patient …" vs "Confirmé
par la pharmacie …". Every step-3 seed row is `patient`, so the
pharmacist branch is **not exercised until step 5**. It is included
anyway because it is one ternary and one dictionary key, and because
conflating a patient's guess with a pharmacy's confirmation would
misrepresent exactly the trust signal the whole product rests on.

## 3.13 French copy — additions to `frontend/src/lib/i18n/fr.ts`

No user-visible string is hard-coded in a component (step 1 rule, still
binding). Parameterised copy is a function (decision 2.12.12).

```ts
common: {
  // unchanged, plus:
  backHome: "← Retour à la recherche",
},
home: {
  // `status` and `buildNote` are REMOVED — the home page is no longer a
  // build-status page. `ctaPharmacies` is kept.
  ctaPharmacies: "Voir toutes les pharmacies de Bizerte",
},
search: {
  label: "Quel médicament cherchez-vous ?",
  placeholder: "Nom de marque ou molécule (ex. Levothyrox)",
  hint: "Saisissez au moins 3 lettres. Les fautes de frappe sont tolérées.",
  searching: "Recherche en cours…",
  error: "La recherche est momentanément indisponible. Utilisez la liste ci-dessous.",
  noResults: (q: string) => `Aucun médicament suivi ne correspond à « ${q} ».`,
  noResultsHint: "Mawjoud ne suit qu'une sélection de médicaments pour le moment.",
  resultCount: (n: number) => `${n} résultat${n > 1 ? "s" : ""}`,
  listboxLabel: "Suggestions de médicaments",
},
medications: {
  trackedTitle: "Médicaments suivis",
  trackedCount: (n: number) => `${n} médicament${n > 1 ? "s" : ""} suivi${n > 1 ? "s" : ""} à Bizerte`,
  trackedNote:
    "Mawjoud suit une sélection de traitements chroniques régulièrement en tension. D'autres médicaments seront ajoutés progressivement.",
  loadError: "La liste des médicaments est momentanément indisponible.",
  categories: {
    thyroid: "Thyroïde",
    insulin: "Insulines",
    psychiatric: "Psychiatrie et neurologie",
    cancer_pain: "Douleurs cancéreuses",
  },
},
stock: {
  status: {
    in_stock: "Disponible",
    out_of_stock: "En rupture",
    unsure: "Incertain",
    none: "Aucun signalement",
  },
  legendTitle: "Signification des états",
  legend: {
    in_stock: "Quelqu'un l'a trouvé sur place.",
    out_of_stock: "Quelqu'un ne l'a pas trouvé.",
    unsure: "Signalement incertain.",
    none: "Personne n'a encore signalé ce médicament ici.",
  },
  reportedPatient: (when: string) => `Signalé par un patient ${when}`,
  reportedPharmacist: (when: string) => `Confirmé par la pharmacie ${when}`,
  staleWarning: "Signalement ancien — appelez la pharmacie avant de vous déplacer.",
  summary: (inStock: number, total: number) =>
    `${inStock} pharmacie${inStock > 1 ? "s" : ""} sur ${total} signale${inStock > 1 ? "nt" : ""} ce médicament comme disponible.`,
  pharmacyCount: (n: number) => `${n} pharmacie${n > 1 ? "s" : ""}`,
  noReportsAtAll: "Aucun signalement pour ce médicament pour le moment.",
  reportingSoon: "La possibilité de signaler une disponibilité arrive prochainement.",
  loading: "Chargement des disponibilités…",
  error: "Impossible de charger les disponibilités pour le moment.",
  retry: "Réessayer",
  notFoundTitle: "Médicament introuvable",
  notFoundBody:
    "Ce médicament ne fait pas partie des médicaments suivis par Mawjoud.",
  mapAriaLabel: (medication: string) =>
    `Carte des pharmacies et de la disponibilité de ${medication}`,
},
time: {
  justNow: "à l'instant",
  minutes: (n: number) => `il y a ${n} minute${n > 1 ? "s" : ""}`,
  hours: (n: number) => `il y a ${n} heure${n > 1 ? "s" : ""}`,
  days: (n: number) => `il y a ${n} jour${n > 1 ? "s" : ""}`,
  onDate: (d: string) => `le ${d}`,
},
footer: {
  pharmacies: "Pharmacies",
  status: "État des services",
},
```

French pluralisation rule (step 2): 0 and 1 both take the singular, hence
`n > 1` and not `n !== 1`, everywhere.

`pharmacies.subtitle` is amended — its "La recherche de médicaments
arrive prochainement." sentence is now false. New value:
`"Annuaire des pharmacies de la région de Bizerte."`

## 3.14 Page-level states — what the patient sees when

| Situation | Where | What is rendered |
| --- | --- | --- |
| `/` loads, tracked list fetched | `/` | Search box + 26 medications grouped by category. |
| `/` loads, API asleep/down | `/` | Search box + `medications.loadError`; the page still renders (try/catch, decision 2.12.9). |
| Fewer than 3 characters typed | combobox | Nothing. No request, no message. |
| Request in flight | combobox | `search.searching` inside the listbox. |
| Matches found | combobox | Listbox of up to 8 options. |
| **Fuzzy search found nothing** | combobox | `search.noResults(q)` + `search.noResultsHint`. Distinct from any error. The browse list below remains the way out. |
| Search request failed | combobox | `search.error`. |
| Unknown slug | `/medicaments/xyz` | `notFound()` → French `not-found.tsx`. |
| **Medication exists, zero reports anywhere** | `/medicaments/[slug]` | `stock.noReportsAtAll` banner + `stock.reportingSoon`, **and the full list/map of all 12 pharmacies**, each badged "Aucun signalement". Never an empty screen — knowing which pharmacies to call is still the answer. |
| Medication exists, some reports | `/medicaments/[slug]` | `stock.summary(...)` + list/map. |
| Results fetch failed (non-404) | `/medicaments/[slug]` | `stock.error` + a plain `<a href>` retry. |
| Navigating between medication pages | `/medicaments/[slug]` | `loading.tsx` text. |

The **`<Disclaimer />` appears on `/`, `/medicaments/[slug]`,
`/pharmacies` and `/statut`** — i.e. every route in the app — and is
always positioned to be visible without scrolling at 360 px.

## 3.15 Amendments to earlier steps

Recorded here rather than by editing steps 1–2, per this document's
preamble.

1. **`ApiStatus` moves off `/`.** Step 1 §2 put `<ApiStatus />` on the
   home page and step 2 §2.5 kept it there. It now lives on the new
   `/statut` route (`frontend/src/app/statut/page.tsx`: header, `<Disclaimer />`,
   `<ApiStatus />`, `<SiteFooter />`, and
   `metadata.robots = { index: false }`). The component itself is
   unchanged.
   **Step 1 acceptance test #6 is amended to run against `/statut`
   instead of `/`.** It is otherwise unchanged and still required.
2. **Home page copy.** Step 1's `home.status` /
   `home.buildNote` strings are removed — `/` is a product page now, not
   a build-status page.
3. **`SiteFooter`** gains two links (`footer.pharmacies` → `/pharmacies`,
   `footer.status` → `/statut`) below the existing `common.footerNote`.
   Small, muted, non-competing with the page content.
4. **Decision 2.12.11 amended.** Leaflet lives in `MapViewInner` behind
   `MapView`; `PharmacyMap` and `StockMap` are adapters.
   `PharmacyMapInner.tsx` is deleted. The `ssr: false` split, the
   `divIcon` inline-SVG rule and the `invalidateSize` handling are
   unchanged in substance.
5. **`frontend/.env.example`** comment for `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   updated per 3.0.1.
6. **`pharmacies.subtitle`** updated per 3.13.
7. **Step 2 open question "Should `/pharmacies` survive step 3?"**
   answered: yes (3.0.2).
8. **Step 2 open question "Realtime (deferred fork)"** answered: no
   (3.0.1).

## 3.16 Acceptance test — step 3 is done when all of these pass

Database:

1. All three migrations apply cleanly to the hosted project, in filename
   order, and re-applying each is a no-op.
2. `select count(*) from public.medications` = 26;
   `select count(*) from public.stock_reports` = 27; re-running
   `seed.sql` leaves both counts unchanged.
3. `select search_text from public.medications where slug = 'neo-mercazole-5';`
   returns `neo mercazole 5 mg carbimazole neomercazole neo mercazol mercazole carbimazol`
   — proving the trigger, the accent stripping and the punctuation
   stripping all ran.
4. `select slug, score from public.search_medications('levotyrox', 8);`
   returns both Levothyrox rows, best first.
   `search_medications('fluoxetine')` returns `prozac-20`.
   `search_medications('neo mercazole')` and
   `search_medications('Néo-Mercazole')` return the same row.
   `search_medications('ab')` returns zero rows.
   `search_medications('doliprane')` returns zero rows.
5. `select status, reported_at from public.pharmacy_medication_status
   where medication_id = '10000000-0000-4000-8000-000000000001'
   and pharmacy_id = '00000000-0000-4000-8000-000000000001';`
   returns **`in_stock`** — the 2-hour-old report, not the 3-day-old one.
   **This is the "latest wins" proof.**
6. The same query for `medication_id` = `…0003` (Euthyral) returns 12
   rows, every one with `status = 'none'` and `reported_at is null`.
7. From the SQL editor as the anon role
   (`set local role anon;`): `select * from public.medications`,
   `select * from public.stock_reports`,
   `select * from public.pharmacy_medication_status` and
   `select * from public.search_medications('levo')` all fail with
   permission denied / return nothing. **All four**, including the
   function — a `create function` grants EXECUTE to PUBLIC by default and
   the revoke is what closes it.

API:

8. `GET /api/medications` → 200, `count == 26`, no `aliases` /
   `search_text` / `is_active` field in any item.
9. `GET /api/medications/search?q=levotyrox` → 200 with both Levothyrox
   rows; `?q=ab` → 200 with `count == 0` (not 4xx);
   `?q=` → 422.
10. `GET /api/medications/levothyrox-50/pharmacies` → 200, `count == 12`,
    the first item is a pharmacy with `status == "in_stock"`, the last is
    `out_of_stock`, and `summary` sums to 12. Every item with
    `status == "none"` has `reported_at == null` **and**
    `reported_by == null`.
11. `GET /api/medications/euthyral/pharmacies` → 200 with
    `summary == {in_stock: 0, out_of_stock: 0, unsure: 0, none: 12}`.
12. `GET /api/medications/does-not-exist/pharmacies` → 404
    `{"detail": "medication not found"}`;
    `GET /api/medications/Not_A_Slug/pharmacies` → 422.
13. `/docs` lists all three endpoints with their response models, and
    with `SUPABASE_URL` pointed at an unreachable host each returns 503
    with a sanitised `detail` containing no key material.

Frontend, local:

14. **Regression:** `/pharmacies` renders exactly as before the map
    refactor — 12 teal pins, popups with name/address/phone, the
    Liste/Carte toggle, side-by-side at ≥ 768 px, OSM attribution
    visible.
15. `npm run build` and `npm run lint` succeed. The build does **not**
    fail with `window is not defined` (the `ssr: false` split survived
    the refactor) and does not warn about `params` not being awaited.
16. On `/` at 360 px: title, disclaimer visible without scrolling, search
    input focused, and the 26 tracked medications grouped under four
    French headings.
17. Typing `levoti` on `/` shows both Levothyrox suggestions within
    ~1 s of the last keystroke; typing `le` shows nothing; typing
    `doliprane` shows `search.noResults`. Arrow keys move the highlight,
    Enter navigates, Escape closes.
18. `/medicaments/levothyrox-50` shows: 12 pharmacies, `Pharmacie Ibn
    Khaldoun` and `Pharmacie du Vieux Port` badged **Disponible** at the
    top, `Pharmacie Ben Ammar` badged **En rupture** with the
    "signalement ancien" warning, and 4 pharmacies badged **Aucun
    signalement** with no timestamp line.
19. Map pins on that page are green / red / amber / grey and match each
    card's badge; a pin popup shows the badge and the same relative time.
20. `/medicaments/euthyral` shows the `noReportsAtAll` banner **and**
    all 12 pharmacies — not a blank state.
21. `/medicaments/inexistant` shows the French not-found page, not
    Next's English 404.
22. With the FastAPI server stopped: `/` still renders (search box +
    `medications.loadError`), typing shows `search.error`, and
    `/medicaments/levothyrox-50` renders `stock.error` with a working
    retry link. No stack traces, no blank pages.
23. Relative times are correct after hydration and no hydration warning
    appears in the console — check specifically on a page reloaded from
    the ISR cache.

Production:

24. The Vercel deployment of `/` and `/medicaments/levothyrox-50` works
    over HTTPS, and the browser Network tab shows **no requests to
    `*.supabase.co`** and **no websocket connections** — confirming
    decisions 2.12.1 and 3.0.1 hold in the shipped bundle.
25. `/statut` on the deployed site resolves both green lines (step 1
    acceptance test #6, relocated).

## 3.17 Explicit non-goals for step 3

- **No writes of any kind.** No `POST`/`PATCH`/`DELETE` endpoints, no
  "j'ai trouvé / pas trouvé" buttons, no forms. The only `stock_reports`
  rows come from `seed.sql`. (Step 4.)
- **No abuse controls, no rate limiting, no reporter fingerprinting** —
  they belong with the write path. (Step 4.)
- **No auth.** No `pharmacist_accounts`, no magic link, no protected
  routes, no `verified` badge. (Step 5.)
- **No Realtime, no `@supabase/supabase-js`, no anon-key usage, no
  polling loop.** (3.0.1.)
- **No notify-me**, no `subscriptions` table, no Resend. (Step 6.)
- **No prescription upload**, no Storage bucket. (Step 7.)
- **No search logging / analytics.** The brief's "X people searched for
  this drug near you" belongs to the pharmacist dashboard. (Step 5 — see
  3.19.)
- **No geolocation, no "près de moi", no distance sorting, no PostGIS.**
  Ordering is by status then freshness then name. Still deferred.
- **No filtering of the results list** (by status, by city), no
  pagination — 12 rows.
- **No medication detail content**: no dosage guidance, no
  contraindications, no substitution suggestions, no "équivalent
  générique disponible ici". Anything resembling medical advice is out of
  scope by the brief.
- **No per-strength granularity** beyond the two Levothyrox rows (3.2).
- **No medication management UI.** `medications` is curated by hand in
  `seed.sql`.
- **No `/recherche` route**, no search-results page, no URL-persisted
  query state.
- **No skeleton loaders, no `error.tsx` boundaries, no empty-state
  illustrations, no animations.** Plain text states. (Step 8.)
- **No new npm or pip dependencies.** No combobox library, no date
  library, no fuzzy-search JS library.
- **No Arabic dictionary**, no locale routing.
- **No tests.** Still manual acceptance only.

## 3.18 Decisions recorded in this step

Binding on later steps unless explicitly amended:

1. **No Supabase Realtime for the MVP** (3.0.1). Freshness is ISR +
   reload; step 4 adds `router.refresh()` after a user's own write.
   Revisit no earlier than step 5, and only as "Realtime channel only".
2. **Search is two API calls in one user flow** (3.1): typeahead over
   medications, then a canonical, linkable, ISR-cached
   `/medicaments/<slug>` results page.
3. **Medications carry a `slug`**, which is the public URL key and the
   API path key for reads. `uuid` remains the internal FK and the write
   key.
4. **Native Postgres enums for closed state vocabularies**
   (`stock_status`, `report_source`), created through a `do $$ … $$`
   idempotency guard; **`text` + `check` for taxonomies expected to
   grow** (`medications.category`).
5. **Current stock status is derived, never stored.** `stock_reports` is
   append-only; the latest row per (pharmacy, medication) wins; absence
   is the "no report" state. No `current_stock` table, no status column
   on any other table.
6. **pg_trgm lives in the `extensions` schema and every reference to it
   is schema-qualified.**
7. **Fuzzy search uses `word_similarity` against a trigger-maintained,
   normalised `search_text` column**, never `similarity()` against a
   concatenation, and never a `GENERATED` column (`array_to_string` is
   `STABLE`). Ranking is computed per field so brand hits outrank alias
   hits.
8. **`public.mawjoud_normalize(text)` is the single definition of "the
   same string"** — lowercase, de-accent via `translate`, punctuation to
   spaces — applied to both stored text and user queries. No `unaccent`
   extension.
9. **Derived reads are a view when they are a filtered list
   (`pharmacy_medication_status`), and an RPC when a parameter shapes
   the ranking (`search_medications`).** Both are revoked from
   `public`/`anon`/`authenticated` and granted only to `service_role`;
   views are `security_invoker = on`.
10. **The API exposes a synthetic `"none"` status** that does not exist
    in the database, with the invariant
    `status == "none"` ⟺ `reported_at is null` ⟺ `reported_by is null`.
11. **Timestamps cross the wire as absolute ISO 8601; relative phrasing
    is computed in the browser after mount**, with a deterministic
    absolute-date server render so there is no hydration mismatch. No
    `Intl.*` in that path.
12. **Result ordering is a product decision made in Python**, not SQL:
    `in_stock` → `unsure` → `none` → `out_of_stock`, freshest first
    within a group, then by name.
13. **Status colours are `@theme` tokens (`--color-stock-*`) with a
    literal `Record` of Tailwind classes in `frontend/src/lib/stock.ts`.**
    Colour is never the only signal; every state carries its French
    label.
14. **Leaflet plumbing is generic** (`MapView` / `MapViewInner`, a
    `MapMarker[]` prop); feature maps are thin adapters. Amends 2.12.11.
15. **`/` is the medication search page; `/statut` hosts the
    diagnostics widget; `/pharmacies` survives as "browse all".**

## 3.19 Open questions for the user (non-blocking for step 3)

Step 3 can be implemented in full without answers to these.

- **Who validates the medication list?** The 26 seeded products are
  plausible and commonly dispensed in Tunisia, but presentations, box
  sizes and current local marketing status are **not verified** — the
  same honesty caveat as step 2's pharmacy rows. A pharmacist should
  review `seed.sql` before any public launch; a patient travelling for a
  product that is not marketed in Tunisia is a real harm. Not needed to
  build the step.
- **Search logging for the step-5 pharmacist incentive.** The brief
  promises pharmacists "X people searched for [drug] near you this week".
  That needs a `search_events` table accumulating history. Starting to
  log in step 3 would give step 5 real data — but step 3 is deliberately
  write-free, and a pre-launch MVP has no traffic worth preserving.
  **Recommendation: defer the table to step 5.** Note that the 30 s
  `Cache-Control` on the search endpoint would undercount if logging were
  ever done at the CDN rather than in the handler.
- **Is a 60 s ISR window right for stock?** It trades ≤ 60 s of staleness
  (immaterial next to report ages measured in hours) for instant loads
  despite Render cold starts. If it ever feels wrong, the alternative is
  `no-store` on `getMedicationStock` — one line, but it exposes every
  visitor to a 50 s cold start.
- **Per-strength tracking.** Only `Levothyrox 50/100 µg` are split today.
  Whether pharmacists will tolerate toggling every strength separately
  (step 5) should be checked with a real pharmacist before expanding.
- **Coverage growth policy.** How are medications added after launch —
  hand-edited `seed.sql` + a migration, or an admin UI? Not needed before
  step 8.
- **Still open from earlier steps:** real pharmacy data provenance,
  city-vs-governorate coverage boundary, opening hours / pharmacie de
  garde, and the patient contact channel for step 7.

---

# Step 4 — Public community stock reporting (no auth)

**Goal:** on `/medicaments/<slug>`, every pharmacy card (and every map
popup) carries two buttons — **Disponible ici** / **Pas disponible ici**.
One tap writes a `stock_reports` row through FastAPI, the badge, the map
pin, the timestamp and the summary update immediately for the reporter,
and the shared ISR cache is purged so the next visitor sees it too. No
login, no CAPTCHA, no third-party service. Abuse control is entirely
server-side.

This is the **first write path in the project**. Everything in steps 1–3
was read-only, so the conventions that matter here (who is trusted, what
is server-set, how the cache is invalidated) are established now and bind
steps 5–7.

## 4.0 The brief's exact wording — patient reports are binary

> "Report what they found after visiting a pharmacy ('found it here' /
> 'not available here') — **two taps**, no login needed."

versus, for the pharmacist dashboard in step 5:

> "Dashboard listing tracked medications with a one-tap toggle: In stock /
> Out / **Unsure**."

**Decision: the patient-facing UI exposes exactly two states,
`in_stock` and `out_of_stock`. `unsure` is not reachable by any
unauthenticated caller — the public endpoint rejects it with 422. It is
reserved for the authenticated pharmacist toggle in step 5.**

The difference between the two surfaces is deliberate, not an oversight
in the brief:

1. **The two roles are answering different questions.** A patient reports
   *an observation they just made at the counter*: "they gave it to me" or
   "they told me they don't have it". That observation is binary by
   construction. A pharmacist reports *the state of their own inventory*,
   where "I'm not sure — the delivery is due, ask me this afternoon" is a
   real, useful and honest third answer that only they can give.
2. **A third patient button costs the "two taps" requirement.** Three
   choices on a 360 px card means smaller targets, more reading, more
   mis-taps, and a decision the patient has no basis to make.
3. **`unsure` from an anonymous caller is a data-quality hole.** With
   `reported_by` forced to `'patient'` (4.5), an anonymous script that can
   post `unsure` can grey out every pair in the database without ever
   asserting anything falsifiable. The two honest states are also the two
   states another patient can contradict.

Consequences, all of which are already true in the shipped code:

- The `public.stock_status` enum keeps all three values. Nothing in the
  database changes.
- The API's `StockStatusView` union (`in_stock`/`out_of_stock`/`unsure`/
  `none`) is unchanged — reads must still render `unsure`, because
  seeded rows use it and step 5 will write it.
- `StockStatusBadge`, `StockLegend` and `STOCK_STYLES` keep their four
  branches untouched. This step **extends** them; it does not redesign
  them.
- Only the *write* schema narrows: a new
  `PatientReportStatus = Literal["in_stock", "out_of_stock"]`.

## 4.1 Threat model — what "no auth" actually means

Worth stating plainly, because every decision in 4.2–4.4 follows from it.

| Assumption | Reality |
| --- | --- |
| CORS protects the endpoint | **No.** `ALLOWED_ORIGINS` only constrains *browser-JS-initiated cross-origin* requests. `curl -X POST https://mawjoud-api.onrender.com/api/…` ignores CORS entirely. Every control below must work against a script. |
| The frontend can enforce anything | **No.** Button state, debouncing and the "done" UI are UX, not security. |
| We can identify a person | **No.** No login, no cookie we can trust, no device id. The best available signal is a coarse, hashed network address. |

What we are actually defending against, in order of likelihood:

1. **Accidental duplicates** — a double-tap, a fat-finger hitting both
   buttons, a page refresh re-submitting. By far the most common event.
2. **A bored individual** flipping a few pairs by hand or with a
   two-line script.
3. **A motivated single-source flood** — one script, one IP, hundreds of
   reports.

What we explicitly do **not** defend against at MVP scale: a distributed
flood from many IPs, or a determined actor with a proxy pool. That needs
either accounts or a third-party abuse service, and neither is in the
brief or the stack. The residual mitigation is human: step 5 gives
pharmacists an authoritative override on their own pharmacy, and every
page carries the disclaimer that this is community data.

## 4.2 Migration 4 — abuse-control columns on `stock_reports`

`supabase/migrations/20260814100000_add_stock_report_abuse_controls.sql`

Sorts after step 3's `20260814090200_…`. Step 3 §3.3 deferred exactly
this: *"Step 4 will add abuse-control columns (a coarse reporter
fingerprint, a rate-limit surface)."*

**RLS and grants are untouched.** Decision 2.12.1 / 2.12.2 still hold:
the table is RLS-on with zero policies, revoked from `anon` and
`authenticated`, and the existing
`grant select, insert … to service_role` already covers new columns
(grants are table-level, not column-level). The `revoke` is repeated
below purely as a defensive no-op.

```sql
-- Step 4 — abuse controls for public (unauthenticated) stock reporting.
-- Adds a coarse, non-reversible reporter fingerprint to stock_reports and
-- the one index the rate-limit lookup needs.
-- RLS posture is UNCHANGED: still zero policies, still revoked from
-- anon/authenticated, still service-role-only through FastAPI
-- (decisions 2.12.1 / 2.12.2). See docs/ARCHITECTURE.md 4.2–4.4.
-- Idempotent: safe to re-run.

alter table public.stock_reports
  add column if not exists reporter_fingerprint text;

comment on column public.stock_reports.reporter_fingerprint is
  'Coarse, non-reversible reporter identity: lowercase hex HMAC-SHA256 of "v1|<normalised client IP>" keyed with REPORT_FINGERPRINT_SECRET (IPv4 = exact address, IPv6 = /64 prefix). A RAW IP IS NEVER STORED. Used only to rate-limit the anonymous write path (ARCHITECTURE.md 4.4). NULL for every row not written by the public reporting endpoint: all seed rows, and every pharmacist report from step 5 onward.';

-- Format guard. Only rows the app writes carry a value, and it is always
-- a 64-character sha256 hex digest.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'stock_reports_fingerprint_format'
      and conrelid = 'public.stock_reports'::regclass
  ) then
    alter table public.stock_reports
      add constraint stock_reports_fingerprint_format
      check (
        reporter_fingerprint is null
        or reporter_fingerprint ~ '^[0-9a-f]{64}$'
      );
  end if;
end
$$;

-- THE index for the rate-limit lookup: "every report this fingerprint
-- made in the last 24 hours, newest first". Equality on the fingerprint
-- then created_at desc is exactly the query in ARCHITECTURE.md 4.5.
-- Partial, because the overwhelming majority of rows (seed data, and
-- later every pharmacist report) have no fingerprint and must not bloat
-- the index.
--
-- created_at, NOT reported_at: reported_at is the observation time and
-- step 5's pharmacist path may legitimately backdate it. created_at is
-- the insert time and is the only thing a rate limit may be based on.
create index if not exists stock_reports_fingerprint_recent
  on public.stock_reports (reporter_fingerprint, created_at desc)
  where reporter_fingerprint is not null;

-- Defensive no-op: adding a column does not re-grant anything, but the
-- deny-all posture is cheap to restate and expensive to lose.
revoke all on table public.stock_reports from anon, authenticated;
grant select, insert on table public.stock_reports to service_role;
```

### Why a hashed IP and not something cleverer

| Candidate | Verdict |
| --- | --- |
| Raw IP address | **Rejected.** Directly identifying, indefinitely retained on a health-adjacent dataset, and buys nothing the HMAC does not. |
| Plain `sha256(ip)` | **Rejected.** The IPv4 space is 2^32 — a full rainbow table is minutes of compute. An unkeyed hash of an IP is an IP. |
| **HMAC-SHA256(ip, secret)** | **Chosen.** Not reversible without the key; the key lives only in the API's environment (never in the database, never in the frontend, never in the repo). |
| A first-party cookie / `localStorage` id | **Rejected as the primary signal.** Cleared or refused by exactly the users worth limiting, and trivially rotated by a script. Would add a second thing to reason about for zero abuse resistance. |
| Cookie **plus** IP | Deferred. Only worth it if NAT false positives (4.4) turn out to be a real problem in practice. |
| Including the User-Agent in the hash | **Rejected.** It *narrows* the fingerprint, which reduces NAT collisions — but a script rotates its UA in one line, so it weakens the control against the only adversary that matters. |

### Data-protection note

A keyed hash of an IP address is still, on a strict reading, personal
data. It is retained because the append-only log is the rate-limit
surface; the mitigations are that it is coarse (a whole /64 for IPv6, a
whole NAT for most Tunisian mobile users), unlinkable without a secret the
database does not contain, never displayed, never exported by any
endpoint, and never logged in full. **No endpoint in this project ever
returns `reporter_fingerprint`** — not the view, not the API, not the
diagnostics route in 4.3. If a retention policy is ever needed, the
column can be nulled out for rows older than 24 h by a scheduled job; that
is not built now (4.16).

## 4.3 Identifying the reporter — the Render proxy gotcha

`request.client.host` under uvicorn is the peer address of the TCP
connection. On Render that is **Render's own proxy**, not the patient.
Getting this wrong is silent and catastrophic: every report in the country
collapses into one fingerprint, the first user of the hour consumes the
whole quota, and every subsequent legitimate report is 429'd. It is the
same class of failure as step 2's SSR/Leaflet traps — invisible locally,
fatal in production.

### What Render actually sends

Render fronts web services with **Cloudflare**, so requests arriving at
the container carry the Cloudflare header set. Verified from a real
Render request dump ([arcjet-js#3899](https://github.com/arcjet/arcjet-js/issues/3899)):

```
True-Client-IP: 81.97.145.24
CF-Connecting-IP: 81.97.145.24
X-Forwarded-For: 81.97.145.24, 172.71.195.123, 10.226.90.65
```

Two things follow, and both are counter-intuitive:

1. **The real client is the LEFTMOST entry of `X-Forwarded-For` on
   Render**, not the rightmost. The trailing entries are the Cloudflare
   edge and a Render-internal `10.x` address. The usual "always take the
   rightmost entry" security advice is correct for a single trusted
   reverse proxy and **wrong here** — rightmost would give every user the
   same Render-internal address.
2. **Leftmost is nevertheless spoofable.** Render's own feature tracker
   ([feedback.render.com](https://feedback.render.com/features/p/send-the-correct-xforwardedfor))
   records that Render *appends* to a client-supplied `X-Forwarded-For`
   rather than resetting it, while Render staff state that they "set the
   first IP in the list to the real client IP". Those two statements are
   in tension and there is no authoritative, versioned Render document
   settling it. **Treat `X-Forwarded-For` as untrustworthy for rate
   limiting.**

`CF-Connecting-IP` (and its alias `True-Client-IP`) are *overwritten* by
Cloudflare on every request — a client-supplied value is discarded, not
appended to. That makes them the only headers here that are safe to trust,
given that traffic cannot reach a Render container without passing
through Render's edge.

### Rule: never sniff, always configure

Do **not** write "try `CF-Connecting-IP`, else `True-Client-IP`, else
`X-Forwarded-For`, else the socket". Header sniffing means a local or
misconfigured deployment silently trusts whatever a client sends.

**New optional setting `CLIENT_IP_HEADER` (`app/config.py`,
`str | None`, default `None`):**

- **Unset (default, and the local-dev value):** the client IP is
  `request.client.host`. No header is read. Correct and unspoofable when
  nothing is in front of the app.
- **Set** (Render: `cf-connecting-ip`): read exactly that one header,
  case-insensitively, take the **first comma-separated entry**, strip
  whitespace, and validate it with `ipaddress.ip_address()`. If the header
  is absent, empty, or does not parse, **log a warning and fall back to
  `request.client.host`** — never fall through to a different header.

Committed in `render.yaml` as a plain (non-secret) value, so production
behaviour is in version control and reviewable.

### `backend/app/services/reporter_identity.py` (new)

```python
import hashlib
import hmac
import ipaddress
import logging

from fastapi import Request

from app.config import settings

logger = logging.getLogger(__name__)

FINGERPRINT_VERSION = "v1"


def resolve_client_ip(request: Request) -> tuple[str | None, str]:
    """Return (ip, source). `source` is for logging only: the configured
    header name, "socket", or "unavailable"."""
    header_name = (settings.client_ip_header or "").strip().lower()
    if header_name:
        raw = request.headers.get(header_name)
        if raw:
            candidate = raw.split(",")[0].strip()
            try:
                ipaddress.ip_address(candidate)
            except ValueError:
                logger.warning("unparseable client ip in header %s", header_name)
            else:
                return candidate, header_name
        logger.warning("configured client ip header %s missing", header_name)
    if request.client and request.client.host:
        return request.client.host, "socket"
    return None, "unavailable"


def normalise_ip(ip: str) -> str:
    """IPv4 -> exact address. IPv6 -> the /64 prefix, because a single
    residential or mobile subscriber is routinely handed a whole /64 and
    can rotate the host bits at will."""
    parsed = ipaddress.ip_address(ip)
    if parsed.version == 6:
        return str(ipaddress.ip_network(f"{parsed}/64", strict=False).network_address)
    return str(parsed)


def fingerprint_ip(ip: str) -> str:
    message = f"{FINGERPRINT_VERSION}|{normalise_ip(ip)}".encode()
    return hmac.new(
        settings.report_fingerprint_secret.encode(),
        message,
        hashlib.sha256,
    ).hexdigest()
```

Notes:

- The `v1|` prefix means the scheme can change later without old and new
  fingerprints colliding.
- Rotating `REPORT_FINGERPRINT_SECRET` invalidates every existing
  fingerprint. Harmless: the longest rate-limit window is 24 h.
- **Logging rule:** never log a raw IP and never log a full fingerprint.
  Log `fingerprint[:8]` and the `source` string only.

### `GET /health/client` — the diagnostic that makes this verifiable

Without this, the only way to discover a wrong `CLIENT_IP_HEADER` is to
notice that reporting is broken for everyone. Added to
`backend/app/routers/health.py` (the `/health*` family is unprefixed by
step 1's convention).

- **Request:** none. **Auth:** none.
- **200 response** (`ClientIdentityResponse`):

```json
{
  "ip_source": "cf-connecting-ip",
  "fingerprint_prefix": "9f3a1c7d",
  "forwarding_headers_present": ["cf-connecting-ip", "true-client-ip", "x-forwarded-for"]
}
```

- `fingerprint_prefix` is the first 8 hex characters of the HMAC. It is
  not reversible and cannot be replayed as a report.
- `forwarding_headers_present` is a list of **header names only**, drawn
  from a fixed allowlist (`x-forwarded-for`, `cf-connecting-ip`,
  `true-client-ip`, `x-real-ip`, `forwarded`). **No header values, and no
  IP address, ever appear in the response.** The caller learns nothing it
  did not already send.
- `ip_source` is `"unavailable"` when no IP could be resolved, in which
  case `fingerprint_prefix` is `null`.
- `metadata.robots`-equivalent does not apply to an API; the route is
  listed in `/docs` and that is fine.

Two devices on two different networks (phone on mobile data, laptop on
Wi-Fi) must return **different** `fingerprint_prefix` values. That single
check proves the whole abuse model is wired correctly, and it is
acceptance test 4.13-11.

## 4.4 Rate limiting — exact rules and why these numbers

All limits are evaluated **in Postgres data, not in process memory**. The
Render free instance sleeps, restarts and can be replaced; an in-memory
counter would be reset by exactly the traffic pattern that matters, and
would be wiped between the two halves of an abuse burst. The rows are
being written to the database anyway, so the log *is* the counter.

One query per POST fetches everything all four rules need:

```python
window_start = (now - LOOKBACK_WINDOW).isoformat()
recent = (
    get_supabase()
    .table("stock_reports")
    .select("pharmacy_id,medication_id,status,created_at")
    .eq("reporter_fingerprint", fingerprint)
    .gte("created_at", window_start)
    .order("created_at", desc=True)
    .limit(LOOKBACK_ROW_LIMIT)
    .execute()
).data
```

Exactly matches `stock_reports_fingerprint_recent`. `LOOKBACK_ROW_LIMIT`
is 100, strictly greater than the largest cap (60), so a cap is always
detectable from the truncated set.

### The four rules

| # | Rule | Window | Limit | Rejects |
| --- | --- | --- | --- | --- |
| A | Pair cooldown — any report by this fingerprint on this (pharmacy, medication) | 60 seconds | 1 | Double-taps, fat-finger hits on both buttons, refresh re-submits, rapid A/B flip-flopping |
| B | Duplicate status — same fingerprint, same pair, **same status** | 30 minutes | 1 | Re-affirming what the page already shows |
| C | Hourly volume — same fingerprint, any pair | 60 minutes | 20 | A script hammering from one address |
| D | Daily volume — same fingerprint, any pair | 24 hours | 60 | Sustained low-and-slow flooding |

Evaluated in order A → B → C → D; the first hit rejects with 429.

### Justification, against real patient behaviour

- **A = 60 s, not 5 minutes.** The prompt case — "reporting the same drug
  at the same pharmacy twice in five minutes is almost certainly a mis-tap
  or abuse" — is real, but so is the *correction*: the two buttons sit
  next to each other on a 360 px card, and a patient who taps the wrong
  one needs a way back. Rule B already blocks the useless case (repeating
  the *same* answer) for a full 30 minutes. Rule A only has to stop
  sub-second double-fires and oscillation, and 60 seconds does that with a
  large margin while keeping an honest correction possible after a short
  wait. The UI's 429 copy ("patientez quelques minutes") is deliberately
  vaguer than the real window — it overstates, never understates.
- **B = 30 minutes.** A second identical report inside half an hour adds
  literally zero information: under the latest-wins model the pair already
  displays that exact status with a fresh timestamp. Long enough to cover
  a patient who queues, leaves, comes back and re-taps out of doubt.
- **C = 20 / hour.** A patient visits one pharmacy at a time. An
  unusually civic-minded user walking central Bizerte might genuinely
  cover 8–10 pharmacies in an hour, occasionally reporting two drugs at
  one counter. 20 is roughly 2× the most generous plausible legitimate
  rate, and low enough that poisoning the dataset (12 pharmacies × 26
  medications = 312 pairs) takes ~16 uninterrupted hours from one address
  — long enough for a human to notice.
- **D = 60 / 24 h.** Caps the "20 an hour, all day" pattern that C alone
  permits. Any human doing 60 pharmacy visits in a day is not a patient.

### Accepted false positive: carrier-grade NAT

Tunisian mobile networks are heavily NATed, so many unrelated users share
one public IPv4 address and therefore one fingerprint. Consequences,
accepted deliberately:

- **Rules A and B:** two strangers reporting *the same drug at the same
  pharmacy* within the window is rare, and when it happens the second
  report is redundant anyway — the page already shows what they were about
  to say. The second user sees a slightly wrong message and correct data.
- **Rules C and D:** the real risk. 20/hour shared across a NAT pool
  could, at scale, block genuine reports. At MVP traffic (one city, a
  pre-launch audience) this is theoretical; the numbers are single
  constants in one module and are meant to be raised once real traffic
  exists. Flagged in 4.16.

### `backend/app/services/report_rate_limit.py` (new)

```python
from dataclasses import dataclass
from datetime import datetime, timedelta

PAIR_COOLDOWN = timedelta(seconds=60)          # rule A
DUPLICATE_STATUS_WINDOW = timedelta(minutes=30)  # rule B
HOURLY_WINDOW = timedelta(hours=1)             # rule C
HOURLY_MAX = 20
DAILY_WINDOW = timedelta(hours=24)             # rule D
DAILY_MAX = 60

LOOKBACK_WINDOW = DAILY_WINDOW
LOOKBACK_ROW_LIMIT = 100  # > DAILY_MAX, so a cap is always detectable


@dataclass(frozen=True)
class RecentReport:
    pharmacy_id: str
    medication_id: str
    status: str
    created_at: datetime  # timezone-aware, UTC


def check_report_rate_limit(
    recent: list[RecentReport],
    *,
    pharmacy_id: str,
    medication_id: str,
    status: str,
    now: datetime,
) -> str | None:
    """None = allow. Otherwise a short rule name for the server log.
    The rule name is NEVER returned to the client (4.5)."""
```

- **Pure function.** It takes already-fetched rows and returns a verdict;
  it never touches Supabase. That keeps it trivially testable and keeps
  every Supabase call in the router, exactly as in steps 2 and 3.
- Returns one of `"pair_cooldown"`, `"duplicate_status"`, `"hourly_cap"`,
  `"daily_cap"`, or `None`.
- `now` must be timezone-aware UTC (`datetime.now(timezone.utc)`).
- **Parsing gotcha:** PostgREST returns `created_at` as an ISO 8601
  string with an explicit offset, sometimes with fractional seconds
  (`2026-08-14T09:31:22.481233+00:00`). Parse with
  `datetime.fromisoformat` (Python 3.12 handles both the fractional form
  and a trailing `Z`) and reject/skip any row that fails to parse rather
  than crashing the request.
- **Known benign race:** two concurrent POSTs from one fingerprint can
  both pass the check and both insert. The result is one redundant
  append-only row, not a security failure. No advisory locks, no unique
  index — a unique constraint here would be wrong, since repeated reports
  over time are the entire point of the table.

### Introducing `backend/app/services/` — decided here

Steps 2 and 3 both asked the question and both answered "not yet". This
step answers **yes**, with a narrow charter:

> `backend/app/services/` holds **pure logic with no I/O**. Supabase calls,
> HTTP status codes and `HTTPException`s stay in `backend/app/routers/`.

Justification: `check_report_rate_limit` is the first piece of logic in
the project with real branching, real constants worth tuning in one place,
and a correctness property that is worth unit-testing without a database.
`reporter_identity` is cryptography and parsing — the same. Both would be
noise inside a router. Endpoints that are "one query and a sort" keep
living entirely in their router.

```
backend/app/services/
├── __init__.py
├── reporter_identity.py     # 4.3
└── report_rate_limit.py     # 4.4
```

## 4.5 API — `POST /api/medications/{slug}/pharmacies/{pharmacy_id}/reports`

### Route shape

Chosen over the flatter `POST /api/medications/{slug}/reports` with
`pharmacy_id` in the body, because:

1. It is the write counterpart of the existing
   `GET /api/medications/{slug}/pharmacies` — the resource being appended
   to is *the reports for this (medication, pharmacy) pair*.
2. Both identifiers become path parameters, so both "does not exist"
   cases are ordinary path-resolution 404s rather than body validation.
3. The body reduces to a single field, which is what "two taps" deserves.

Identifier choice: **medication by `slug`** (decision 3.18.3 — the slug is
the public key for medications and it is what the page already has in its
URL) and **pharmacy by `uuid`** (pharmacies have no slug, and
`PharmacyStock.id` in the step-3 payload already carries it).

Registered on the existing `medications` router
(`APIRouter(prefix="/api/medications", tags=["medications"])`) at
`"/{slug}/pharmacies/{pharmacy_id}/reports"`. Step 3's rule still applies:
the literal `/search` route must be declared before any `/{slug}`-shaped
route in the file.

### `backend/app/schemas/stock.py` — additions

```python
from pydantic import BaseModel, ConfigDict

# What an unauthenticated patient is allowed to assert (4.0).
# Deliberately narrower than StockStatus: 'unsure' is pharmacist-only.
PatientReportStatus = Literal["in_stock", "out_of_stock"]


class StockReportCreate(BaseModel):
    # extra="forbid" is load-bearing, not tidiness: a client that tries to
    # send reported_by / reported_at / reporter_fingerprint gets a 422
    # instead of having it silently dropped. The rejection is testable.
    model_config = ConfigDict(extra="forbid")

    status: PatientReportStatus


class StockReportCreated(BaseModel):
    id: UUID
    medication_id: UUID
    medication_slug: str
    pharmacy_id: UUID
    status: StockStatus
    reported_at: datetime
    reported_by: ReportSource  # always "patient" in this step
```

`reporter_fingerprint` is **never** part of any response model. The
response is assembled field by field from the inserted row — do not spread
the PostgREST row into the model.

### Server-set fields — never trusted from the client

| Field | Set by | Why |
| --- | --- | --- |
| `reported_by` | Hard-coded `'patient'` in the handler | The patient/pharmacist distinction is the product's core trust signal ("Signalé par un patient" vs "Confirmé par la pharmacie", §3.12). Once step 5 adds real pharmacist auth, an endpoint that ever accepted a client-supplied value would be a privilege-escalation bug. |
| `reported_at` | **Omitted from the insert**, so the column default `now()` fires in Postgres | Stronger than computing it in Python: there is no code path that could pass a value. Kills backdating (making a report look older, to be discarded as stale) and future-dating (pinning a pair to one status forever, since `order by reported_at desc` would keep picking it). The existing `stock_reports_not_in_future` check is the belt; this is the braces. |
| `created_at` | Column default | The rate-limit clock. |
| `reporter_fingerprint` | Derived server-side from the connection (4.3) | Client-supplied would be pointless. |
| `id` | `gen_random_uuid()` | Decision 2.12.3. |

### Handler flow

The order matters, both for correct status codes and so an unknown
pharmacy cannot consume a rate-limit slot.

1. **FastAPI validation → 422.**
   - `slug: str = Path(..., min_length=1, max_length=80, pattern=r"^[a-z0-9]+(-[a-z0-9]+)*$")`
   - `pharmacy_id: UUID = Path(...)`
   - body `StockReportCreate` (rejects `unsure`, unknown fields, missing
     `status`).
2. **Resolve the medication → 404.**
   `.table("medications").select("id,slug").eq("slug", slug).eq("is_active", True).limit(1)`
   → empty ⇒ `HTTPException(404, "medication not found")` (same string as
   step 3's GET, deliberately).
3. **Resolve the pharmacy → 404.**
   `.table("pharmacies").select("id").eq("id", str(pharmacy_id)).limit(1)`
   → empty ⇒ `HTTPException(404, "pharmacy not found")`.
4. **Resolve the fingerprint.** `resolve_client_ip` → no IP at all ⇒
   `logger.error` + `HTTPException(503, "stock reporting temporarily unavailable")`.
   Failing closed is correct: an unlimited write path is worse than a
   temporarily unavailable one, and under uvicorn this cannot happen
   outside a misconfiguration.
5. **Rate-limit query + `check_report_rate_limit` → 429.** On rejection:
   `logger.warning("stock report rejected rule=%s fp=%s", rule, fingerprint[:8])`
   then `HTTPException(429, "too many recent reports from this device")`.
6. **Insert → 201.**

```python
inserted = (
    get_supabase()
    .table("stock_reports")
    .insert(
        {
            "pharmacy_id": str(pharmacy_id),
            "medication_id": str(medication_id),
            "status": body.status,
            "reported_by": "patient",
            "reporter_fingerprint": fingerprint,
            # reported_at / created_at deliberately omitted: DB defaults.
        }
    )
    .execute()
).data
```

`supabase-py` returns the inserted representation; read `id`,
`reported_at` and `status` from it and build `StockReportCreated`
explicitly. If `data` is empty, treat it as a failure (503).

Handler is **`def`, not `async def`** — `supabase-py` is synchronous
(step 2's rule, unchanged).

### Status codes and bodies

| Code | When | Body (`{"detail": …}`) |
| --- | --- | --- |
| **201** | Report written | `StockReportCreated` |
| **404** | Unknown or inactive slug | `medication not found` |
| **404** | Unknown pharmacy id | `pharmacy not found` |
| **422** | Bad slug shape, non-UUID pharmacy id, missing/unknown `status`, `status: "unsure"`, any extra field | FastAPI's validation body |
| **429** | Any of rules A–D | `too many recent reports from this device` |
| **503** | Supabase unreachable, insert returned nothing, or no client IP | `stock reporting temporarily unavailable` |

- **The 429 body is uniform across all four rules and contains no
  numbers, no window lengths and no rule name.** An abuser must not be
  able to read the response and tune around the limits; a legitimate user
  needs only one French sentence, which the frontend chooses by status
  code (decision 2.12.8). The rule name goes to the server log only.
- **No `Retry-After` header**, for the same reason: on the volume rules
  it would disclose the quota window exactly.
- **`Cache-Control: no-store`** on the 201, so no intermediary can ever
  replay or cache a write response.
- Errors follow decision 2.12.8: `HTTPException`, sanitised English
  `detail`, never rendered to the user.

### 201 example

```json
{
  "id": "3f1c8b2a-6d4e-4f0a-9b21-77c0d5e9a114",
  "medication_id": "10000000-0000-4000-8000-000000000001",
  "medication_slug": "levothyrox-50",
  "pharmacy_id": "00000000-0000-4000-8000-000000000003",
  "status": "in_stock",
  "reported_at": "2026-08-14T10:12:04.481233+00:00",
  "reported_by": "patient"
}
```

That payload is exactly what the frontend needs for its optimistic patch
(4.6) — status, instant and source, all authoritative rather than
guessed. No `Location` header is set: there is no
`GET /api/stock-reports/{id}` and inventing one would expose the
append-only log row by row.

### `main.py` / CORS

**No change.** Step 1's `CORSMiddleware` already lists `POST` and
`OPTIONS` in `allow_methods`, and `allow_headers=["*"]` covers the
`Content-Type: application/json` preflight. `allow_credentials` stays
`False` — this endpoint sends no cookies. Worth restating (4.1): CORS is
not a control here, it is browser ergonomics.

## 4.6 Cache invalidation — making the reporter's own report appear

This is the hard part of the step, and step 3 §3.0.1 pre-committed to
solving it here: *"the frontend calls `router.refresh()` (and/or the API
triggers an on-demand `revalidatePath`) so their report appears
immediately."*

### Why `router.refresh()` alone does nothing

Three caches sit between the report and the pixels:

| Cache | Set by | Effect |
| --- | --- | --- |
| Client Router Cache | Next.js, per browser | Holds RSC payloads for visited segments |
| **Next.js Data Cache** | `getMedicationStock()` passing `next: { revalidate: 60 }` | Server-side, shared across all users and requests, keyed by URL + options |
| Full Route Cache (ISR) | `export const revalidate = 60` on `/medicaments/[slug]/page.tsx` | The rendered HTML/RSC output for the route |

`router.refresh()` clears the *client* router cache and asks the server to
re-render the route. The server re-render calls `getMedicationStock(slug)`
again — which hits the **Data Cache entry that is still fresh for up to
60 more seconds** and returns byte-identical JSON. The user sees exactly
what they saw before. `router.refresh()` is therefore a no-op for
freshness here, and this spec **amends** the step-3 promise accordingly.

### Why the write must not go through a Server Action

The obvious App Router answer — a Server Action that POSTs to FastAPI and
then calls `revalidatePath` — is **wrong for this endpoint**, and the
reason is 4.3:

> A Server Action runs on Vercel. The POST to Render would originate from
> a Vercel serverless function, so `CF-Connecting-IP` at the Render edge
> would be **Vercel's** address. Every report from every patient would
> collapse into one fingerprint per Vercel region, and rules C/D would
> block the entire user base within an hour.

Forwarding the real client IP from the action in a signed custom header
would work, but it means inventing a shared-secret header trust scheme
between two of our own services, plus a second hop on the critical path,
to solve a problem that does not exist if the browser posts directly.
Rejected.

**Therefore: the browser POSTs directly to FastAPI**, cross-origin,
exactly as `ApiStatus` has done since step 1 — through
`frontend/src/lib/api.ts`, which remains the sole fetch chokepoint.

### The chosen mechanism, end to end

Three parts. Each solves a different half-second of the problem.

**1. Authoritative optimistic patch — instant, no cache involved.**
On 201, `StockResults` stores the returned
`{status, reported_at, reported_by}` in local state keyed by pharmacy id
and merges it over the server-supplied `pharmacies` prop. Badge, map pin
colour, timestamp line and summary all update in the same React commit.
This is not a guess: the values are the ones the database wrote. Cost to
other visitors: zero.

**2. A `"use server"` action that purges the shared cache.**
`frontend/src/lib/actions/stock.ts`:

```ts
"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { medicationStockTag } from "@/lib/api";

const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export async function revalidateMedicationStock(slug: string): Promise<void> {
  if (typeof slug !== "string" || slug.length > 80 || !SLUG_PATTERN.test(slug)) {
    return;
  }
  revalidateTag(medicationStockTag(slug));
  revalidatePath(`/medicaments/${slug}`);
}
```

Both calls, deliberately, because they target the two different caches
identified above:

- `revalidateTag("medication-stock:<slug>")` expires the **Data Cache**
  entry — the one that would otherwise hand the same JSON back to a
  re-render for up to 60 s. This requires the tag to be attached at fetch
  time, which is a new `tags` option on `getMedicationStock()` (4.7).
- `revalidatePath("/medicaments/<slug>")` expires the **Full Route
  Cache** entry — the rendered output that Vercel would otherwise serve
  to the next visitor without re-rendering at all.

Because the action is invoked from a Client Component inside that route,
Next.js returns a freshly rendered RSC payload with the action's response
and the router applies it — so the page also reconciles against real
server data a moment later, with no `router.refresh()` call. The merge
rule in part 1 uses timestamps (`Date.parse`, not string comparison), so
when the server payload catches up it wins and the local entry becomes
inert. **No flicker, no double source of truth.**

**3. Only the report path pays.** No visitor who does not report
triggers a revalidation; ISR keeps serving cached HTML to everyone else
exactly as in step 3. A revalidation costs one re-render plus one fetch to
Render on the *next* request for that path — and that Render instance was
just woken by the POST seconds earlier, so the cold-start risk that
normally argues against invalidation does not apply here. The report even
warms the cache for other users, which is the behaviour we want anyway.

### Rejected alternatives, and why

| Alternative | Why not |
| --- | --- |
| `router.refresh()` only (the step-3 promise) | Re-renders against an unexpired Data Cache entry. Genuinely does nothing. |
| Drop `getMedicationStock` to `cache: "no-store"` | Every visitor pays a live Render round trip — up to ~50 s on a cold start — to fix a problem that affects only the person who just tapped a button. Directly contradicts decision 2.12.9. |
| Per-user `no-store` via a cookie set after a report | Requires making the route dynamic (`cookies()` opts out of static rendering), which disables ISR for that user's whole session, not just the moment after their report — and adds a cookie to a project that has none. |
| `sessionStorage` write-flag replayed on mount | Would survive a reload without any cache work, but creates a second source of truth that can disagree with the server, and it is unnecessary once the shared cache is actually purged. |
| Supabase Realtime | Declined project-wide in 3.0.1. Nothing here reopens that. |
| A Next.js Route Handler under `app/api/…` instead of a Server Action | Would work, but step 1's non-goal ("no API routes in Next.js — the backend is FastAPI") is worth keeping literally true. A Server Action is not a data API; it is the documented way to call `revalidate*` from the client. |

### Exposure of the Server Action

Server Action endpoints are publicly invocable in every Next.js app;
that is inherent, not a flaw introduced here. The exposure of *this* one:
an attacker can force repeated cache invalidation for medication pages.
`revalidatePath`/`revalidateTag` perform no fetching themselves — the cost
is only paid when a real visitor next requests the page, and it is one
FastAPI call on a free tier with no per-request billing. Bounded by 26
slugs. The action validates the slug shape, does nothing else, returns
nothing, and never touches the database or FastAPI. Accepted; noted in
4.16.

## 4.7 Frontend — file inventory and `api.ts`

```
frontend/src/
├── app/
│   └── medicaments/[slug]/
│       └── page.tsx                 # modified — summary/banner move into StockResults
├── components/
│   ├── StockResults.tsx             # modified — report state, merge, summary, banner
│   ├── StockPharmacyList.tsx        # modified — pass report props through
│   ├── StockPharmacyListItem.tsx    # modified — hosts <StockReportButtons />
│   ├── StockMap.tsx                 # modified — popup hosts <StockReportButtons />
│   └── StockReportButtons.tsx       # new — the two-tap control
└── lib/
    ├── api.ts                       # modified — POST support, tags, reportStock()
    ├── stock.ts                      # modified — classifyReportError, ReportErrorKind
    ├── actions/
    │   └── stock.ts                 # new — "use server" revalidation action
    └── i18n/fr.ts                    # modified — `report` namespace, one deletion
```

**No new npm dependencies.** No toast library, no form library, no state
manager. (Step 3's rule, still binding.)

### `frontend/src/lib/api.ts` — modifications

1. `FetchOptions` gains three fields:

```ts
type FetchOptions = {
  revalidate?: number;
  tags?: string[];          // NEW — Next Data Cache tags, for on-demand purge
  timeoutMs?: number;       // default 60_000
  signal?: AbortSignal;
  method?: "GET" | "POST";  // NEW — default "GET"
  body?: unknown;           // NEW — JSON-serialised when present
};
```

Rules inside `fetchJson`, exactly:

- `method: "POST"` ⇒ always `cache: "no-store"`, never `next: {…}`.
  Writes are never cached and Next errors if both are supplied.
- `body` present ⇒ `headers: { "Content-Type": "application/json" }` and
  `JSON.stringify(body)`.
- `revalidate` present ⇒ `next: { revalidate, ...(tags ? { tags } : {}) }`.
- Everything else (the `ApiError` throw on non-2xx, `AbortSignal.any`
  composition, the 60 s default timeout) is unchanged.

2. The cache tag helper — one definition, used by both the fetch and the
   Server Action, so they can never drift:

```ts
export function medicationStockTag(slug: string): string {
  return `medication-stock:${slug}`;
}
```

3. `getMedicationStock` gains the tag (its only change):

```ts
// GET /api/medications/{slug}/pharmacies
// { revalidate: 60, tags: [medicationStockTag(slug)] }
```

4. The write:

```ts
export type PatientReportStatus = "in_stock" | "out_of_stock";

export type StockReportCreated = {
  id: string;
  medication_id: string;
  medication_slug: string;
  pharmacy_id: string;
  status: StockStatus;
  reported_at: string;      // ISO 8601 with offset
  reported_by: ReportSource; // always "patient" today
};

export function reportStock(
  slug: string,
  pharmacyId: string,
  status: PatientReportStatus,
  signal?: AbortSignal,
): Promise<StockReportCreated>;
// POST {base}/api/medications/{slug}/pharmacies/{pharmacyId}/reports
// body: { status }
// method: "POST", timeoutMs: 60_000
// both path segments through encodeURIComponent
```

The 60 s timeout is the default, not the typeahead's 10 s: a report that
fails because a free-tier instance was waking up is a lost contribution
and a user who believes the site is broken. The UI covers the wait with an
explicit cold-start message instead (4.8).

`reportStock` is called **from the browser** (a Client Component). That is
required by 4.6 and is consistent with `ApiStatus` since step 1. It is
still the only way any component reaches the backend.

### `frontend/src/lib/stock.ts` — additions

```ts
import { ApiError } from "@/lib/api";

export type ReportErrorKind = "rate_limited" | "not_found" | "network" | "generic";

export function classifyReportError(error: unknown): ReportErrorKind {
  if (error instanceof ApiError) {
    if (error.status === 429) return "rate_limited";
    if (error.status === 404) return "not_found";
    return "generic";       // 422, 500, 503, anything else
  }
  return "network";         // fetch rejection, timeout, offline
}

/** How long the browser waits before telling the user the free-tier
 *  server may be waking up. Mirrors step 1's apiStatus.coldStart. */
export const REPORT_SLOW_AFTER_MS = 6_000;
```

`STOCK_STATUSES`, `STOCK_STYLES` and `STALE_AFTER_HOURS` are unchanged.

## 4.8 Frontend — the two-tap UI

### Where the buttons live: both the list and the map popup

**Decision: the list card and the map popup both get the control, and it
is the same component driven by the same lifted state.**

Reasoning:

- The list alone would strand mobile users. On a 360 px screen the map is
  a full-pane view (decision 2.12.10); a patient who tapped a pin to see
  which pharmacy it is would have to switch to Liste, find the card and
  tap again — four taps, in a flow the brief specifies as two.
- Duplication is not a real cost here, because the report state has to be
  lifted to `StockResults` anyway for the optimistic merge (4.6). Both
  surfaces render `<StockReportButtons />` against that one state, so they
  can never disagree: report from the popup and the list card behind it is
  already showing "Merci".
- The popup variant stacks the buttons vertically (`layout="column"`);
  Leaflet popups are ~220 px wide.

### `StockReportButtons.tsx` (client component, new)

```ts
type StockReportButtonsProps = {
  pharmacyId: string;
  pharmacyName: string;              // for the group's aria-label only
  state: ReportUiState;
  onReport: (pharmacyId: string, status: PatientReportStatus) => void;
  onReset: (pharmacyId: string) => void;
  layout?: "row" | "column";         // default "row"
};

type ReportUiState = {
  phase: "idle" | "sending" | "done" | "error";
  slow: boolean;
  status?: PatientReportStatus;      // what was tapped
  error?: ReportErrorKind;
};
```

Container: `<div className="mt-3 border-t pt-3">`, opening with
`<p className="text-xs text-muted">{dict.report.prompt}</p>`.

The buttons themselves sit in
`<div role="group" aria-label={dict.report.buttonsAriaLabel(pharmacyName)}>`
— without it a screen-reader user meets "Disponible ici" twelve times with
no context.

| Phase | Rendering |
| --- | --- |
| `idle` | Two `<button type="button">`. Row layout: `flex gap-3`, each `min-h-11 flex-1 rounded-lg border px-3 text-sm font-medium`. In-stock button: `border-stock-in text-stock-in`. Out-of-stock: `border-stock-out text-stock-out`. Outlined, not filled — the brief's "calm, not flashy" requirement, and filled green/red buttons next to a green/red status badge read as the current state rather than as actions. |
| `sending` | Both buttons `disabled` + `disabled:opacity-60 disabled:cursor-not-allowed`, `aria-busy="true"` on the group. The tapped button's label becomes `dict.report.sending`. |
| `sending` + `slow` | Additionally `<p className="mt-2 text-xs text-muted">{dict.report.slow}</p>`, after `REPORT_SLOW_AFTER_MS`. |
| `done` | Buttons are **replaced** by `<p role="status" className="mt-2 text-sm text-stock-in">{dict.report.thanks(dict.stock.status[state.status])}</p>` and, below it, a small `<button type="button" className="mt-1 text-xs text-brand-600 underline">{dict.report.correct}</button>` calling `onReset`. |
| `error` | Buttons stay rendered in their `idle` form (retry is one tap) with `<p role="alert" className="mt-2 text-sm text-stock-out">{dict.report.errors[state.error]}</p>` above them. |

Design notes:

- **The success message names what was recorded** —
  "Merci — enregistré comme « En rupture »." — using the existing
  `dict.stock.status` labels. A mis-tap is noticed in the moment rather
  than discovered by someone travelling across town, and `Corriger` gives
  a way out (subject to the 60 s pair cooldown, whose 429 copy is honest
  about the wait). This is the whole reason rule A is 60 s and not 5
  minutes (4.4).
- **Button copy vs badge copy differ on purpose.** The button says
  "Pas disponible ici" (what the patient observed); the badge says
  "En rupture" (the derived state). Both strings already read naturally
  in French and conflating them would make the button sound like a
  clinical judgement.
- **No confirmation dialog, no undo, no toast library.** "Two taps"
  means the tap *is* the submission. Feedback is inline in the card the
  user just touched, which on mobile is the only place they are looking.
- The buttons are rendered for **every** status including `in_stock` —
  confirming an existing report with a fresh timestamp is valuable, and
  rule B stops it from being spammed.

### `StockResults.tsx` (modified) — the owner of all report state

New props: `medicationSlug: string` (already receives `medicationName`
from step 3 for the map's aria-label), plus `summary` is no longer needed
from the page because it is computed here (see the amendment below).

```ts
type LocalReport = { status: StockStatus; reported_at: string; reported_by: ReportSource };

const [localReports, setLocalReports] = useState<Record<string, LocalReport>>({});
const [reportUi, setReportUi] = useState<Record<string, ReportUiState>>({});
```

**Merge (the rule that makes 4.6 flicker-free):**

```ts
const merged = useMemo(
  () =>
    pharmacies.map((p) => {
      const local = localReports[p.id];
      if (!local) return p;
      const serverAt = p.reported_at ? Date.parse(p.reported_at) : Number.NEGATIVE_INFINITY;
      // Server wins on ties: once the revalidated payload contains this
      // report, the local copy stops overriding and becomes inert.
      if (Date.parse(local.reported_at) <= serverAt) return p;
      return { ...p, ...local };
    }),
  [pharmacies, localReports],
);
```

Use `Date.parse`, never string comparison — the API emits fractional
seconds inconsistently and lexicographic ordering of ISO strings is a trap
here.

`merged` is what feeds `StockPharmacyList`, `StockMap`, the summary line
and the count line. Nothing downstream knows a report happened.

**Summary, recomputed from `merged`:**

```ts
const summary = useMemo(
  () => merged.reduce<StockSummary>(
    (acc, p) => ({ ...acc, [p.status]: acc[p.status] + 1 }),
    { in_stock: 0, out_of_stock: 0, unsure: 0, none: 0 },
  ),
  [merged],
);
```

**Handler:**

```ts
async function handleReport(pharmacyId: string, status: PatientReportStatus) {
  if (reportUi[pharmacyId]?.phase === "sending") return;          // idempotent guard
  setReportUi((s) => ({ ...s, [pharmacyId]: { phase: "sending", slow: false, status } }));

  const slowTimer = setTimeout(() => {
    setReportUi((s) =>
      s[pharmacyId]?.phase === "sending"
        ? { ...s, [pharmacyId]: { ...s[pharmacyId], slow: true } }
        : s,
    );
  }, REPORT_SLOW_AFTER_MS);

  try {
    const created = await reportStock(medicationSlug, pharmacyId, status);
    setLocalReports((s) => ({
      ...s,
      [pharmacyId]: {
        status: created.status,
        reported_at: created.reported_at,
        reported_by: created.reported_by,
      },
    }));
    setReportUi((s) => ({ ...s, [pharmacyId]: { phase: "done", slow: false, status } }));
    // Freshness is best-effort and must never block or undo the feedback
    // the user has already been given.
    try {
      await revalidateMedicationStock(medicationSlug);
    } catch {
      /* ignore: the optimistic patch already shows the truth */
    }
  } catch (error) {
    setReportUi((s) => ({
      ...s,
      [pharmacyId]: { phase: "error", slow: false, error: classifyReportError(error) },
    }));
  } finally {
    clearTimeout(slowTimer);
  }
}
```

Ordering is deliberate: the local patch and the `done` phase are set
**before** the revalidation is awaited, so perceived latency is one
network round trip, not two. `onReset` sets
`{ phase: "idle", slow: false }`.

New render order inside `StockResults` (everything above the existing
`ViewToggle`):

1. `<p className="text-sm text-muted">{dict.stock.pharmacyCount(merged.length)}</p>` *(existing)*
2. `{dict.stock.summary(summary.in_stock, merged.length)}` *(moved here from `page.tsx`)*
3. When `summary.in_stock + summary.out_of_stock + summary.unsure === 0`:
   `{dict.stock.noReportsAtAll}` *(moved here from `page.tsx`)*
4. `<p className="text-sm text-muted">{dict.report.invite}</p>` *(new)*
5. `<ViewToggle …>`, `<StockLegend />`, the two panes *(existing)*

### `StockPharmacyList.tsx` / `StockPharmacyListItem.tsx` (modified)

`StockPharmacyList` gains three pass-through props (`reportUi`,
`onReport`, `onResetReport`) and forwards them per item. No layout change.

`StockPharmacyListItem` renders `<StockReportButtons layout="row" … />` as
the **last** element of the card, after the "Voir sur la carte" button.
Order matters: the phone link stays the visually primary action (§3.11
item 5 — it is what the disclaimer asks the patient to do *before*
travelling), and reporting is what they do *after*.

### `StockMap.tsx` (modified)

Same three new props, forwarded into each marker's popup node, which
becomes: name, `<StockStatusBadge />`, `<StockReportTime />` (when a
report exists), address, `tel:` link, then
`<StockReportButtons layout="column" … />`.

Two Leaflet notes for the developer:

- Popup children are ordinary React and re-render normally when the
  lifted state changes, so a report made from the popup updates the
  popup in place. `MapView`/`MapViewInner` need **no change** — the popup
  is already an opaque `React.ReactNode` on `MapMarker` (§3.11).
- **Contingency, only if observed:** if a click inside the popup does not
  reach the button (Leaflet event interception), wrap the buttons in
  `<div onClick={(e) => e.stopPropagation()}>`. Do not add it
  pre-emptively.

### `frontend/src/app/medicaments/[slug]/page.tsx` (modified)

- Pass `medicationSlug={data.medication.slug}` to `<StockResults />`.
- **Remove** the summary line and the zero-report banner from the page
  (render-order item 4 in §3.11) — they now live in `StockResults`
  because they must reflect the merged, post-report state. Visual order on
  screen is unchanged.
- `export const revalidate = 60` is **unchanged**.
- `<Disclaimer />` placement is unchanged and still required.

## 4.9 French copy — `frontend/src/lib/i18n/fr.ts`

New `report` namespace. No user-visible string is hard-coded in a
component (step 1 rule); parameterised copy is a function (2.12.12).

```ts
report: {
  prompt: "Vous venez d'y passer ?",
  inStock: "Disponible ici",
  outOfStock: "Pas disponible ici",
  sending: "Envoi…",
  slow: "Le serveur gratuit peut mettre jusqu'à une minute à répondre.",
  thanks: (status: string) => `Merci — enregistré comme « ${status} ».`,
  correct: "Corriger",
  invite:
    "Vous sortez d'une pharmacie ? Indiquez si le médicament y était disponible : cela aide les autres patients.",
  buttonsAriaLabel: (pharmacy: string) =>
    `Signaler la disponibilité à ${pharmacy}`,
  errors: {
    rate_limited:
      "Vous avez déjà signalé cette pharmacie récemment. Patientez quelques minutes avant un nouveau signalement.",
    not_found:
      "Cette pharmacie ou ce médicament n'est plus disponible. Rechargez la page.",
    network:
      "Signalement non enregistré : connexion impossible. Réessayez.",
    generic:
      "Le signalement n'a pas pu être enregistré. Réessayez dans un instant.",
  },
},
```

Copy notes:

- `errors.rate_limited` must read as *"you already did this"*, never as
  an error. It is the message a normal user is most likely to see (a
  double-tap), and it is deliberately vaguer than the real 60 s window.
- One 429 string covers all four rules, because the API deliberately does
  not distinguish them (4.5). It is true in every case.
- `thanks` composes with `dict.stock.status[...]`, so the two surfaces
  can never disagree about what "in_stock" is called in French.
- `report.slow` reuses step 1's honest cold-start framing rather than
  pretending the wait is normal.

**Deletion:** `stock.reportingSoon` ("La possibilité de signaler une
disponibilité arrive prochainement.") is **removed** — as of this step it
is false. Its only usage, the zero-report banner, now shows
`stock.noReportsAtAll` followed by `report.invite`.

`Dictionary = typeof fr` picks up the new namespace, the nested `errors`
record and the function types automatically. `getDictionary` is unchanged.
`ReportErrorKind` and the keys of `report.errors` must stay in step — the
component indexes `dict.report.errors[kind]` directly.

## 4.10 Page-level states — what the patient sees when

| Situation | What is rendered |
| --- | --- |
| Page loads | Every card and popup shows `report.prompt` + the two buttons, whatever the current badge says. |
| Tap in flight | Both buttons disabled, tapped one reads `Envoi…`. |
| In flight > 6 s (cold start) | Additionally `report.slow`. |
| 201 | Badge, pin colour, timestamp line, summary and count update instantly; buttons replaced by `report.thanks(...)` + `Corriger`. |
| 201, then the user reloads | Their report is still there — the Data Cache and route cache were purged (4.6). |
| Another visitor loads the page after a report | Sees the new report on the next request, not up to 60 s later. |
| 429 (double-tap, or a correction attempted too soon) | `report.errors.rate_limited`, buttons return to idle. |
| 404 (stale page, medication deactivated) | `report.errors.not_found`. |
| Offline / timeout | `report.errors.network`. |
| 503 / any other status | `report.errors.generic`. |
| `Corriger` tapped | Card returns to idle; the badge keeps showing the reported status until a new report lands. |

`<Disclaimer />` remains on the page, unchanged and unmoved. Nothing in
this step is allowed to push it below the fold at 360 px.

## 4.11 Environment, config and deployment changes

### `backend/app/config.py` — two new fields

| Field | Type | Required | Default | Notes |
| --- | --- | --- | --- | --- |
| `report_fingerprint_secret` | `str` | **yes** | — | `Field(min_length=32)`. Missing or short ⇒ the app must fail to boot (step 1's fail-fast rule). |
| `client_ip_header` | `str \| None` | no | `None` | Lower-cased before use. Empty/unset ⇒ trust nothing but the socket (4.3). |

### `backend/.env.example` — two new rows

| Variable | Required | Example | Notes |
| --- | --- | --- | --- |
| `REPORT_FINGERPRINT_SECRET` | yes | `change-me-to-a-long-random-string` | Secret. Keys the reporter fingerprint HMAC. Generate with `python -c "import secrets; print(secrets.token_urlsafe(48))"`. Different values per environment are fine and expected. Rotating it resets all rate-limit windows. |
| `CLIENT_IP_HEADER` | no | *(empty locally)* | On Render: `cf-connecting-ip`. Leave empty anywhere the app is not behind a proxy that overwrites the header — see ARCHITECTURE.md 4.3. |

### `render.yaml` — two new `envVars`

```yaml
      - key: CLIENT_IP_HEADER
        value: cf-connecting-ip
      - key: REPORT_FINGERPRINT_SECRET
        generateValue: true
```

`generateValue: true` has Render mint a random value once, so the secret
never exists in the repo, in a chat log or in anyone's clipboard. Nothing
needs to read it back.

`frontend/` needs **no new environment variables**.

### `supabase/README.md`

Add `20260814100000_add_stock_report_abuse_controls.sql` to the ordered
"How to apply" list, after `20260814090200_…`, and one line to the Rules
section: *"`stock_reports.reporter_fingerprint` is a keyed hash — never
store, log or expose a raw IP address."*

`supabase/seed.sql` is **not modified**. Existing seed rows keep
`reporter_fingerprint = null`, which is correct: they were not written by
the public endpoint. The seeded `unsure` rows also stay — they exercise a
display path that step 5 will start writing for real (4.0).

## 4.12 Amendments to earlier steps

Recorded here rather than by editing steps 1–3, per this document's
preamble.

1. **Decision 3.18.1 / §3.0.1 amended.** The promised replacement for
   Realtime was "`router.refresh()` (and/or an on-demand
   `revalidatePath`)". `router.refresh()` **on its own does not work** —
   it re-renders against an unexpired Data Cache entry (4.6). The
   mechanism is: browser POST → optimistic patch from the 201 body →
   `"use server"` action calling `revalidateTag` + `revalidatePath`. No
   `router.refresh()` call exists anywhere. The Realtime decision itself
   is **unchanged**: still no Realtime, still no
   `@supabase/supabase-js`, still no anon-key usage, still no websocket.
2. **Step 1 non-goal "no API routes in Next.js" — clarified, not
   broken.** No `app/api/…` route handler is added. A `"use server"`
   action module is added at `frontend/src/lib/actions/stock.ts`; it performs
   cache invalidation only and never talks to FastAPI or Supabase.
3. **§3.11 render order changed.** The summary line and the
   zero-report banner move from `medicaments/[slug]/page.tsx` into
   `StockResults`, because they must reflect the post-report merged state.
   On-screen order is unchanged.
4. **`stock.reportingSoon` deleted** from the dictionary (4.9).
5. **Steps 2/3's "no `services/` layer yet" answered:**
   `backend/app/services/` exists from this step, for pure logic only (4.4).
6. **§3.3's deferred columns delivered:** `reporter_fingerprint` +
   `stock_reports_fingerprint_recent` (4.2). The mirror index
   `(pharmacy_id, medication_id, reported_at desc)` is still deferred to
   step 5, as planned.

## 4.13 Acceptance test — step 4 is done when all of these pass

Database:

1. The migration applies cleanly to the hosted project and re-applying it
   is a no-op (no errors, no duplicate constraint).
2. `insert into public.stock_reports (pharmacy_id, medication_id, status, reported_by, reporter_fingerprint) values (…, 'not-hex')`
   is rejected by `stock_reports_fingerprint_format`.
3. `explain analyze select … from public.stock_reports where reporter_fingerprint = '…' and created_at >= now() - interval '24 hours' order by created_at desc limit 100;`
   uses `stock_reports_fingerprint_recent` (an index scan, not a seq
   scan).
4. As the anon role (`set local role anon;`), `insert into
   public.stock_reports …` **fails** with permission denied — the write
   path is still service-role-only.
5. `select count(*) from public.stock_reports where reporter_fingerprint is not null;`
   is 0 immediately after applying the migration to a seeded database.

API:

6. `POST /api/medications/levothyrox-50/pharmacies/00000000-0000-4000-8000-000000000003/reports`
   with `{"status":"in_stock"}` → **201**, and the response's
   `reported_by` is `"patient"`, `reported_at` is within a second of now,
   and **no `reporter_fingerprint` field appears anywhere in the body**.
7. The same call with `{"status":"unsure"}` → **422**. With
   `{"status":"in_stock","reported_by":"pharmacist"}` → **422**. With
   `{"status":"in_stock","reported_at":"2020-01-01T00:00:00Z"}` → **422**.
   (Proves `extra="forbid"` and the narrowed patient enum.)
8. Immediately repeating call 6 → **429** with body exactly
   `{"detail": "too many recent reports from this device"}` — no numbers,
   no rule name, and **no `Retry-After` header**.
9. `POST …/medications/does-not-exist/pharmacies/<valid uuid>/reports` →
   404 `medication not found`;
   `POST …/medications/levothyrox-50/pharmacies/00000000-0000-4000-8000-0000000000ff/reports`
   → 404 `pharmacy not found`;
   `…/pharmacies/not-a-uuid/reports` → 422.
10. Booting the API with `REPORT_FINGERPRINT_SECRET` unset **fails at
    startup** with a readable message — it does not boot and serve
    unlimited writes.
11. **The Render header check.** On the deployed API, `GET /health/client`
    from a laptop on Wi-Fi and from a phone on mobile data returns **two
    different `fingerprint_prefix` values**, and `ip_source` is
    `cf-connecting-ip` in both. If the two prefixes match, `CLIENT_IP_HEADER`
    is wrong and every user shares one rate-limit bucket — stop and fix
    before shipping. The response contains no IP address.
12. `curl -X POST` (no `Origin` header, no browser) against the deployed
    endpoint succeeds once and is 429'd on the immediate repeat —
    confirming the limit is server-side and not a CORS artefact (4.1).
13. `/docs` lists the new POST with `StockReportCreate` /
    `StockReportCreated`, and with `SUPABASE_URL` pointed at an
    unreachable host it returns 503 with a sanitised `detail`.
14. The server log for a rejected report contains the rule name and an
    8-character fingerprint prefix — and **no IP address and no full
    fingerprint** anywhere in the logs.

Frontend, local:

15. `npm run build` and `npm run lint` succeed; no `window is not defined`
    and no "params not awaited" warning.
16. At 360 px on `/medicaments/levothyrox-50`: the disclaimer is visible
    without scrolling, `report.invite` is shown, and each card ends with
    the two buttons at ≥ 44 px tall with no horizontal overflow.
17. Tapping **Disponible ici** on a card badged *En rupture*: the button
    shows `Envoi…`, then the badge flips to **Disponible**, the timestamp
    line reads "Signalé par un patient à l'instant", the map pin for that
    pharmacy turns green, the summary count increments, and the buttons
    are replaced by "Merci — enregistré comme « Disponible »." — all
    without a page reload.
18. **Reload that page immediately.** The report is still there. (This is
    the cache-invalidation proof — with `revalidateTag`/`revalidatePath`
    removed, it would revert for up to 60 s.)
19. Open the same URL in a second browser profile right after a report:
    the new status is visible without waiting 60 s.
20. Tapping the opposite button within a minute shows
    `report.errors.rate_limited` and the buttons return; the wording does
    not read as a crash. After ~a minute the correction succeeds.
21. Report from a **map popup**: the popup content updates in place and
    the list card behind it shows the same "Merci" state.
22. With the FastAPI server stopped, tapping a button shows
    `report.errors.network` after the timeout and the buttons return —
    no unhandled rejection in the console, no blank page.
23. `Corriger` returns the card to the two buttons without changing the
    badge.
24. The browser Network tab shows the POST going to the `onrender.com`
    host — **not** to a Vercel function or an `/api/…` Next route — and
    still **no requests to `*.supabase.co`** and no websocket
    (decisions 2.12.1 / 3.0.1 still hold).

Production:

25. The whole of 17–21 passes on the Vercel deployment against the Render
    API, from a real phone on mobile data.
26. `select status, reported_by, reporter_fingerprint is not null as has_fp
    from public.stock_reports order by created_at desc limit 5;` in the
    Supabase SQL editor shows the reports just made, all with
    `reported_by = 'patient'` and `has_fp = true`.

Developer note: because localhost resolves every request to `127.0.0.1`,
one fingerprint covers all local testing — the 60 s pair cooldown will
fire during manual QA. That is the feature working. To reset, run
`delete from public.stock_reports where reporter_fingerprint is not null;`
against the dev database.

## 4.14 Explicit non-goals for step 4

- **No auth of any kind.** No `pharmacist_accounts`, no magic link, no
  protected route, no session, no cookie. (Step 5.)
- **No three-way toggle for patients**, no `unsure` button, no
  pharmacist-specific reporting UI, no `verified` badge. (4.0 / §2.8.)
- **No CAPTCHA, no hCaptcha/Turnstile, no third-party abuse or bot
  service, no IP reputation lookup.** Not in the stack, not brief-
  justified at MVP scale.
- **No edit or delete of existing reports.** `stock_reports` stays
  append-only (decision 3.18.5): a correction is a new row, latest wins.
  No `PATCH`, no `DELETE`, no soft-delete flag.
- **No report history or audit UI for patients.** No "mes signalements",
  no per-pair report list, no "3 personnes ont signalé ceci".
- **No moderation tooling** — no flag/report-abuse button, no admin
  screen, no automatic outlier detection.
- **No notify-me**, no `subscriptions` table, no Resend. (Step 6.)
- **No prescription upload**, no Storage bucket. (Step 7.)
- **No Realtime, no `@supabase/supabase-js`, no polling loop.** (3.0.1,
  reaffirmed in 4.12.1.)
- **No global (all-fingerprint) rate limit**, no per-pair limit across
  different reporters, no Redis/Upstash counter. The per-fingerprint DB
  rules are the whole mechanism.
- **No retention job** for `reporter_fingerprint`. (4.16.)
- **No search/report analytics.** The pharmacist "X people searched for
  this near you" counter is still step 5.
- **No geolocation** ("did you really visit this pharmacy?"), no distance
  check, no PostGIS. Still deferred.
- **No new npm or pip dependencies.** `hmac`, `hashlib` and `ipaddress`
  are stdlib; no toast library, no form library.
- **No skeleton loaders, no `error.tsx` boundaries, no animation.**
  Plain inline text states. (Step 8.)
- **No Arabic dictionary**, no locale routing.
- **No tests.** Still manual acceptance only — though
  `check_report_rate_limit` is deliberately shaped as a pure function so
  it is the first thing worth unit-testing when a harness arrives.

## 4.15 Decisions recorded in this step

Binding on later steps unless explicitly amended:

1. **Patient reports are binary (`in_stock` / `out_of_stock`).** `unsure`
   is unreachable from any unauthenticated endpoint and is reserved for
   the authenticated pharmacist toggle. The stored enum and every read
   path keep all three values.
2. **The browser writes directly to FastAPI.** Write endpoints are never
   proxied through a Vercel Server Action or Route Handler, because that
   destroys the client IP that every anonymous abuse control depends on.
3. **Anonymous callers are identified by
   `HMAC-SHA256("v1|<normalised IP>", REPORT_FINGERPRINT_SECRET)`.** A raw
   IP is never stored, never logged and never returned. IPv6 is
   normalised to its /64.
4. **The real client IP comes from one explicitly configured header
   (`CLIENT_IP_HEADER`, `cf-connecting-ip` on Render) or from the socket.
   Never from header sniffing, and never from `X-Forwarded-For`** — which
   on Render puts the client leftmost (contrary to the usual advice) and
   is appended to rather than reset.
5. **Rate limiting is evaluated against the append-only table, not
   process memory**, in one indexed query per write, by a pure function.
   Rules and numbers: 60 s per pair, 30 min per identical pair+status,
   20/hour, 60/day per fingerprint.
6. **429 responses are uniform and numberless.** The rejecting rule is
   logged, never returned. The frontend picks French copy by status code
   (2.12.8 unchanged).
7. **`reported_by` is hard-coded server-side; `reported_at` is omitted
   from the insert so the Postgres default fires.** Write schemas use
   `extra="forbid"` so an attempt to supply either is a 422, not a silent
   drop.
8. **`backend/app/services/` holds pure logic only.** All Supabase calls,
   status codes and `HTTPException`s stay in routers.
9. **Cache invalidation after a write is: optimistic patch from the
   response body + a `"use server"` action calling `revalidateTag` and
   `revalidatePath`.** `getMedicationStock` carries the tag
   `medication-stock:<slug>`. `router.refresh()` is never used — it is a
   no-op against an unexpired Data Cache entry.
10. **Client state merges over server props by timestamp
    (`Date.parse`), server wins on ties.** This is the general pattern for
    any future optimistic write.
11. **Write endpoints send `Cache-Control: no-store`** and never appear in
    any cached read path.
12. **`GET /health/client`** is the sanctioned way to verify proxy/IP
    configuration in production. It returns a fingerprint prefix and
    header *names* only — never an IP, never a header value.

## 4.16 Open questions for the user (non-blocking for step 4)

Step 4 can be implemented in full without answers to these.

- **Are the rate-limit numbers right for Tunisian mobile NAT?** 20/hour
  and 60/day per fingerprint are calibrated against individual behaviour,
  but carrier-grade NAT means many strangers can share one fingerprint
  (4.4). They are four constants in one module. Revisit with real traffic;
  if false positives appear, the first move is raising C and D, the second
  is adding a first-party cookie as a *narrowing* signal alongside the IP.
- **Retention of `reporter_fingerprint`.** Nothing needs it after 24
  hours. A scheduled `update … set reporter_fingerprint = null where
  created_at < now() - interval '48 hours'` (pg_cron, or a Render cron
  job) would shrink the data-protection surface to nearly nothing. Not
  built; decide before any public launch.
- **Should a patient report override a recent pharmacist report?** Today
  "latest wins" is absolute, so once step 5 exists a patient tap can
  overwrite a pharmacy's own confirmation minutes later. Options for step
  5: keep it simple (a patient standing at the counter may genuinely know
  better), or give pharmacist reports a grace period during which patient
  reports are recorded but not displayed as current. **This must be
  decided in step 5's spec**, not silently inherited.
- **Public Server Action exposure.** `revalidateMedicationStock` is
  invocable by anyone (4.6). The worst case is forced cache misses on 26
  paths. If that ever matters, the fix is to move revalidation behind the
  FastAPI response (a signed webhook back into Next) — more moving parts
  than the risk currently justifies.
- **Report volume vs. dataset trust.** With no accounts, a single
  determined person can still move ~20 pairs an hour. The product answer
  is the pharmacist override in step 5 plus the permanent disclaimer, not
  a stronger technical control. Confirm that is acceptable before a public
  launch.
- **Still open from earlier steps:** real pharmacy data provenance, who
  validates the medication list, city-vs-governorate coverage boundary,
  opening hours / pharmacie de garde, and the patient contact channel for
  step 7.

---

# Step 5 — Pharmacist auth + dashboard + stock toggle

**Goal:** a pharmacist opens `/pharmacien/inscription`, picks their
pharmacy from the twelve already in the directory, gives their name,
e-mail and phone, and receives a passwordless sign-in link. After a human
calls the pharmacy and activates the account, they land on `/pharmacien`
and see every tracked medication with a one-tap three-way toggle —
**Disponible / En rupture / Incertain** — plus "N recherches cette
semaine" per medication. Their toggle writes a `stock_reports` row with
`reported_by = 'pharmacist'`, which patients immediately see as
"Confirmé par la pharmacie", and their pharmacy gains the
**Pharmacie inscrite** badge that step 2 §2.8 deliberately withheld.

This is the **first authenticated path in the project**, the first time
`unsure` is writable, and the first time `verified` means anything. The
decisions in 5.0–5.3 are load-bearing for steps 6 and 7.

## 5.0 The architectural fork: does the browser get a Supabase client?

Decision 2.12.1 ("all Supabase access goes through FastAPI, the browser
never calls Supabase") was stated absolutely and has held through steps
2–4. Supabase's magic-link flow is built around the client SDK. This is
the first step where the two genuinely collide, so the rule gets
re-derived from its own justification rather than obeyed reflexively.

### What 2.12.1 was actually protecting

Re-reading step 2 §2.0, all four reasons are about **application data**:

1. one data path is simpler than two;
2. later features need server-side secrets and logic anyway;
3. zero RLS policies on every table is a smaller surface than hand-written
   `anon` policies;
4. **"A public anon key with a `select` policy on `pharmacies` +
   `stock_reports` is a free, complete export of the dataset — which *is*
   the product."**

Reason 4 is the load-bearing one, and it is a statement about
`/rest/v1/*` (PostgREST), `/realtime/v1/*` and `/storage/v1/*` — the
surfaces that read rows out of `public.*`. It says nothing about
`/auth/v1/*`, because GoTrue exposes no application table. Step 3 §3.0.1
declined Realtime on exactly this basis: Realtime would have required a
permissive `select` policy on `stock_reports`. **Auth requires no policy
on any table.** Zero policies stay zero.

### Option A — client-side Supabase Auth, auth surface only

The browser gets `@supabase/supabase-js`, configured with the anon key,
and is allowed to call **`/auth/v1/*` and nothing else**. It signs in,
holds the session, and sends the resulting JWT to FastAPI as
`Authorization: Bearer …`. FastAPI verifies the token against Supabase,
resolves it to a `pharmacist_accounts` row, and does every read and write
with its existing service-role client.

| | |
| --- | --- |
| RLS changes required | **None.** Every table stays RLS-on with zero policies and revoked from `anon`/`authenticated`. A pharmacist's JWT has the `authenticated` role, which can still read nothing. |
| New data exposure | **None.** The anon key can reach GoTrue, which returns only the caller's own user record for a token they already hold. |
| Session machinery we write | None. Issuance, storage, silent refresh, expiry and sign-out are the SDK's. |
| Cost | ~35 kB of JS, loaded only on `/pharmacien*` routes (dynamic import boundary is natural: those pages are client components). |
| New failure mode | PKCE: the sign-in must complete in the browser that started it (5.13.3). |

### Option B — FastAPI-mediated auth, browser never touches Supabase

FastAPI triggers the e-mail with the service role, handles the callback,
exchanges the code, and mints its **own** session artifact.

Real implementation cost, in order of severity:

1. **The session artifact cannot be an httpOnly cookie in this
   deployment topology.** The frontend is `*.vercel.app` and the API is
   `*.onrender.com`: unrelated eTLD+1s, so any auth cookie is a
   *third-party* cookie. Safari and Firefox block those outright and
   Chrome's Privacy Sandbox restricts them. It would also force
   `allow_credentials=True` on the CORS middleware, which in turn makes
   `allow_headers=["*"]` illegal (the wildcard stops matching when
   credentials are included) — a change to step 1's CORS posture on every
   endpoint, for one feature. So B degrades to "FastAPI mints a bearer
   token the browser stores in `localStorage`" — i.e. exactly A's storage
   exposure, but with hand-rolled crypto.
2. **PKCE state must survive a dyno restart.** If FastAPI starts the
   flow, it holds the `code_verifier` until the callback arrives, minutes
   later. Render's free tier sleeps after ~15 min and restarts freely, so
   in-memory storage loses the verifier mid-flow. This is step 4 §4.4's
   lesson verbatim — the fix is a Postgres table with a TTL and a cleanup
   job. That is a whole extra table, a sweeper, and a new class of bug,
   to reach the same place the SDK already is.
3. **We would be reimplementing token signing, refresh, rotation,
   revocation and expiry.** Every one of those is a place to get security
   wrong, and none of it is product.
4. It does **not** improve the data posture at all. FastAPI would still
   be the only thing touching `public.*`; the anon key would still exist;
   the only difference is who parses the callback.

### Decision

**Option A. `@supabase/supabase-js` is installed in `frontend/` and used for
authentication only.** The exact, testable boundary:

> The browser may call `https://<project>.supabase.co/auth/v1/*`.
> It may **never** call `/rest/v1/*`, `/realtime/v1/*`, `/storage/v1/*`,
> or any PostgREST RPC. No component imports `supabase.from(...)`,
> `supabase.rpc(...)`, `supabase.channel(...)` or `supabase.storage`.
> Every byte of application data still arrives through
> `frontend/src/lib/api.ts` → FastAPI → service role.

`@supabase/ssr` is **not** installed: it exists to mirror the session
into cookies for Server Components, and we deliberately keep the session
out of cookies (see 5.12.2). There is no Next.js middleware and no
server-side session.

### What changes and what does not, precisely

| Decision | Status after this step |
| --- | --- |
| **2.12.1** "all Supabase access goes through FastAPI; the browser never calls Supabase" | **Amended, narrowed to data.** New wording: *all Supabase **data** access goes through FastAPI. The browser calls Supabase **Auth** (`/auth/v1/*`) and nothing else.* |
| **2.12.2** every table RLS-on with zero policies, revoked from `anon`/`authenticated` | **Unchanged, and it applies to the two new tables too.** No policy is added anywhere in this step. This is the single most important invariant to preserve. |
| **3.0.1** no Realtime, no websocket | **Unchanged.** Installing the SDK does not open a channel. Acceptance test 5.19-31 checks for zero websockets. |
| **4.15.2** the browser writes directly to FastAPI | **Unchanged and reused.** The pharmacist toggle POSTs from the browser too. |
| Step 1 §4 "the backend never receives or uses the anon key" | **Amended** (5.9.1): the API now holds `SUPABASE_ANON_KEY` for the `apikey` header on GoTrue verification calls. It is never used for data access. |
| Step 1 §3 `allow_credentials=False` | **Confirmed unchanged.** Bearer tokens, no cookies. |

### The residual risk of shipping the anon key, stated plainly

With Email sign-ups enabled at project level, anyone holding the anon key
(i.e. anyone who views source) can call `/auth/v1/otp` and make Supabase
send a "sign in to Mawjoud" e-mail to an arbitrary address. It is capped
by Supabase's own per-hour auth e-mail rate limit, which we set
deliberately low (5.8). It creates auth users that map to no
`pharmacist_accounts` row and can therefore do nothing at all. Accepted
for the MVP; the named upgrade path (disable project sign-ups + create
users through the Admin API + Turnstile on the auth endpoints) is in
5.22.

## 5.1 Registration model: claim an existing pharmacy, never create one

The brief's registration list ("pharmacy name, address, phone, email")
reads like free-form creation. **Decision: registration *claims* one of
the twelve seeded Bizerte pharmacies. `POST /api/pharmacist/registrations`
cannot insert a `pharmacies` row, and no endpoint in this step can.**
The pharmacist supplies only what we do not already know: their name,
their e-mail, and a phone number to verify them on.

Why:

1. **Duplicate rows are the worst possible corruption for this product.**
   A self-created "Ph. du Vieux Port" alongside the directory's
   "Pharmacie du Vieux Port" splits one physical counter across two rows.
   A patient reading row A sees "Aucun signalement" while row B has a
   fresh confirmation. Every other data-quality problem in this project
   is recoverable; this one silently sends people to the wrong place.
2. **`verified` only means something against a known-good row.** Step 2
   §2.8 withheld the badge until "pharmacist registration produces
   genuinely verified rows to contrast against". A badge derived from
   self-submitted name/address/coordinates would certify nothing.
3. **One city, twelve rows.** Open-ended creation is a coverage-growth
   feature and coverage growth is not this step (or this MVP).
4. Free-form creation needs geocoding to put a pin on the map. Nothing in
   the stack geocodes, and the brief has no geocoder.

A pharmacist whose pharmacy is genuinely absent gets a French sentence
and a `mailto:` — a human adds the row to `seed.sql`. That is the correct
throughput for one city.

### `pharmacist_accounts` multiplicity — decided

- **One account belongs to exactly one pharmacy** (`pharmacy_id` is
  `not null`, no join table). A pharmacist working at two officines
  registers twice with two addresses. Multi-pharmacy staff is a real
  thing and explicitly out of scope (5.20).
- **A pharmacy may have several accounts** (`pharmacy_id` is **not**
  unique). A Tunisian officine has a *titulaire* plus assistants and
  *préparateurs*, and the person who actually knows whether the last box
  of Levothyrox went out this morning is usually the one at the counter,
  not the owner. Forcing one account per pharmacy produces either shared
  credentials — and magic links to a shared inbox are worse than a
  password — or data that goes stale every time the titulaire is away.
- **`auth_user_id` and `email` are each unique** across the table. One
  human, one account.
- **No cap on accounts per pharmacy.** A cap was considered as
  anti-squatting and rejected: unactivated accounts can do nothing at
  all (5.2), registrations are already capped per device per day (5.10.1)
  and per e-mail by uniqueness, and a cap would eventually lock out a
  legitimate seventh staff member with a message nobody can act on.

## 5.2 Trust: what an e-mail actually proves, and what gates what

A magic link proves control of a mailbox. It does not prove that the
person works at Pharmacie Ibn Khaldoun. This matters more here than
anywhere else in the project, because a fraudulent pharmacist report is
rendered to patients as **"Confirmé par la pharmacie"** — the strongest
trust signal the product has. It is strictly worse than step 4's
anonymous patient reports, which are labelled as exactly what they are.

### Two independent gates

| Gate | Proves | Granted by |
| --- | --- | --- |
| **Supabase session** | control of the e-mail address | clicking the magic link |
| **`pharmacist_accounts.status = 'active'`** | a human confirmed by phone that this person works at this pharmacy | an operator, manually |

Both are required to write. Neither implies the other.

### Concretely

- Registration inserts a row with `status = 'pending'`. **Nothing is
  auto-activated.**
- A `pending` account **can sign in** and **can open the dashboard**,
  which renders read-only: the pharmacy header, the full medication list
  with current statuses and search counts, all toggles `disabled`, and a
  clear "Compte en cours de vérification" banner. Showing the dashboard
  while pending is deliberate — it makes the waiting concrete, it
  demonstrates the value that motivates them to answer the phone, and it
  leaks nothing (every status shown is already public on
  `/medicaments/<slug>`).
- **Every write endpoint requires `status = 'active'` and returns 403
  otherwise.** The status is read from the database on every single
  request, not baked into the token — so revocation is instant.
- `rejected` and `suspended` render their own banners and cannot write.
  `suspended` is the kill switch: because the account row is looked up on
  every authenticated request anyway, suspension costs zero extra
  queries and takes effect on the next tap.

### How activation actually happens — there is no admin UI

No admin UI exists anywhere in this project and none is built here
(5.20). The operational procedure, which belongs in `supabase/README.md`:

1. A new row appears in `public.pharmacist_accounts` with
   `status = 'pending'`.
2. The operator reads `full_name`, `email`, `phone` and the joined
   `pharmacies.name` / `pharmacies.phone`.
3. **The operator calls the pharmacy's own landline** — the number in
   `pharmacies.phone`, *not* the number the registrant supplied — and
   asks for the named person. That asymmetry is the entire verification:
   anyone can type a phone number into a form; only someone who works
   there answers the pharmacy's line.
4. In the Supabase table editor:
   `update public.pharmacist_accounts set status = 'active', status_note = 'appel du 2026-08-20, titulaire confirmé' where email = '…';`
5. `activated_at` is stamped by a trigger and `pharmacies.verified` flips
   to `true` automatically (5.4).

**Hard operational dependency, and it is a launch blocker, not a build
blocker.** Step 2 §2.3 states that the seeded phone numbers are
syntactically valid but **fictional**. Step 3 of the procedure above is
therefore impossible for the current dataset. Activation must not be
granted for any pharmacy whose phone number has not been replaced with a
sourced, real one — otherwise `verified` certifies nothing and the badge
is a lie. This escalates step 2's open question ("where does real
pharmacy data come from?") from *nice before launch* to *required before
the first activation*. It does not block implementing or testing this
step: for QA the operator activates their own test account knowingly.

### `pharmacies.verified` becomes derived

`verified` is maintained by a trigger: **true if and only if the pharmacy
has at least one `active` pharmacist account** (5.4). Its meaning
sharpens from step 2's "a human confirmed this pharmacy exists" to "a
pharmacist from this pharmacy has been verified by phone and updates
these availabilities themselves" — strictly stronger, and exactly what a
badge should promise. Step 2's column comment is amended accordingly
(5.18.4). Do not set `verified` by hand: the next account status change
overwrites it.

## 5.3 Latest-wins stays absolute — answering step 4 §4.16

Step 4 left this explicitly for this step: *"does a later patient report
override an existing pharmacist confirmation?"*

**Decision: yes. "Latest wins" is unchanged and absolute. A pharmacist
report gets no pinning, no priority, no grace period. Provenance is
communicated to the reader, not encoded in the ordering.**

1. **The patient is often right, and the direction of error is
   dangerous.** During a shortage the event a patient observes first is
   the last box leaving the counter. A pharmacist who toggled
   "Disponible" at 08:00 is not lying at 14:00 — they are stale.
   Suppressing the 14:00 patient report would keep the page green and
   send someone across Bizerte for nothing. The failure mode of the
   pinning design is the exact harm the product exists to prevent.
2. **Decision 3.18.5 is load-bearing.** "The current status is the single
   most recent row" is implemented once, in the lateral top-1 of
   `pharmacy_medication_status`, and is served by one index. A priority
   rule turns that into `order by (case when reported_by = 'pharmacist'
   and reported_at > now() - interval 'N' then 0 else 1 end),
   reported_at desc` — an ordering the index no longer satisfies, a rule
   that changes its answer as time passes (so identical queries a minute
   apart disagree), and a second definition of "current" to keep in step
   with the API, the dashboard and step 6's alerts.
3. **The signal already exists and is already rendered.** §3.12 ships
   "Confirmé par la pharmacie il y a 2 heures" vs "Signalé par un patient
   il y a 5 minutes". The reader can weigh those two sentences. Encoding
   our own weighting into the ordering hides information from them.
4. **The pharmacist is never locked out.** One tap re-asserts and, being
   newest, wins. Their dashboard shows the current row's source, so a
   patient contradiction is visible *to them* as useful feedback rather
   than as an attack — 5.14 renders exactly that.

Nothing changes in the schema, the view, or any read path. This is a
decision to *not* build something.

## 5.4 Migration 5 — `public.pharmacist_accounts`

`supabase/migrations/20260815090000_create_pharmacist_accounts.sql`

Sorts after step 4's `20260814100000_…`.

```sql
-- Step 5 — pharmacist accounts. Claimed against existing pharmacies;
-- activated manually out of band. See docs/ARCHITECTURE.md 5.1-5.4.
-- Idempotent: safe to re-run.

do $$
begin
  if not exists (
    select 1 from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where t.typname = 'pharmacist_account_status' and n.nspname = 'public'
  ) then
    create type public.pharmacist_account_status as enum
      ('pending', 'active', 'rejected', 'suspended');
  end if;
end
$$;

create table if not exists public.pharmacist_accounts (
  id                       uuid        primary key default gen_random_uuid(),
  pharmacy_id              uuid        not null references public.pharmacies(id) on delete cascade,
  auth_user_id             uuid        unique references auth.users(id) on delete set null,
  email                    text        not null unique,
  full_name                text        not null,
  phone                    text        not null,
  status                   public.pharmacist_account_status not null default 'pending',
  status_note              text,
  activated_at             timestamptz,
  registration_fingerprint text,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now(),

  -- Stored already normalised, so PostgREST .eq("email", …) is a correct
  -- lookup without a functional index or a lower() filter.
  constraint pharmacist_accounts_email_normalised
    check (email = lower(btrim(email)) and length(email) between 5 and 254),
  constraint pharmacist_accounts_email_shape
    check (email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'),
  constraint pharmacist_accounts_full_name_length
    check (length(btrim(full_name)) between 2 and 120),
  constraint pharmacist_accounts_phone_tn_e164
    check (phone ~ '^\+216[0-9]{8}$'),
  constraint pharmacist_accounts_fingerprint_format
    check (registration_fingerprint is null or registration_fingerprint ~ '^[0-9a-f]{64}$'),
  -- An active account must carry an activation timestamp. Suspending or
  -- rejecting later keeps the historical value; only 'active' requires it.
  constraint pharmacist_accounts_activated_at_present
    check (status <> 'active' or activated_at is not null)
);

comment on table public.pharmacist_accounts is
  'One row per pharmacist. Claims an existing public.pharmacies row; never creates one. status starts at ''pending'' and is set to ''active'' MANUALLY by an operator after phoning the pharmacy''s own landline (ARCHITECTURE.md 5.2). Read/written only through the FastAPI backend (service role); RLS denies anon/authenticated entirely.';
comment on column public.pharmacist_accounts.auth_user_id is
  'Supabase auth.users id. NULL until the pharmacist first signs in; bound then by the FastAPI identity dependency, matching on the verified e-mail address (ARCHITECTURE.md 5.9.3).';
comment on column public.pharmacist_accounts.phone is
  'Phone the registrant supplied. Used ONLY as a fallback contact. Verification is done by calling pharmacies.phone, not this number. Never exposed by any endpoint.';
comment on column public.pharmacist_accounts.status_note is
  'Free-text operator note about the verification call. Never exposed by any endpoint.';
comment on column public.pharmacist_accounts.registration_fingerprint is
  'Same keyed-hash scheme as stock_reports.reporter_fingerprint (ARCHITECTURE.md 4.2). Rate-limits the unauthenticated registration endpoint. A RAW IP IS NEVER STORED.';

create index if not exists pharmacist_accounts_pharmacy_status
  on public.pharmacist_accounts (pharmacy_id, status);

-- Registration rate-limit lookup (ARCHITECTURE.md 5.10.1). Partial: most
-- rows over time will have had their fingerprint nulled or never had one.
create index if not exists pharmacist_accounts_registration_recent
  on public.pharmacist_accounts (registration_fingerprint, created_at desc)
  where registration_fingerprint is not null;

-- Stamp activated_at on the transition into 'active'.
create or replace function public.pharmacist_accounts_stamp_activation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status = 'active' and new.activated_at is null then
    new.activated_at := now();
  end if;
  return new;
end;
$$;

drop trigger if exists pharmacist_accounts_stamp_activation on public.pharmacist_accounts;
create trigger pharmacist_accounts_stamp_activation
  before insert or update of status on public.pharmacist_accounts
  for each row execute function public.pharmacist_accounts_stamp_activation();

drop trigger if exists pharmacist_accounts_set_updated_at on public.pharmacist_accounts;
create trigger pharmacist_accounts_set_updated_at
  before update on public.pharmacist_accounts
  for each row execute function public.set_updated_at();

-- pharmacies.verified is now DERIVED: true iff the pharmacy has at least
-- one active pharmacist account (ARCHITECTURE.md 5.2). Do not set it by
-- hand; the next account status change recomputes it.
create or replace function public.pharmacies_recompute_verified(p_pharmacy_id uuid)
returns void
language plpgsql
set search_path = ''
as $$
declare
  has_active boolean;
begin
  if p_pharmacy_id is null then
    return;
  end if;
  select exists (
    select 1 from public.pharmacist_accounts a
    where a.pharmacy_id = p_pharmacy_id and a.status = 'active'
  ) into has_active;
  update public.pharmacies
     set verified = has_active
   where id = p_pharmacy_id
     and verified is distinct from has_active;
end;
$$;

create or replace function public.pharmacist_accounts_refresh_verified()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  -- NEW and OLD are referenced only under the tg_op that defines them:
  -- touching NEW in a DELETE trigger raises at runtime.
  if tg_op in ('INSERT', 'UPDATE') then
    perform public.pharmacies_recompute_verified(new.pharmacy_id);
  end if;
  if tg_op in ('UPDATE', 'DELETE') then
    perform public.pharmacies_recompute_verified(old.pharmacy_id);
  end if;
  return null;
end;
$$;

drop trigger if exists pharmacist_accounts_refresh_verified on public.pharmacist_accounts;
create trigger pharmacist_accounts_refresh_verified
  after insert or delete or update of status, pharmacy_id
  on public.pharmacist_accounts
  for each row execute function public.pharmacist_accounts_refresh_verified();

alter table public.pharmacist_accounts enable row level security;

-- Intentionally ZERO policies (decision 2.12.2). Enabling Supabase Auth
-- does NOT grant the authenticated role anything: a signed-in pharmacist
-- still cannot read this table (or any other) directly.
revoke all on table public.pharmacist_accounts from anon, authenticated;
grant select, insert, update on table public.pharmacist_accounts to service_role;

revoke all on function public.pharmacies_recompute_verified(uuid) from public, anon, authenticated;
```

### Column notes / deviations from the brief's rough model

| Column | Decision |
| --- | --- |
| `id, pharmacy_id, email` | The brief's three. `uuid` PKs per 2.12.3. |
| `auth_user_id` | **Added.** FK to `auth.users`, `on delete set null` so deleting a Supabase user leaves the account row intact and re-linkable by e-mail. Referencing `auth.users` from `public` is a supported Supabase pattern; the SQL editor runs with sufficient privileges. |
| `full_name` | **Added.** The operator has to ask for someone by name when they call. |
| `phone` | **Added** per the brief ("phone for verification"), but see the column comment: it is a fallback contact, not the verification channel. |
| `status` | **Added.** Native enum per decision 3.18.4 — a closed state machine shared with the API. |
| `status_note`, `activated_at` | **Added.** The manual review has to leave a trace somewhere, and there is no admin UI to hold it. |
| `registration_fingerprint` | **Added.** Registration is an unauthenticated write; step 4's threat model applies unchanged. |
| No `role` / `is_titulaire` | Not in the brief, not used by anything, and it would imply a permissions model this step does not have. |

## 5.5 Migration 6 — pharmacist attribution on `stock_reports`

`supabase/migrations/20260815090100_add_stock_report_pharmacist_attribution.sql`

```sql
-- Step 5 — attribute pharmacist reports to the account that wrote them.
-- RLS posture UNCHANGED: still zero policies, still revoked from
-- anon/authenticated, still service-role-only (decisions 2.12.1/2.12.2).
-- Idempotent: safe to re-run.

alter table public.stock_reports
  add column if not exists reported_by_account_id uuid;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'stock_reports_reported_by_account_fk'
      and conrelid = 'public.stock_reports'::regclass
  ) then
    alter table public.stock_reports
      add constraint stock_reports_reported_by_account_fk
      foreign key (reported_by_account_id)
      references public.pharmacist_accounts(id)
      on delete set null;
  end if;
end
$$;

comment on column public.stock_reports.reported_by_account_id is
  'Which pharmacist account wrote this report. Set by the API on every reported_by = ''pharmacist'' insert; NULL for patient reports and for all seed rows. Never returned by any endpoint. Becomes NULL if the account row is deleted (on delete set null) — the reported_by enum remains the display-relevant fact, so no cross-column CHECK enforces the pairing.';

revoke all on table public.stock_reports from anon, authenticated;
grant select, insert on table public.stock_reports to service_role;
```

### The mirror index step 3 §3.3 promised is deliberately NOT created

Step 3 said `(pharmacy_id, medication_id, reported_at desc)` would be
added "in step 5, with its own justification". The justification does not
survive contact with the actual query.

The dashboard reads `pharmacy_medication_status` filtered by one
`pharmacy_id`. That view's lateral subquery filters
`sr.medication_id = m.id and sr.pharmacy_id = p.id` — **two equality
predicates plus `order by reported_at desc limit 1`**, which the existing
`stock_reports_medication_pharmacy_recent (medication_id, pharmacy_id,
reported_at desc)` index satisfies exactly. Column order in a composite
index is irrelevant when every leading column is an equality match. A
mirror index would double the write cost of the hottest table in the
project to serve zero queries. Acceptance test 5.19-6 confirms with
`explain analyze`. If a "full report history for my pharmacy, newest
first" screen is ever built, that is when the index earns its place.

## 5.6 Migration 7 — `public.search_events`, the stats view, and the log RPC

`supabase/migrations/20260815090200_create_search_events.sql`

Step 3 §3.19 recommended deferring this to step 5. It lands here: the
brief names it as the pharmacist's incentive to keep data updated, and a
dashboard without it is a chore with no payoff.

### What "a search" counts as, given ISR

The obvious place to log is `GET /api/medications/search`. It is the
wrong place: it fires on every debounced keystroke, `levo` matches two
different medications, and its 30 s `Cache-Control` means shared caches
can absorb requests. The second obvious place,
`GET /api/medications/{slug}/pharmacies`, is worse: that endpoint is
ISR-cached at 60 s and is called *once per revalidation*, not once per
patient. Logging there would count cache misses, not people.

**Decision: a search is one patient opening one medication's availability
page.** It is recorded by a dedicated, uncached, fire-and-forget
`POST /api/medications/{slug}/views` fired from the browser on mount of
`/medicaments/[slug]` (5.15.2). Direct browser → FastAPI, exactly like
step 4's report (decision 4.15.2) and for the same reason: it is the only
call that happens once per real visitor, and it is the only way to get a
per-visitor identity at all.

**The displayed number is `count(distinct viewer_fingerprint)`, not a raw
view count.** Three consequences, all good:

- It matches the brief's wording ("X *people* searched").
- One anxious patient reloading the page forty times — extremely likely
  in a shortage — counts once instead of dominating the metric.
- It makes the endpoint essentially not worth attacking: hammering it
  from one address moves `views_7d` and leaves `viewers_7d` at 1. Only a
  distributed attacker can inflate it, and the prize is a wrong vanity
  number on one dashboard. That is why this endpoint needs no
  rate-limiting at all, unlike step 4's report endpoint.

Under carrier-grade NAT distinct fingerprints **undercount** people
(§4.4). The error direction is conservative — a pharmacist is never shown
more interest than exists — and the French copy says "estimation".

### Data minimisation

The table stores `medication_id`, a keyed IP hash, and a timestamp.
**No query text, no raw IP, no user agent, no referrer, no session id,
no patient identity of any kind.** Nothing here is joinable to a
`stock_reports` row by any endpoint (the fingerprint secret is the same,
so the values *would* match — noted honestly in 5.22 as a retention
question, exactly like step 4's).

```sql
-- Step 5 — search-visibility counters for the pharmacist dashboard.
-- One row per patient opening a medication availability page.
-- Deliberately minimal: medication, keyed IP hash, timestamp. Nothing else.
-- See docs/ARCHITECTURE.md 5.6.
-- Idempotent: safe to re-run.

create table if not exists public.search_events (
  id                 uuid        primary key default gen_random_uuid(),
  medication_id      uuid        not null references public.medications(id) on delete cascade,
  viewer_fingerprint text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),

  constraint search_events_fingerprint_format
    check (viewer_fingerprint is null or viewer_fingerprint ~ '^[0-9a-f]{64}$')
);

comment on table public.search_events is
  'Append-only log: one row each time a patient opens /medicaments/<slug>. Backs the "N recherches cette semaine" counter on the pharmacist dashboard. created_at IS the event time — there is no separate occurred_at because the two would always be equal. Read/written only through the FastAPI backend (service role).';
comment on column public.search_events.viewer_fingerprint is
  'Same keyed-hash scheme as stock_reports.reporter_fingerprint (ARCHITECTURE.md 4.2). NULL when no client IP could be resolved — this path fails OPEN (the event is still counted) because a metric must never break a page. Only used for count(distinct …); never exposed, never joined to a person.';

create index if not exists search_events_medication_recent
  on public.search_events (medication_id, created_at desc);

drop trigger if exists search_events_set_updated_at on public.search_events;
create trigger search_events_set_updated_at
  before update on public.search_events
  for each row execute function public.set_updated_at();

alter table public.search_events enable row level security;

-- Intentionally ZERO policies (decision 2.12.2).
revoke all on table public.search_events from anon, authenticated;
grant select, insert on table public.search_events to service_role;

-- Single round trip: resolve the slug and insert in one statement. An
-- unknown or inactive slug inserts nothing and is not an error — the
-- endpoint returns 204 either way, so a probe learns nothing.
create or replace function public.log_medication_view(
  p_slug        text,
  p_fingerprint text default null
)
returns void
language sql
volatile
set search_path = ''
as $$
  insert into public.search_events (medication_id, viewer_fingerprint)
  select m.id, p_fingerprint
  from public.medications m
  where m.slug = p_slug and m.is_active;
$$;

comment on function public.log_medication_view(text, text) is
  'Records one medication-page view. No-op for unknown or inactive slugs.';

revoke all on function public.log_medication_view(text, text) from public, anon, authenticated;
grant execute on function public.log_medication_view(text, text) to service_role;

-- Distinct viewers per medication over the last 7 days, one row per
-- active medication including zeros. A view rather than an RPC because
-- no parameter shapes the result (decision 3.18.9).
create or replace view public.medication_search_stats_7d as
select
  m.id                                   as medication_id,
  count(distinct e.viewer_fingerprint)   as viewers_7d,
  count(e.id)                            as views_7d
from public.medications m
left join public.search_events e
  on e.medication_id = m.id
 and e.created_at >= now() - interval '7 days'
where m.is_active
group by m.id;

comment on view public.medication_search_stats_7d is
  'viewers_7d = count(distinct viewer_fingerprint), which ignores NULLs. It is the number the dashboard displays. views_7d is raw and is NOT displayed anywhere; it exists for debugging. Per-medication distinct counts CANNOT be summed into a site-wide total (ARCHITECTURE.md 5.14).';

alter view public.medication_search_stats_7d set (security_invoker = on);

revoke all on public.medication_search_stats_7d from anon, authenticated;
grant select on public.medication_search_stats_7d to service_role;
```

## 5.7 Migration 8 — extend `pharmacy_medication_status`

`supabase/migrations/20260815090300_extend_pharmacy_medication_status.sql`

The dashboard needs, for one pharmacy, every active medication's name and
slug **alongside** its current status. Step 3's view has the status half
but only `medication_id`.

**Decision: append medication columns to the existing view rather than
create a second one.** A parallel `pharmacy_stock_board` view would
contain a second copy of the lateral top-1 that defines "latest wins" —
the one piece of SQL in this project that absolutely must have a single
definition (decision 3.18.5). `create or replace view` permits appending
columns at the end, and step 3's endpoint selects columns explicitly
(2.12.7), so it is unaffected.

```sql
-- Step 5 — append medication metadata to pharmacy_medication_status so
-- the pharmacist dashboard can read its whole board in one query, without
-- a second copy of the "latest report wins" lateral.
-- The first 14 columns are byte-identical to step 3's definition and MUST
-- keep their names, types and order: create or replace view can only
-- append. See docs/ARCHITECTURE.md 5.7.
-- Idempotent: safe to re-run.

create or replace view public.pharmacy_medication_status as
select
  m.id                             as medication_id,
  p.id                             as pharmacy_id,
  p.name                           as pharmacy_name,
  p.address                        as address,
  p.city                           as city,
  p.governorate                    as governorate,
  p.lat                            as lat,
  p.lng                            as lng,
  p.phone                          as phone,
  p.verified                       as verified,
  coalesce(r.status::text, 'none') as status,
  r.reported_at                    as reported_at,
  r.reported_by::text              as reported_by,
  r.id                             as report_id,
  -- appended in step 5:
  m.slug                           as medication_slug,
  m.name                           as medication_name,
  m.generic_name                   as generic_name,
  m.form                           as form,
  m.category                       as category
from public.medications m
cross join public.pharmacies p
left join lateral (
  select sr.id, sr.status, sr.reported_by, sr.reported_at
  from public.stock_reports sr
  where sr.medication_id = m.id
    and sr.pharmacy_id   = p.id
  order by sr.reported_at desc, sr.id desc
  limit 1
) r on true
where m.is_active;

comment on view public.pharmacy_medication_status is
  'Derived current stock status. status is the enum value of the latest report cast to text, or the synthetic value ''none'' when no report exists. Invariant: status = ''none'' if and only if reported_at is null. Query it with a medication_id filter (patient results page) or a pharmacy_id filter (pharmacist dashboard) — never unfiltered.';

alter view public.pharmacy_medication_status set (security_invoker = on);

revoke all on public.pharmacy_medication_status from anon, authenticated;
grant select on public.pharmacy_medication_status to service_role;
```

PostgREST caches the schema; a replaced view can 404 with `PGRST205`
until it reloads. If it does not within seconds, run
`notify pgrst, 'reload schema';` (step 3 §3.4).

### `supabase/README.md` updates

Add the four migrations to the ordered "How to apply" list after
`20260814100000_…`, and add to the Rules section:

- *"`pharmacies.verified` is derived by trigger from
  `pharmacist_accounts.status`. Do not set it by hand."*
- *"`pharmacist_accounts.status` is the only activation gate. Set it to
  `'active'` only after phoning the number in `pharmacies.phone` — never
  the number the registrant supplied."*
- The five-step activation procedure from 5.2, verbatim.

## 5.8 Supabase Auth configuration — manual prerequisites

The user does this in the Supabase dashboard, not the developer subagent.
Implementation can proceed without it; **acceptance testing cannot**.

1. **Authentication → Providers → Email**: enabled. "Confirm email" on.
   Password sign-in may be left at its default — nothing in this project
   uses it (5.20).
2. **Authentication → URL Configuration**
   - *Site URL*: the Vercel production URL.
   - *Redirect URLs* allowlist, all three:
     - `http://localhost:3000/pharmacien/validation`
     - `https://<vercel-production-domain>/pharmacien/validation`
     - `https://*.vercel.app/pharmacien/validation`
   A redirect target that is not on this list is silently rewritten to
   the Site URL, which looks like "the magic link logs me out" and is the
   single most common way this flow breaks.
3. **Authentication → Email Templates → Magic Link**: replace with the
   French template below. It must include `{{ .Token }}` — the 6-digit
   code fallback in 5.13.3 does not work otherwise. This copy lives in
   the Supabase dashboard, which is an unavoidable exception to the rule
   that all user-visible French lives in `fr.ts`; it is recorded here so
   the two can be kept in step, and duplicated into `supabase/README.md`.

```html
<h2>Connexion à Mawjoud</h2>
<p>Bonjour,</p>
<p>Cliquez sur le lien ci-dessous pour accéder à votre espace pharmacien&nbsp;:</p>
<p><a href="{{ .ConfirmationURL }}">Se connecter à Mawjoud</a></p>
<p>Ce lien est valable une heure et ne peut servir qu'une seule fois.
Ouvrez-le sur le même appareil et dans le même navigateur que celui où
vous avez demandé la connexion.</p>
<p>Si le lien ne fonctionne pas, saisissez ce code à 6 chiffres sur la
page de connexion&nbsp;:</p>
<p style="font-size:24px;letter-spacing:4px"><strong>{{ .Token }}</strong></p>
<p>Si vous n'avez pas demandé cette connexion, ignorez cet e-mail.</p>
```

4. **Authentication → Rate Limits → "Rate limit for sending emails"**:
   set as low as QA tolerates (≈20/hour during testing, lower before
   launch). This is the cap on the anon-key e-mail-spam vector in 5.0.
5. **Custom SMTP — effectively required for QA.** Supabase's built-in
   e-mail service is capped at **2 messages per hour project-wide** and is
   documented as not for production; two sign-ins into QA and it is
   exhausted. Configure Authentication → Emails → SMTP with **Resend**
   (free tier, already the project's chosen provider per the brief).
   Until a domain exists, Resend's shared `onboarding@resend.dev` sender
   can only deliver to the Resend account owner's own address — enough to
   test with one real mailbox plus `+alias` variants, not enough to
   onboard real pharmacists. **This is a launch dependency and it is the
   same dependency step 6 has**; it is the strongest argument for buying
   the domain earlier than the brief assumes. Flagged in 5.22. Nothing in
   the repo changes: no `RESEND_API_KEY`, no `resend` package, no
   templates in `frontend/` or `backend/`.
6. **Project sign-ups stay enabled.** Registration relies on
   `shouldCreateUser: true` (5.13.2). Accepted risk and upgrade path:
   5.0 and 5.22.
7. **Access-token (JWT) expiry**: leave at the default 3600 s. Refresh
   token rotation: leave on. The SDK refreshes silently, which matters
   because a dashboard is plausibly left open on a counter all day.

## 5.9 API — identity: verifying the token and resolving the account

### New / changed files

```
backend/app/
├── main.py                     # modified: include the pharmacist router
├── config.py                   # modified: supabase_anon_key
├── dependencies.py             # new — FastAPI auth dependencies
├── routers/
│   ├── medications.py          # modified: POST /{slug}/views
│   └── pharmacist.py           # new — all three pharmacist endpoints
├── schemas/
│   └── pharmacist.py           # new
└── services/
    └── phone.py                # new — pure Tunisian phone normalisation
```

`dependencies.py` is a **module, not a package**: it holds HTTP-layer
concerns (bearer extraction, status codes, `HTTPException`), which
decision 4.15.8 explicitly bars from `services/`. `services/phone.py` is
pure string logic with no I/O and fits the charter exactly.

### 5.9.1 Token verification — remote, against GoTrue

**Decision: verify by calling Supabase, not by validating the signature
locally.**

```
GET {SUPABASE_URL}/auth/v1/user
  apikey:        <SUPABASE_ANON_KEY>
  Authorization: Bearer <the caller's access token>
  timeout=10.0 (httpx, same idiom as /health/db)
```

| Option | Verdict |
| --- | --- |
| Local HS256 verify with the legacy project JWT secret | **Rejected.** Supabase has been migrating projects to asymmetric JWT signing keys; whether a given project signs HS256 or ES256 depends on when it was created and whether keys were rotated. Guessing wrong is a silent 401 storm, and getting algorithm handling right (never trusting the token's own `alg`) is a classic footgun. |
| Local verify against the JWKS endpoint | **Rejected for now.** Correct and fast, but it needs a JWT library, key caching, rotation handling and an `aud`/`iss` policy — real code, to save ~60 ms on a service whose cold start is 50 s. |
| **Remote `/auth/v1/user`** | **Chosen.** No new pip dependency, no key material in the API's environment, no algorithm decisions. It is *authoritative*: a signed-out or deleted user is rejected immediately instead of remaining valid until token expiry — which matters when the credential in question can publish "Confirmé par la pharmacie". It also returns `email` and `email_confirmed_at` as facts rather than as claims we chose to trust. |

Cost: one extra Supabase round trip per authenticated request. The
dashboard is one request; a toggle is one request. Not worth a cache
today — noted in 5.22.

`SUPABASE_ANON_KEY` is used purely as the `apikey` header GoTrue
requires. It is never used for a data call. This **amends step 1 §4**
("the backend never receives or uses the anon key").

### 5.9.2 `backend/app/config.py` — one new field

| Field | Type | Required | Default | Notes |
| --- | --- | --- | --- | --- |
| `supabase_anon_key` | `str` | **yes** | — | Not secret (it ships in the browser bundle), but required: without it no pharmacist can authenticate, and a deploy that boots green while auth is impossible is worse than one that refuses to boot (step 1's fail-fast rule). |

### 5.9.3 `backend/app/dependencies.py`

```python
class PharmacistIdentity(BaseModel):
    account_id: UUID
    pharmacy_id: UUID
    email: str
    status: PharmacistAccountStatus
    auth_user_id: UUID
```

Two dependencies, one built on the other:

**`get_current_pharmacist(credentials = Depends(HTTPBearer(auto_error=False))) -> PharmacistIdentity`**

`HTTPBearer` from `fastapi.security`, with `auto_error=False` so we
control the response body (2.12.8) rather than getting FastAPI's default.
It also puts an **Authorize** button on `/docs`, which is how the
developer will test these endpoints.

Steps, in order:

1. No credentials, or scheme is not `Bearer` ⇒
   `HTTPException(401, "authentication required")`.
2. Call `/auth/v1/user` (5.9.1).
   - 401/403 from GoTrue ⇒ `HTTPException(401, "invalid or expired session")`.
   - timeout / connection error / 5xx ⇒ `logger.exception` +
     `HTTPException(503, "authentication temporarily unavailable")`.
     Note the split: a *rejected* token is 401, an *unreachable verifier*
     is 503. Collapsing them would tell a pharmacist to sign in again
     during a Supabase outage, and they would fail again.
3. Require `user["id"]`, a non-empty `user["email"]`, and
   `user["email_confirmed_at"]` non-null ⇒ otherwise
   `HTTPException(401, "email address not confirmed")`. This is what
   makes step 4 safe: matching an account by e-mail is only sound because
   GoTrue has confirmed that address.
4. Normalise the e-mail (`strip().lower()`) and resolve the account:
   ```python
   .table("pharmacist_accounts")
   .select("id,pharmacy_id,email,status,auth_user_id")
   .eq("auth_user_id", user_id).limit(1)         # 4a — the fast path
   # if empty:
   .eq("email", normalised_email).limit(1)       # 4b — first sign-in
   ```
   Two lookups only on the very first authenticated call of an account's
   life. `email` is stored pre-normalised (5.4), so `.eq` is a correct
   comparison without a functional filter.
5. Not found by either ⇒ `HTTPException(404, "pharmacist account not found")`.
6. **First-sign-in binding.** Found via 4b with `auth_user_id is null` ⇒
   `update … set auth_user_id = <user id> where id = <account id> and auth_user_id is null`.
   Found via 4b with a *different* non-null `auth_user_id` ⇒
   `HTTPException(403, "pharmacist account is linked to another user")`
   (only reachable if someone hand-edits rows; both sides are unique).
   The binding lives in the dependency rather than in a handler because
   every authenticated endpoint needs it to have happened, and it is
   idempotent — the guarded `update` makes a concurrent double-bind a
   no-op rather than a race.
7. Return `PharmacistIdentity`.

**`require_active_pharmacist(identity = Depends(get_current_pharmacist)) -> PharmacistIdentity`**

`identity.status != "active"` ⇒
`HTTPException(403, "pharmacist account is not active")`. Used by every
write. The read endpoint deliberately does **not** use it (5.10.2).

Both are `def`, not `async def` — `supabase-py` and the `httpx` call are
synchronous, so FastAPI runs them in the threadpool (step 2's rule).

**Logging rule:** never log an access token, not even truncated. Log the
account id and the status only.

### 5.9.4 `backend/app/services/phone.py`

```python
def normalise_tn_phone(raw: str) -> str | None:
    """'72 431 210', '+216 72-431-210', '0021672431210' -> '+21672431210'.
    Returns None when the input cannot be read as a Tunisian number."""
```

Rules, in order: strip every character that is not a digit or a leading
`+`; map a leading `00` to `+`; accept `+216XXXXXXXX`, `216XXXXXXXX`, or
a bare `XXXXXXXX` (8 digits) and emit `+216XXXXXXXX`; anything else is
`None`. Pure, no I/O, unit-testable — the `services/` charter (4.15.8).

Pharmacists will type the number the way it is printed on the door. A
form that rejects `72 431 210` because of two spaces is a form that loses
registrations.

## 5.10 API — the endpoints

Router: `APIRouter(prefix="/api/pharmacist", tags=["pharmacist"])`, added
to `main.py` alongside the existing three. **No CORS change**: step 1
already allows `POST` and `OPTIONS`, and `allow_headers=["*"]` covers the
`Authorization` preflight *because* `allow_credentials` is `False` — with
credentials enabled the wildcard would stop matching `Authorization` and
every request would fail preflight. Do not "improve" that setting.

All three responses carry `Cache-Control: no-store`. Authenticated
payloads must never enter a shared cache.

### 5.10.1 `POST /api/pharmacist/registrations`

Unauthenticated. This is the second anonymous write path in the project,
so step 4's threat model (§4.1) applies unchanged and its machinery is
reused rather than reinvented.

**Request** (`PharmacistRegistrationCreate`, `extra="forbid"`):

```json
{
  "pharmacy_id": "00000000-0000-4000-8000-000000000008",
  "email": "s.benali@example.tn",
  "full_name": "Sonia Ben Ali",
  "phone": "72 431 210"
}
```

Field validation:

| Field | Rule |
| --- | --- |
| `pharmacy_id` | `UUID`. Must exist ⇒ else 404. |
| `email` | `EmailStr`, then `strip().lower()` in a `field_validator`. |
| `full_name` | `str`, `min_length=2`, `max_length=120`, stripped; must not be blank after stripping. |
| `phone` | `str`, run through `normalise_tn_phone`; `None` ⇒ 422. |

`EmailStr` requires the `email-validator` package — the one new pip
dependency in this step (5.17). A hand-rolled e-mail regex is a
well-known way to reject valid addresses; the DB `check` constraint is a
coarse backstop, not the validator.

Handler flow (order matters, so an unknown pharmacy cannot consume a
rate-limit slot):

1. FastAPI validation ⇒ 422.
2. `resolve_client_ip` + `fingerprint_ip` from
   `app.services.reporter_identity` (step 4 §4.3), **unchanged and
   reused**. No IP resolvable ⇒ `logger.error` +
   `HTTPException(503, "registration temporarily unavailable")`. Fails
   **closed**, exactly as the report endpoint does, and deliberately
   unlike the view-logging endpoint (5.10.4) which fails open — a write
   that creates accounts must be limitable; a counter must not break a
   page.
3. Rate limit: `REGISTRATION_MAX_PER_FINGERPRINT_PER_DAY = 3`, a module
   constant in the router.
   ```python
   .table("pharmacist_accounts").select("id")
   .eq("registration_fingerprint", fingerprint)
   .gte("created_at", (now - timedelta(hours=24)).isoformat())
   .limit(REGISTRATION_MAX_PER_FINGERPRINT_PER_DAY + 1)
   ```
   `len(...) >= 3` ⇒ `logger.warning("registration rejected fp=%s", fp[:8])`
   + `HTTPException(429, "too many registration requests from this device")`.
   Three is generous for a legitimate device (a pharmacy laptop
   registering the titulaire and two assistants in one sitting) and low
   enough that account-table flooding is pointless. It is a single
   constant, deliberately, so it can be raised without a redesign.
   Evaluated against the table rather than process memory — decision
   4.15.5, same reasoning (Render restarts).
4. Pharmacy exists: `.table("pharmacies").select("id,name").eq("id", …).limit(1)`
   ⇒ empty ⇒ `HTTPException(404, "pharmacy not found")`.
5. E-mail free: `.table("pharmacist_accounts").select("id").eq("email", email).limit(1)`
   ⇒ non-empty ⇒ `HTTPException(409, "email already registered")`.
   The unique constraint is the real guard; this check exists to produce
   a clean 409 instead of a driver error. A concurrent duplicate that
   slips through must be **caught at insert and mapped to the same 409**,
   not surfaced as a 500.
6. Insert:
   ```python
   {
     "pharmacy_id": str(body.pharmacy_id),
     "email": body.email,
     "full_name": body.full_name,
     "phone": normalised_phone,
     "registration_fingerprint": fingerprint,
     # status omitted -> DB default 'pending'
     # auth_user_id omitted -> NULL until first sign-in
   }
   ```
   `status` is **never** accepted from the client. Same rule as step 4's
   `reported_by` (decision 4.15.7): the field that decides trust is
   server-set, and `extra="forbid"` makes an attempt to supply it a
   testable 422.
7. **201** (`PharmacistRegistrationCreated`):

```json
{
  "id": "b0a4…",
  "email": "s.benali@example.tn",
  "full_name": "Sonia Ben Ali",
  "status": "pending",
  "pharmacy_id": "00000000-0000-4000-8000-000000000008",
  "pharmacy_name": "Pharmacie Ibn Khaldoun"
}
```

`phone`, `registration_fingerprint` and `status_note` are **never** in
any response model. Build the response field by field; do not spread the
PostgREST row.

| Code | When | `detail` |
| --- | --- | --- |
| 201 | Created | — |
| 404 | Unknown `pharmacy_id` | `pharmacy not found` |
| 409 | E-mail already registered | `email already registered` |
| 422 | Validation, bad phone, extra field, client-supplied `status` | FastAPI's body |
| 429 | > 3 registrations / 24 h / fingerprint | `too many registration requests from this device` |
| 503 | Supabase failure, insert returned nothing, no client IP | `registration temporarily unavailable` |

Every failure maps to a **distinct status code**, so the frontend can
choose French copy by status without ever rendering `detail`
(2.12.8 preserved — this is why the per-pharmacy account cap was dropped
in 5.1: it would have needed a second meaning for 409).

**This endpoint sends no e-mail.** The browser calls Supabase Auth
immediately afterwards (5.13.2).

### 5.10.2 `GET /api/pharmacist/dashboard`

Authenticated with `get_current_pharmacist` — **not**
`require_active_pharmacist`. A `pending` account gets 200 with its real
data and `account.status = "pending"`; the frontend renders the waiting
state from the payload. Returning 403 here would force the pending UI to
be built out of an error, which 2.12.8 forbids (`detail` is never
rendered).

One endpoint rather than a `/me` + `/dashboard` pair: on a free instance
that may be cold, one round trip beats two, and every caller needs all of
it.

Three queries:

```python
# 1. The pharmacy the account claims.
.table("pharmacies")
.select("id,name,address,city,governorate,phone,verified")
.eq("id", str(identity.pharmacy_id)).limit(1)

# 2. The whole board for that pharmacy: 26 rows.
.table("pharmacy_medication_status")
.select("medication_id,medication_slug,medication_name,generic_name,form,"
        "category,status,reported_at,reported_by")
.eq("pharmacy_id", str(identity.pharmacy_id))

# 3. Search counters: 26 rows, global (not pharmacy-scoped — see below).
.table("medication_search_stats_7d").select("medication_id,viewers_7d")
```

Joined in Python on `medication_id`; a medication missing from (3) gets
`searches_last_7_days = 0`. Sorted in Python by `(category, name)` —
consistent with `GET /api/medications`, and the frontend regroups by
`CATEGORY_ORDER` anyway.

**Why the counter is not pharmacy-scoped.** The brief says "X people
searched for [drug] **near you**". Search is not pharmacy-scoped and
there is no geolocation anywhere in this project (deferred since step 2,
still deferred). The honest options were an invented proximity model or a
city-wide number. Since the entire product covers one city, a city-wide
number *is* "near you" — the copy says "à Bizerte" rather than "près de
vous" so the claim matches the data exactly. When coverage expands, the
counter scopes by `pharmacies.governorate` and the copy follows; nothing
in the schema blocks that.

**200** (`PharmacistDashboardResponse`):

```json
{
  "account": {
    "id": "b0a4…",
    "email": "s.benali@example.tn",
    "full_name": "Sonia Ben Ali",
    "status": "active",
    "created_at": "2026-08-15T09:12:00+00:00"
  },
  "pharmacy": {
    "id": "00000000-0000-4000-8000-000000000008",
    "name": "Pharmacie Ibn Khaldoun",
    "address": "5 Rue Ibn Khaldoun, Centre-ville",
    "city": "Bizerte",
    "governorate": "Bizerte",
    "phone": "+21672437264",
    "verified": true
  },
  "medications": [
    {
      "id": "10000000-0000-4000-8000-000000000001",
      "slug": "levothyrox-50",
      "name": "Levothyrox 50 µg",
      "generic_name": "Lévothyroxine sodique",
      "form": "Comprimé sécable, boîte de 30",
      "category": "thyroid",
      "status": "in_stock",
      "reported_at": "2026-08-15T08:40:00+00:00",
      "reported_by": "patient",
      "searches_last_7_days": 12
    }
  ],
  "count": 26,
  "stats_window_days": 7
}
```

Envelope with `count` per 2.12.7. `pharmacy.lat`/`lng` are omitted —
there is no map on the dashboard. The step-3 invariant holds unchanged:
`status == "none"` ⟺ `reported_at is null` ⟺ `reported_by is null`.

| Code | When | `detail` |
| --- | --- | --- |
| 200 | Any account status | — |
| 401 | Missing / invalid / unconfirmed token | see 5.9.3 |
| 403 | Account bound to a different auth user | `pharmacist account is linked to another user` |
| 404 | Signed in, but no `pharmacist_accounts` row for this e-mail | `pharmacist account not found` |
| 503 | Supabase or GoTrue unreachable | `dashboard temporarily unavailable` / `authentication temporarily unavailable` |

### 5.10.3 `POST /api/pharmacist/medications/{slug}/reports`

The authenticated counterpart of step 4's public report endpoint. Same
table, same append-only model, same server-set-fields discipline.

- **Auth:** `Depends(require_active_pharmacist)`.
- **Path:** `slug: str = Path(..., min_length=1, max_length=80, pattern=r"^[a-z0-9]+(-[a-z0-9]+)*$")`.
  Medication by slug, per decision 3.18.3 and step 4's precedent.
- **There is no `pharmacy_id` anywhere in the request.** It is read from
  `identity.pharmacy_id`, server-side. A pharmacist can only ever write
  for their own pharmacy, and that is structural rather than checked:
  there is no code path that could accept another pharmacy's id, exactly
  as there is no code path that could set `reported_by` (4.15.7).
- **Body** (`PharmacistReportCreate`, `extra="forbid"`):

```json
{ "status": "unsure" }
```

  `status: StockStatus` — **all three values**. This is the first and
  only place `unsure` becomes writable, which is precisely what decision
  4.15.1 reserved it for.

Server-set fields:

| Field | Set by |
| --- | --- |
| `pharmacy_id` | `identity.pharmacy_id` |
| `reported_by` | hard-coded `'pharmacist'` |
| `reported_by_account_id` | `identity.account_id` |
| `reported_at` / `created_at` | **omitted from the insert**, so the Postgres defaults fire (4.15.7 — kills backdating and future-dating by construction) |
| `reporter_fingerprint` | omitted ⇒ `NULL`. Matches the step-4 column comment: this is not the public reporting path. |
| `id` | `gen_random_uuid()` |

Flow: validate ⇒ resolve slug
(`.eq("slug", slug).eq("is_active", True)`, empty ⇒ 404
`medication not found`, same string as step 3/4) ⇒ insert ⇒ 201.

**Rate limiting: none, deliberately.** Step 4's four rules exist because
the caller is anonymous and unbounded. Here:

- the caller is a named, phone-verified human bound to one pharmacy;
- the blast radius is 26 pairs at one of twelve pharmacies, and it is
  self-evident to the pharmacy whose page it is;
- every row is attributed via `reported_by_account_id`;
- **the kill switch is free**: `status` is read from the database on
  every request, so `update … set status = 'suspended'` in the table
  editor stops the account on its next tap. A rate limit would add a
  query per toggle to slow down an attack we can simply end.

Re-asserting the same status is allowed and useful (it refreshes the
timestamp, which is what a patient reads). Accidental double-fire is
handled client-side by disabling the control while a request is in
flight.

**201** (`PharmacistReportCreated`) — identical shape to step 4's
`StockReportCreated`, so the frontend's optimistic-merge code is the same
pattern (4.15.10):

```json
{
  "id": "9c21…",
  "medication_id": "10000000-0000-4000-8000-000000000001",
  "medication_slug": "levothyrox-50",
  "pharmacy_id": "00000000-0000-4000-8000-000000000008",
  "status": "unsure",
  "reported_at": "2026-08-15T10:04:11.204+00:00",
  "reported_by": "pharmacist"
}
```

| Code | When | `detail` |
| --- | --- | --- |
| 201 | Written | — |
| 401 | Missing / invalid token | see 5.9.3 |
| 403 | `status != 'active'` | `pharmacist account is not active` |
| 404 | Unknown or inactive slug / no account | `medication not found` / `pharmacist account not found` |
| 422 | Bad slug shape, unknown status, extra field | FastAPI's body |
| 503 | Supabase failure or empty insert | `stock reporting temporarily unavailable` |

### 5.10.4 `POST /api/medications/{slug}/views`

Registered on the **existing** `medications` router, after `/search`
(step 3's route-ordering rule).

- **Auth:** none. **Body:** none.
- Resolve the fingerprint with the step-4 helpers. **Fails open**: if no
  IP is resolvable, log at debug and pass `None` — the event is still
  counted with a null fingerprint. A metric must never break a patient's
  page. (Contrast with 5.10.1 and step 4's report, which fail closed.)
- `get_supabase().rpc("log_medication_view", {"p_slug": slug, "p_fingerprint": fp})`
  — one round trip; an unknown slug inserts nothing.
- **204 No Content** on success. No body, no 404 for unknown slugs: a
  probe learns nothing and the caller has nothing to do with the answer.
- **503** on Supabase failure (logged). The browser ignores every
  outcome; the status code exists so the failure is visible in `/docs`
  testing and in acceptance test 5.19-15.
- `Cache-Control: no-store`.
- No rate limiting — see 5.6 (`count(distinct …)` makes single-source
  inflation pointless).

## 5.11 Frontend — packages, Supabase client, and `api.ts`

### Packages

```
@supabase/supabase-js@^2      # latest 2.x; record the resolved version in package.json
```

**Do not install** `@supabase/ssr` (we keep the session out of cookies —
5.12.2), and do not upgrade to a hypothetical v3 without re-reviewing
this section. No other new dependency: no form library, no validation
library, no state manager, no toast library. That rule has held since
step 3 and holds here.

### File inventory

```
frontend/src/
├── app/
│   ├── pharmacien/
│   │   ├── layout.tsx                    # new — shell, notice, robots:noindex
│   │   ├── page.tsx                      # new — dashboard route
│   │   ├── connexion/page.tsx            # new
│   │   ├── inscription/page.tsx          # new — Server Component (fetches pharmacies)
│   │   └── validation/page.tsx           # new — PKCE code exchange
│   └── medicaments/[slug]/page.tsx       # modified — <SearchEventLogger />
├── components/
│   ├── PharmacistNotice.tsx              # new
│   ├── PharmacistLoginForm.tsx           # new — CLIENT
│   ├── PharmacistRegistrationForm.tsx    # new — CLIENT
│   ├── MagicLinkPrompt.tsx               # new — CLIENT, shared "check your mail" + code
│   ├── PharmacistValidation.tsx          # new — CLIENT, the callback handler
│   ├── PharmacistDashboard.tsx           # new — CLIENT, owns auth + data + toggle state
│   ├── PharmacistMedicationRow.tsx       # new
│   ├── StockToggle.tsx                   # new — CLIENT, three-way control
│   ├── AccountStatusBanner.tsx           # new
│   ├── VerifiedBadge.tsx                 # new — step 2 §2.8's deferred badge
│   ├── SearchEventLogger.tsx             # new — CLIENT, renders null
│   ├── PharmacyListItem.tsx              # modified — <VerifiedBadge />
│   ├── StockPharmacyListItem.tsx         # modified — <VerifiedBadge />
│   ├── StockMap.tsx                      # modified — <VerifiedBadge /> in the popup
│   ├── StockLegend.tsx                   # modified — optional verified line
│   ├── StockResults.tsx                  # modified — pass showVerified to the legend
│   └── SiteFooter.tsx                    # modified — "Espace pharmacien" link
└── lib/
    ├── api.ts                            # modified — accessToken, 4 new functions
    ├── pharmacist.ts                     # new — error classification, constants
    ├── supabase/
    │   ├── client.ts                     # new — lazy browser client
    │   └── auth.ts                       # new — the only module importing supabase-js APIs
    └── i18n/fr.ts                        # modified — `pharmacist` namespace + additions
```

### `frontend/src/lib/supabase/client.ts`

```ts
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

/** Browser-only, lazily constructed. NEVER call at module scope: these
 *  modules are imported by Client Components, whose module bodies still
 *  execute during SSR. */
export function getSupabaseBrowserClient(): SupabaseClient {
  if (typeof window === "undefined") {
    throw new Error("getSupabaseBrowserClient() is browser-only.");
  }
  if (!client) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !anonKey) {
      throw new Error(
        "NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY are not configured.",
      );
    }
    client = createClient(url, anonKey, {
      auth: {
        flowType: "pkce",
        persistSession: true,
        autoRefreshToken: true,
        // The /pharmacien/validation page exchanges the code explicitly,
        // so auto-detection is off: one deterministic code path, and no
        // race between the SDK and the page's own effect.
        detectSessionInUrl: false,
      },
    });
  }
  return client;
}
```

`flowType: "pkce"` is set **explicitly** rather than relied upon: the
default has differed between supabase-js versions, and the callback page
is written for `?code=` exchange. Implicit flow was considered and
rejected — it returns tokens in the URL fragment, which leaks them into
browser history and any client-side logger, and it is deprecated.

### `frontend/src/lib/supabase/auth.ts` — the only module that touches the SDK

Every other file talks to this one. That keeps the "auth surface only"
invariant (5.0) enforceable by reading a single file.

```ts
export async function sendMagicLink(
  email: string,
  options: { createUser: boolean },
): Promise<void>;
// signInWithOtp({ email, options: {
//   shouldCreateUser: options.createUser,
//   emailRedirectTo: `${window.location.origin}/pharmacien/validation`,
// }})

export async function verifyEmailCode(email: string, code: string): Promise<void>;
// verifyOtp({ email, token: code, type: "email" })

export async function completeMagicLinkSignIn(code: string): Promise<void>;
// exchangeCodeForSession(code)

export async function getAccessToken(): Promise<string | null>;
// getSession() every time — never cache. getSession() refreshes a token
// that is near expiry, which is what keeps a dashboard left open on a
// pharmacy counter all day from silently 401-ing.

export async function getSessionEmail(): Promise<string | null>;

export async function signOutPharmacist(): Promise<void>;
// signOut(), then the caller redirects.

export function onAuthChange(cb: (signedIn: boolean) => void): () => void;
// onAuthStateChange wrapper returning its own unsubscribe function.
```

`shouldCreateUser` is the security-relevant argument:

| Caller | Value | Why |
| --- | --- | --- |
| `/pharmacien/connexion` | `false` | The login form must not be able to create Supabase users for arbitrary addresses. |
| `/pharmacien/inscription` | `true` | Called only after `POST /api/pharmacist/registrations` returned 201 — i.e. after our own validation and rate limit. |

With `shouldCreateUser: false`, an unknown address makes GoTrue return an
error. **The login form must not surface it**: it always shows the same
neutral "if an account exists, a link has been sent" message
(5.13.1) — otherwise the form is an account-enumeration oracle.

### `frontend/src/lib/api.ts` — modifications

1. `FetchOptions` gains one field:

```ts
type FetchOptions = {
  revalidate?: number;
  tags?: string[];
  timeoutMs?: number;
  signal?: AbortSignal;
  method?: "GET" | "POST";
  body?: unknown;
  accessToken?: string;   // NEW
};
```

Rule inside `fetchJson`: `accessToken` present ⇒ set
`Authorization: Bearer ${accessToken}` **and force `cache: "no-store"`,
never `next: {…}`**. A per-user response must never land in Next's
shared Data Cache. Everything else — `ApiError`, `AbortSignal.any`, the
60 s default timeout — is unchanged.

`api.ts` still imports nothing from `@supabase/supabase-js`. The caller
obtains a token from `auth.ts` and passes it in. That keeps `api.ts` the
sole fetch chokepoint (2.12.9) *and* keeps the SDK out of the read path.

2. New types, mirroring 5.10 exactly:

```ts
export type PharmacistAccountStatus = "pending" | "active" | "rejected" | "suspended";

export type PharmacistAccount = {
  id: string; email: string; full_name: string;
  status: PharmacistAccountStatus; created_at: string;
};
export type PharmacistPharmacy = {
  id: string; name: string; address: string; city: string;
  governorate: string; phone: string | null; verified: boolean;
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
  pharmacy_id: string; email: string; full_name: string; phone: string;
};
export type PharmacistRegistrationCreated = {
  id: string; email: string; full_name: string;
  status: PharmacistAccountStatus; pharmacy_id: string; pharmacy_name: string;
};
export type PharmacistReportCreated = {
  id: string; medication_id: string; medication_slug: string;
  pharmacy_id: string; status: StockStatus;
  reported_at: string; reported_by: ReportSource;
};
```

3. New functions:

```ts
export function registerPharmacist(
  input: PharmacistRegistrationInput,
): Promise<PharmacistRegistrationCreated>;
// POST /api/pharmacist/registrations   no-store, timeoutMs 60_000

export function getPharmacistDashboard(
  accessToken: string,
): Promise<PharmacistDashboardResponse>;
// GET /api/pharmacist/dashboard        accessToken, timeoutMs 60_000

export function reportStockAsPharmacist(
  slug: string, status: StockStatus, accessToken: string,
): Promise<PharmacistReportCreated>;
// POST /api/pharmacist/medications/{slug}/reports  body { status }

export function logMedicationView(slug: string): Promise<void>;
// POST /api/medications/{slug}/views   no-store, timeoutMs 15_000,
// resolves on 204, throws on non-2xx (every caller ignores the result)
```

Slugs go through `encodeURIComponent`. The 60 s timeouts are the
cold-start default (step 4's reasoning: a lost pharmacist toggle is worse
than a slow one). `logMedicationView` uses 15 s because nothing waits on
it and a hung request on a hot page is pure waste.

### `frontend/src/lib/pharmacist.ts`

```ts
import { ApiError } from "@/lib/api";

export type PharmacistErrorKind =
  | "session_expired" | "not_active" | "no_account" | "network" | "generic";

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
  | "email_taken" | "rate_limited" | "not_found" | "network" | "generic";

export function classifyRegistrationError(error: unknown): RegistrationErrorKind {
  if (error instanceof ApiError) {
    if (error.status === 409) return "email_taken";
    if (error.status === 429) return "rate_limited";
    if (error.status === 404) return "not_found";
    return "generic";      // 422, 500, 503
  }
  return "network";
}

/** Mirrors step 4's REPORT_SLOW_AFTER_MS. */
export const TOGGLE_SLOW_AFTER_MS = 6_000;
```

The keys of `dict.pharmacist.dashboard.errors` and
`dict.pharmacist.register.errors` must stay in step with these unions —
components index them directly (step 4 §4.9's rule).

## 5.12 Frontend — routing, the pharmacist shell, and the disclaimer

### 5.12.1 Routes

Unaccented, URL-safe French, per decision 2.12.13.

| Route | Role | Rendering |
| --- | --- | --- |
| `/pharmacien` | Dashboard | Server shell (metadata) → client component |
| `/pharmacien/connexion` | Sign in | Server shell → client form |
| `/pharmacien/inscription` | Register | **Server Component** (fetches the 12 pharmacies with ISR 300) → client form |
| `/pharmacien/validation` | Magic-link landing; exchanges `?code=` | Server shell → `<Suspense>` → client |

`/pharmacien/validation` rather than `/pharmacien/callback`: the naming
convention is French and this URL is visible to the user in their
address bar and in the redirect-URL allowlist.

`app/pharmacien/layout.tsx` exports

```ts
export const metadata: Metadata = {
  title: "Espace pharmacien — Mawjoud",
  robots: { index: false, follow: false },
};
```

and renders the shared container
(`mx-auto flex min-h-screen w-full max-w-screen-sm flex-col gap-6 px-4 py-8`
— narrower than `/medicaments`, there is no map here), a header linking
back to `/`, `<PharmacistNotice />`, `{children}`, `<SiteFooter />`.
`robots: noindex` follows `/statut`'s precedent (§3.15): none of these
pages should ever appear in a patient's search results.

### 5.12.2 No cookies, no middleware, no server-side session

The session lives in `localStorage`, managed by supabase-js. Therefore:

- **No Next.js middleware and no server-side route protection.** A
  middleware cannot see a `localStorage` session, so any "protection" it
  offered would be theatre. Route gating is a client-side redirect
  (UX only); the real gate is FastAPI, which re-verifies the token and
  re-reads the account status on **every single request** (5.9.3).
- **No `@supabase/ssr`, no auth cookies.** Cookies would be third-party
  across `vercel.app` → `onrender.com` (5.0 option B, point 1) and would
  force `allow_credentials=True`.
- Accepted trade-off: a `localStorage` token is readable by any XSS on
  the site. The exposure is bounded — the token grants a pharmacist the
  ability to write stock reports for one pharmacy, nothing more; it
  cannot read the database; and it expires in an hour. Mitigation is the
  usual one: no `dangerouslySetInnerHTML`, no third-party scripts (the
  project has none, and step 3 already refuses new dependencies).

### 5.12.3 The disclaimer on pharmacist pages — a scoped clarification

`CLAUDE.md`'s non-negotiable is that **every patient-facing page** shows
the community-data disclaimer. The four `/pharmacien*` routes are not
patient-facing, and rendering "these data are community-reported, call
ahead" to the pharmacist who *is* the source is incoherent.

**Decision: `<Disclaimer />` is not rendered on `/pharmacien*`.
`<PharmacistNotice />` takes its place, in the same slot, stating the
mirror-image fact.** It deliberately restates the community-data framing
from the pharmacist's side rather than dropping it:

> « Mawjoud affiche des informations signalées par la communauté. Vos
> mises à jour sont affichées aux patients comme « Confirmé par la
> pharmacie » : elles font autorité. »

Visual treatment: `bg-brand-50` with a `border-brand-600/20` border and
`text-ink`, `role="note"` — deliberately *not* the amber `warn-*` tokens,
because this is an informational statement rather than a caution, and
the two must not be confused at a glance.

**Every patient-facing route keeps `<Disclaimer />` exactly as it is.**
No patient page loses it, is reordered, or has it pushed below the fold
by anything in this step. Acceptance test 5.19-26.

## 5.13 Frontend — the authentication pages

### 5.13.1 `/pharmacien/connexion` — `PharmacistLoginForm`

State: `email`, `phase: "idle" | "sending" | "sent"`, `error: "rate_limited" | "generic" | null`.

1. `<label>` + `<input type="email" inputMode="email" autoComplete="email" required className="h-12 text-base">`
   (16 px prevents iOS zoom-on-focus — step 3's rule).
2. Submit ⇒ `phase = "sending"` ⇒ `sendMagicLink(email, { createUser: false })`.
3. **On both success and "user not found", go to `phase = "sent"`** and
   render `<MagicLinkPrompt email={email} />`. The only error surfaced is
   a Supabase 429 (`error.status === 429` or a rate-limit message), shown
   as `login.rateLimited` — a 429 leaks nothing about whether the address
   exists. Everything else is logged to the console and treated as sent.
   This is the anti-enumeration rule and it must not be "helpfully"
   relaxed during implementation.
4. Below the form: `login.noAccount` + a `<Link href="/pharmacien/inscription">`.

If a session already exists on mount, redirect to `/pharmacien`.

### 5.13.2 `/pharmacien/inscription` — `PharmacistRegistrationForm`

`page.tsx` is an **async Server Component**: `export const revalidate = 300`,
`const data = await getPharmacies()` inside a `try/catch` (decision
2.12.9 — a cold Render instance must not fail the Vercel build), then
`<PharmacistRegistrationForm pharmacies={data.pharmacies} />`. On error,
the French error line plus a plain `<a href>` retry, exactly as
`/pharmacies` does.

The form (client), fields in order:

| Field | Control |
| --- | --- |
| Pharmacy | `<select required>` of the 12, `{name} — {address}`, grouped by `city` with `<optgroup>` so the outlying towns are findable. A native `<select>`, not a combobox: 12 options, and native pickers are the best mobile UX available for free. |
| Nom et prénom | `<input type="text" autoComplete="name" required>` |
| E-mail | `<input type="email" autoComplete="email" required>` |
| Téléphone | `<input type="tel" inputMode="tel" autoComplete="tel" required>` with `register.phoneHint` |

Below the fields: `register.dataNote` ("vos coordonnées ne sont pas
publiées"), and `register.missingPharmacy(contactEmail)` with a
`mailto:` for the pharmacy-not-listed case (5.1).

Submit sequence — the order is the point:

```ts
1. registerPharmacist({...})                        // FastAPI: validate, rate-limit, insert 'pending'
2. await sendMagicLink(email, { createUser: true }) // only after 201
3. render <MagicLinkPrompt email={email} registered />
```

Never call Supabase first: step 2 would then create auth users for
registrations our own validation rejects, and it would hand the
e-mail-send trigger to an unvalidated form.

Client-side validation is presentational only (`required`, `type="email"`);
the server is the authority. Errors are mapped by
`classifyRegistrationError` to `register.errors[kind]`, rendered in a
`role="alert"` above the submit button. `email_taken` additionally
renders a `<Link href="/pharmacien/connexion">`.

If step 1 succeeds and step 2 fails, the account row exists but no e-mail
was sent. The prompt therefore always offers **`magicLink.resend`**,
which re-runs `sendMagicLink(email, { createUser: true })` — idempotent,
because GoTrue will not duplicate the user.

### 5.13.3 `MagicLinkPrompt` — and the cross-device trap

This shared component is the single most important piece of UX in the
step, because **PKCE sign-in only completes in the browser that started
it**. The `code_verifier` is written to that browser's `localStorage` by
`signInWithOtp`; a pharmacist who requests the link on the pharmacy's
desktop and opens their mail on their phone gets
`invalid request: both auth code and code verifier should be non-empty`
and is permanently stuck. That is not an edge case — it is the *normal*
behaviour of someone whose e-mail is on their phone.

`MagicLinkPrompt` therefore renders **three** things:

1. `magicLink.sentTitle` + `magicLink.sentBody(email)` + `magicLink.spamHint`.
2. `magicLink.sameDeviceWarning`, prominently — prevention beats recovery.
3. **A 6-digit code fallback.** `<input inputMode="numeric" pattern="[0-9]*" maxLength={6} autoComplete="one-time-code">`
   ⇒ `verifyEmailCode(email, code)` ⇒ on success `router.replace("/pharmacien")`.
   `verifyOtp` needs no `code_verifier`, so it works from **any** device
   and also survives corporate mail scanners that consume single-use
   links. The code arrives in the same e-mail (5.8 step 3). This is still
   "no password, no SMS/OTP cost" — the same e-mail, no new channel, no
   new provider.
4. `magicLink.resend`.

Errors: `magicLink.codeInvalid` on a bad or expired code, in a
`role="alert"`.

### 5.13.4 `/pharmacien/validation` — the code exchange

`page.tsx` renders `<Suspense fallback={…}><PharmacistValidation /></Suspense>`.
The `<Suspense>` boundary is **required**: `useSearchParams()` in a
client component makes the route bail out of static rendering and Next 15
errors at build time without it. This is the most likely build failure in
this step, exactly as `await params` was in step 3.

`PharmacistValidation` (client), on mount:

```
const code  = searchParams.get("code");
const error = searchParams.get("error_description") ?? searchParams.get("error");

if (error || !code)  -> failed state
else                 -> completeMagicLinkSignIn(code)
                        ok    -> router.replace("/pharmacien")
                        throw -> failed state
```

Guard the effect with a `useRef` so React StrictMode's double-invoke does
not attempt the exchange twice — the code is single-use, so the second
attempt fails and would flash an error over a successful sign-in.

Failed state: `validation.failedTitle` + `validation.failedBody` (which
names all three real causes: expired, already used, opened on another
device) + a `<Link href="/pharmacien/connexion">` for
`validation.retry`. Never a stack trace, never an English GoTrue message.

## 5.14 Frontend — the dashboard

### `app/pharmacien/page.tsx`

Server Component shell: `export const metadata = { title: "Tableau de bord — Mawjoud" }`,
renders `<PharmacistDashboard />`. No `revalidate`, no server fetch —
per-user data cannot be ISR-cached. This is a **scoped exception to
decision 2.12.9** (5.18.6): the rule stands for every public page.

### `PharmacistDashboard.tsx` (client) — owns everything

```ts
type Phase =
  | { kind: "checking" }                                   // reading the session
  | { kind: "loading" }                                    // fetching the dashboard
  | { kind: "ready"; data: PharmacistDashboardResponse }
  | { kind: "error"; error: PharmacistErrorKind };
```

Mount sequence:

```
getAccessToken()
  null  -> router.replace("/pharmacien/connexion")
  token -> getPharmacistDashboard(token)
             ok  -> { kind: "ready", data }
             err -> classifyPharmacistError(err)
                      "session_expired" -> signOutPharmacist() then redirect to /pharmacien/connexion
                      "no_account"      -> { kind: "error", error: "no_account" }
                      otherwise         -> { kind: "error", error }
```

`onAuthChange` is subscribed so a sign-out in another tab redirects this
one. Unsubscribe on unmount.

Render, top to bottom:

1. **Pharmacy header** — `pharmacy.name` as `<h2>`, address, `city` when
   `!== "Bizerte"` (step 2's rule), `<VerifiedBadge />` when
   `pharmacy.verified`.
2. **Account line** — `dashboard.signedInAs(account.email)` and a
   `dashboard.logout` button (`signOutPharmacist()` then
   `router.replace("/pharmacien/connexion")`).
3. **`<AccountStatusBanner status={account.status} />`** — renders
   nothing when `active`; otherwise the `status.pending*` /
   `status.rejected*` / `status.suspended*` copy in a `role="status"`
   panel.
4. **Top-searched block** — `dashboard.topSearchedTitle` plus the three
   medications with the highest `searches_last_7_days`, computed
   client-side. Hidden entirely when every count is 0 (which it will be
   until the site has traffic — no empty scoreboard).
   **There is no site-wide total anywhere.** Per-medication distinct
   counts cannot be summed without double-counting the same viewer, and
   displaying a knowingly wrong number on the one screen designed to earn
   trust would be self-defeating.
5. **`dashboard.updatedHint`** — one line explaining that a tap is
   immediately visible to patients.
6. **The medication list**, grouped by `CATEGORY_ORDER` under the
   existing `dict.medications.categories[…]` headings (reused from step
   3, not re-invented), each group a `<ul>` of
   `<PharmacistMedicationRow>`.

### `PharmacistMedicationRow.tsx`

An `<li className="rounded-lg border bg-surface p-4">` containing:

1. `<h4 className="font-medium text-ink">` — `name`; `generic_name` ·
   `form` on a second `text-sm text-muted` line.
2. Current state: `<StockStatusBadge status={m.status} />` (step 3's
   component, unchanged) plus, when `m.status !== "none"`,
   `<StockReportTime iso={m.reported_at} source={m.reported_by} />`
   (also unchanged — **this is where its `pharmacist` branch finally
   renders real data**, §3.12). When `status === "none"`,
   `dashboard.neverReported`.
3. When `m.reported_by === "patient"`: `dashboard.lastByPatientHint`
   ("Dernier état signalé par un patient. Confirmez ou corrigez d'un
   appui.") in `text-xs text-muted`. This is how 5.3's "latest wins"
   decision is made livable — a patient contradiction arrives as
   actionable feedback, not as something to fight.
4. `<StockToggle …>`.
5. `dashboard.searchCount(m.searches_last_7_days)` in `text-xs text-muted`,
   with `dashboard.searchCountHint` as the `title`.
6. A small `<Link href={`/medicaments/${m.slug}`}>` —
   `dashboard.viewPublicPage`.

### `StockToggle.tsx` (client)

```ts
type StockToggleProps = {
  medicationName: string;                 // for the group's aria-label
  current: StockStatusView;               // may be "none"
  state: ToggleUiState;
  disabled?: boolean;                     // true for non-active accounts
  onSelect: (status: StockStatus) => void;
};

type ToggleUiState = {
  phase: "idle" | "saving" | "error";
  pending?: StockStatus;
  slow: boolean;
};
```

Markup follows step 2's `ViewToggle` precedent rather than inventing a
new pattern: `<div role="group" aria-label={toggle.ariaLabel(name)}>`
containing three `<button type="button" aria-pressed={current === value}>`
in the order **Disponible / En rupture / Incertain**.

- Layout `grid grid-cols-3 gap-2`, each button `min-h-11` (≥ 44 px touch
  target), `text-sm font-medium`.
- Selected button: filled with its status colour pair
  (`STOCK_STYLES[status].badge` from `frontend/src/lib/stock.ts`, reused —
  the dashboard and the patient page can therefore never disagree about
  what "Disponible" looks like) plus `ring-1 ring-current`.
- Unselected: `border bg-surface text-muted`.
- `current === "none"`: nothing is pressed; all three are unselected.
- `phase === "saving"`: all three `disabled`, `aria-busy` on the group,
  the tapped one shows `dashboard.saving`.
- `+ slow` after `TOGGLE_SLOW_AFTER_MS`: `report.slow` (step 4's honest
  cold-start line, reused verbatim).
- `phase === "error"`: buttons return to idle plus
  `<p role="alert">{dashboard.saveError}</p>` — retry is one tap.
- `disabled`: all three `disabled` with `disabled:opacity-60`, so a
  pending pharmacist sees exactly what they will get.

**Colour is never the only signal** (decision 3.18.13): each button
carries its French label.

### The toggle handler — reusing step 4's write pattern verbatim

```ts
async function handleToggle(medication: DashboardMedication, status: StockStatus) {
  if (toggleUi[medication.id]?.phase === "saving") return;      // idempotent guard
  setToggleUi(… "saving" …);
  const slowTimer = setTimeout(… slow: true …, TOGGLE_SLOW_AFTER_MS);
  try {
    const token = await getAccessToken();
    if (!token) { router.replace("/pharmacien/connexion"); return; }
    const created = await reportStockAsPharmacist(medication.slug, status, token);
    setLocalReports((s) => ({ ...s, [medication.id]: {
      status: created.status,
      reported_at: created.reported_at,
      reported_by: created.reported_by,
    }}));
    setToggleUi(… "idle" …);
    // Purge the PATIENT page's caches so the pharmacist's update is
    // visible to patients immediately. Best-effort: never block or undo
    // the feedback already given.
    try { await revalidateMedicationStock(medication.slug); } catch {}
  } catch (error) {
    const kind = classifyPharmacistError(error);
    if (kind === "session_expired") { await signOutPharmacist(); router.replace("/pharmacien/connexion"); return; }
    if (kind === "not_active")      { /* refetch the dashboard: status changed under us */ }
    setToggleUi(… "error" …);
  } finally { clearTimeout(slowTimer); }
}
```

- `localReports` merges over `data.medications` by
  `Date.parse(local.reported_at) > Date.parse(server.reported_at ?? -∞)`,
  server wins on ties — **decision 4.15.10 reused unchanged**.
- `revalidateMedicationStock` is step 4's existing
  `frontend/src/lib/actions/stock.ts` server action, imported as-is. Without
  it a pharmacist's toggle would not reach patients for up to 60 s of ISR
  — which is the entire point of the feature. Nothing new is written
  here; the mechanism from §4.6 simply gains a second caller.
- The dashboard itself needs no cache purge: it is fetched `no-store`.

### States table

| Situation | What the pharmacist sees |
| --- | --- |
| Not signed in | Instant redirect to `/pharmacien/connexion` |
| Session valid, loading | `dashboard.loading` |
| Signed in, no account row (404) | `status.noAccountTitle/Body` + `status.registerCta` → `/pharmacien/inscription` |
| `pending` | Full board, all toggles disabled, `status.pending*` banner |
| `rejected` / `suspended` | Same, with their own banner copy |
| `active` | Full board, toggles live |
| Toggle in flight | That row's buttons disabled, tapped one reads `Enregistrement…` |
| In flight > 6 s | Additionally `report.slow` |
| Toggle succeeded | Badge, timestamp line and pressed button update instantly; patients see it on their next request |
| 401 mid-session | Signed out and redirected, no error flash |
| 403 mid-session (just suspended) | Dashboard refetches; the banner appears |
| API unreachable | `dashboard.errors.network` + a retry button |

## 5.15 Frontend — the patient side

Two additions, both small, both long-promised.

### 5.15.1 `VerifiedBadge` — step 2 §2.8's deferred badge

```tsx
<span className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700">
  <svg aria-hidden … />   {/* small check glyph, currentColor */}
  {dict.stock.verifiedBadge}
</span>
```

- Rendered **only when `verified === true`**. There is never an
  "unverified" counterpart — step 2's reasoning is unchanged: a warning
  on every card reads as "this whole site is untrustworthy".
- Appears in `PharmacyListItem` (`/pharmacies`),
  `StockPharmacyListItem` and the `StockMap` popup
  (`/medicaments/[slug]`), and the dashboard's pharmacy header.
- `StockLegend` gains an optional fifth line, `stock.verifiedLegend`
  ("Un pharmacien de cet établissement met à jour lui-même les
  disponibilités."), rendered only when `StockResults` passes
  `showVerified={pharmacies.some((p) => p.verified)}` — a legend for a
  badge nobody can see is noise.
- Copy is **"Pharmacie inscrite"**, not "Pharmacie vérifiée": we verified
  a *pharmacist*, and the badge must not be read as certifying the
  pharmacy's stock, its hours, or anything clinical.
- Until the first account is activated every seed row is `false`, so the
  badge is invisible — by design, and acceptance test 5.19-25 activates
  an account to prove it appears.

### 5.15.2 `SearchEventLogger` — counting a search

```tsx
"use client";
export function SearchEventLogger({ slug }: { slug: string }) {
  const fired = useRef(false);
  useEffect(() => {
    if (fired.current) return;
    fired.current = true;
    void logMedicationView(slug).catch(() => {});   // never surfaces
  }, [slug]);
  return null;
}
```

Added to `app/medicaments/[slug]/page.tsx`. Notes:

- The `useRef` guard is required: React StrictMode double-invokes effects
  in dev, and without it every local page view counts twice.
- Every failure is swallowed. A metric must never produce a visible error
  on a patient's page.
- It runs on mount, so client-side navigation between medication pages
  counts each one — which is correct, they are separate searches.
- It is the **only** reason this page makes a network call at all when
  served from the ISR cache; it is fire-and-forget and blocks nothing.

## 5.16 French copy — `frontend/src/lib/i18n/fr.ts`

No user-visible string is hard-coded in a component (step 1's rule);
parameterised copy is a function (2.12.12); 0 and 1 take the singular.

```ts
common: {
  // unchanged, plus:
  contactEmail: "contact@mawjoud.tn",   // PLACEHOLDER — see 5.22
},
footer: {
  // unchanged, plus:
  pharmacist: "Espace pharmacien",
},
stock: {
  // unchanged, plus:
  verifiedBadge: "Pharmacie inscrite",
  verifiedLegend:
    "Un pharmacien de cet établissement met à jour lui-même les disponibilités.",
},
pharmacist: {
  notice:
    "Mawjoud affiche des informations signalées par la communauté. Vos mises à jour sont affichées aux patients comme « Confirmé par la pharmacie » : elles font autorité.",

  login: {
    title: "Connexion pharmacien",
    intro:
      "Saisissez l'adresse e-mail de votre inscription. Vous recevrez un lien de connexion — aucun mot de passe n'est nécessaire.",
    emailLabel: "Adresse e-mail",
    submit: "Recevoir un lien de connexion",
    sending: "Envoi…",
    noAccount: "Votre pharmacie n'a pas encore de compte ?",
    registerLink: "Inscrire votre pharmacie",
    rateLimited:
      "Trop de demandes en peu de temps. Réessayez dans quelques minutes.",
  },

  magicLink: {
    sentTitle: "Vérifiez votre boîte e-mail",
    sentBody: (email: string) =>
      `Si un compte pharmacien est associé à ${email}, un lien de connexion vient d'être envoyé. Il est valable une heure.`,
    sameDeviceWarning:
      "Important : ouvrez le lien sur cet appareil et dans ce navigateur. Sinon, utilisez le code à 6 chiffres ci-dessous.",
    spamHint: "Pensez à vérifier vos courriers indésirables.",
    codeLabel: "Code à 6 chiffres reçu par e-mail",
    codeSubmit: "Valider le code",
    codeChecking: "Vérification…",
    codeInvalid: "Code incorrect ou expiré. Demandez un nouveau lien.",
    resend: "Renvoyer un lien",
  },

  validation: {
    working: "Validation de votre lien de connexion…",
    failedTitle: "Lien de connexion invalide",
    failedBody:
      "Ce lien a expiré, a déjà été utilisé, ou a été ouvert sur un autre appareil que celui d'où vous l'avez demandé.",
    retry: "Demander un nouveau lien",
  },

  register: {
    title: "Inscrire votre pharmacie",
    intro:
      "L'inscription est réservée aux pharmacies de la région de Bizerte déjà référencées sur Mawjoud. Votre compte est activé après un appel de vérification au numéro de la pharmacie.",
    pharmacyLabel: "Votre pharmacie",
    pharmacyPlaceholder: "Sélectionnez votre pharmacie",
    fullNameLabel: "Nom et prénom du pharmacien",
    emailLabel: "Adresse e-mail",
    phoneLabel: "Votre téléphone",
    phoneHint:
      "Numéro tunisien, par exemple 72 431 210. Il sert uniquement à vous joindre.",
    dataNote:
      "Vos coordonnées ne sont pas publiées sur le site. Elles servent uniquement à vérifier votre inscription.",
    missingPharmacy: (email: string) =>
      `Votre pharmacie n'apparaît pas dans la liste ? Écrivez-nous à ${email}.`,
    submit: "Envoyer la demande d'inscription",
    submitting: "Envoi…",
    errors: {
      email_taken:
        "Cette adresse e-mail est déjà associée à un compte. Connectez-vous plutôt.",
      rate_limited:
        "Trop de demandes d'inscription depuis cet appareil. Réessayez demain.",
      not_found:
        "Cette pharmacie n'est plus disponible. Rechargez la page.",
      network:
        "Connexion impossible. Vérifiez votre réseau et réessayez.",
      generic:
        "L'inscription n'a pas pu être enregistrée. Réessayez dans un instant.",
    },
  },

  status: {
    pendingTitle: "Compte en cours de vérification",
    pendingBody:
      "Votre demande a bien été reçue. Nous appelons la pharmacie pour vérifier votre identité avant d'activer la mise à jour des disponibilités. Vous pouvez déjà consulter votre tableau de bord.",
    rejectedTitle: "Demande non validée",
    rejectedBody:
      "Votre demande d'inscription n'a pas été validée. Contactez-nous si vous pensez qu'il s'agit d'une erreur.",
    suspendedTitle: "Compte suspendu",
    suspendedBody:
      "Ce compte ne peut plus mettre à jour les disponibilités. Contactez-nous pour en savoir plus.",
    noAccountTitle: "Aucun compte associé",
    noAccountBody:
      "Aucun compte pharmacien n'est associé à cette adresse e-mail.",
    registerCta: "Inscrire votre pharmacie",
  },

  dashboard: {
    loading: "Chargement de votre tableau de bord…",
    signedInAs: (email: string) => `Connecté en tant que ${email}`,
    logout: "Se déconnecter",
    updatedHint:
      "Appuyez sur un état pour le mettre à jour. La modification est visible immédiatement par les patients.",
    neverReported: "Jamais renseigné",
    lastByPatientHint:
      "Dernier état signalé par un patient. Confirmez ou corrigez d'un appui.",
    viewPublicPage: "Voir la page patient",
    searchCount: (n: number) =>
      n === 0
        ? "Aucune recherche cette semaine"
        : `${n} recherche${n > 1 ? "s" : ""} cette semaine`,
    searchCountHint:
      "Nombre estimé de patients ayant consulté la disponibilité de ce médicament à Bizerte sur les 7 derniers jours.",
    topSearchedTitle: "Les plus recherchés cette semaine",
    saving: "Enregistrement…",
    saveError: "Mise à jour impossible. Réessayez.",
    retry: "Réessayer",
    errors: {
      session_expired: "Votre session a expiré. Reconnectez-vous.",
      not_active: "Votre compte n'est pas encore activé.",
      no_account:
        "Aucun compte pharmacien n'est associé à cette adresse e-mail.",
      network: "Connexion impossible. Vérifiez votre réseau et réessayez.",
      generic:
        "Le tableau de bord est momentanément indisponible. Réessayez dans un instant.",
    },
  },

  toggle: {
    ariaLabel: (medication: string) => `Disponibilité de ${medication}`,
  },
},
```

Copy notes:

- The three toggle buttons reuse `dict.stock.status.in_stock` /
  `out_of_stock` / `unsure` ("Disponible" / "En rupture" / "Incertain").
  There is **no separate toggle vocabulary**: the pharmacist must be
  choosing between the exact words the patient will read. (Contrast with
  step 4, where the patient's buttons say "Disponible ici" / "Pas
  disponible ici" because they describe an observation, not a state.)
- `dashboard.saving` and `report.slow` are the only strings shared with
  step 4's report flow; `report.slow` is reused verbatim rather than
  duplicated.
- `login` deliberately has no "unknown e-mail" message. There is no such
  state (5.13.1).
- `common.contactEmail` is a **placeholder** and must be replaced before
  the registration page is shown to anyone real (5.22).

## 5.17 Environment, config and deployment changes

### `backend/requirements.txt` — one addition

```
email-validator==2.2.0
```

Required by Pydantic's `EmailStr`. Pure Python, no build step, no
transitive weight. Justified in 5.10.1. No other pip dependency: the JWT
is verified over HTTP with the `httpx` already pinned since step 1, so
there is **no** `pyjwt`, no `python-jose`, no `cryptography`.

### `backend/.env.example` — one new row

| Variable | Required | Example | Notes |
| --- | --- | --- | --- |
| `SUPABASE_ANON_KEY` | yes | `your-anon-key` | Not secret — it also ships in the browser bundle. Used **only** as the `apikey` header when verifying a pharmacist's token against `/auth/v1/user`. Never used for data access. |

### `render.yaml` — one new `envVars` entry

```yaml
      - key: SUPABASE_ANON_KEY
        sync: false
```

### `frontend/.env.example` — comments only

`NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` have been
declared and set in Vercel since step 1 and unused ever since. They are
now **in use**. Replace the step-3 comment with:

```
# Used by @supabase/supabase-js in the browser for AUTHENTICATION ONLY
# (/auth/v1/*). The browser never calls /rest/v1, /realtime/v1 or
# /storage/v1 — see docs/ARCHITECTURE.md 5.0.
```

No new Vercel environment variables. Step 1's decision to declare them
early pays off here: the deployment needs no configuration change beyond
the Supabase dashboard settings in 5.8.

### `supabase/README.md`

The four new migrations, the three new Rules lines and the activation
procedure — all listed in 5.7.

## 5.18 Amendments to earlier steps

Recorded here rather than by editing steps 1–4, per this document's
preamble.

1. **Decision 2.12.1 narrowed.** Was: "all Supabase access goes through
   FastAPI; the browser never calls Supabase over HTTP." Now: **"all
   Supabase *data* access goes through FastAPI. The browser calls
   Supabase Auth (`/auth/v1/*`) and nothing else — never `/rest/v1`,
   `/realtime/v1`, `/storage/v1` or any PostgREST RPC."** Reasoning and
   the full fork in 5.0. Step 2 §2.0's four justifications are all about
   table data and are untouched.
2. **Decision 2.12.2 unchanged and reaffirmed.** Both new tables are
   RLS-on with **zero policies** and revoked from `anon`/`authenticated`.
   Signing a pharmacist in grants them the `authenticated` role, which
   can still read nothing. Acceptance tests 5.19-8 and 5.19-9 prove it
   with a real token.
3. **Step 1 §4 amended.** "The backend never receives or uses the anon
   key" becomes: the backend holds `SUPABASE_ANON_KEY` and uses it solely
   as the `apikey` header on `/auth/v1/user` verification calls (5.9.1).
   The service-role key remains the only credential used for data. The
   rule that the service-role key never appears in `frontend/` is unchanged
   and absolute.
4. **Step 2 §2.2's `pharmacies.verified` comment amended.** Was: "True
   only once a human has confirmed the pharmacy exists and its details
   are correct." Now: *"DERIVED — maintained by the
   `pharmacist_accounts_refresh_verified` trigger. True iff the pharmacy
   has at least one `active` pharmacist account. Do not set by hand."*
   (5.2, 5.4.)
5. **Step 2 §2.8's deferred `verified` badge is delivered** (5.15.1),
   with the promised contrast: it stays invisible on all-`false` demo
   data and appears the moment an account is activated.
6. **Decision 2.12.9 scoped.** "Backend-backed pages are Server
   Components with ISR" remains the rule for every **public** page.
   `/pharmacien` is per-user and is client-rendered with a client-side
   fetch and `no-store`; ISR cannot apply to per-user data. No public
   page changes its rendering strategy.
7. **Step 3 §3.3's promised mirror index is NOT created**, with reasoning
   and an `explain` acceptance check (5.5). The commitment is discharged
   by demonstrating the index would serve nothing.
8. **Step 3 §3.4's `pharmacy_medication_status` view gains five appended
   columns** (`medication_slug`, `medication_name`, `generic_name`,
   `form`, `category`). The first fourteen columns are unchanged in name,
   type and order; step 3's endpoint selects explicitly and is
   unaffected (5.7).
9. **Step 3 §3.12's `reported_by === "pharmacist"` branch is exercised
   for the first time.** "Confirmé par la pharmacie" now renders real
   data on `/medicaments/[slug]`, in the map popups, and on the
   dashboard. `StockReportTime` needs no change.
10. **Step 3 §3.19's deferred `search_events` table is delivered**
    (5.6), with the counting semantics that step 3 could not settle: a
    search is a medication-page view, logged by a dedicated endpoint, not
    by the cached search or results endpoints.
11. **Step 4 §4.16's open question answered: no.** A patient report does
    override a pharmacist confirmation; "latest wins" is unchanged and
    absolute (5.3). Decision 3.18.5 stands untouched.
12. **Step 4 §4.15.1 discharged.** `unsure` becomes writable, in exactly
    the one place it was reserved for: the authenticated pharmacist
    toggle. The public endpoint still rejects it with 422.
13. **Step 4 §4.6's server action gains a second caller.**
    `revalidateMedicationStock` is imported unchanged by the dashboard so
    a pharmacist's toggle purges the patient page's Data Cache and Full
    Route Cache. No new mechanism.
14. **Step 4 §4.3's `reporter_identity` service gains two callers** —
    the registration endpoint (fail closed) and the view-logging endpoint
    (fail open). The module itself is unchanged.
15. **Step 1's CORS note resolved.** "`allow_credentials=False` … step 5
    uses bearer tokens — revisit there if that changes": it did not
    change. Bearer tokens, no cookies, `allow_credentials` stays `False`,
    and that is *why* `allow_headers=["*"]` legally covers
    `Authorization`.
16. **Step 4's non-goal "no search/report analytics — still step 5"**
    is delivered (5.6).

## 5.19 Acceptance test — step 5 is done when all of these pass

Database:

1. All four migrations apply cleanly to the hosted project in filename
   order, and re-applying each is a no-op.
2. `insert into public.pharmacist_accounts (pharmacy_id, email, full_name, phone) values ('00000000-0000-4000-8000-000000000008', 'Test@Example.TN', 'Test', '+21672437264');`
   is rejected by `pharmacist_accounts_email_normalised` (uppercase).
   With a lowercase e-mail it succeeds with `status = 'pending'` and
   `activated_at is null`.
3. `update public.pharmacist_accounts set status = 'active' where email = '…';`
   stamps `activated_at` **and** flips that pharmacy's
   `pharmacies.verified` to `true`. Setting the status back to
   `'suspended'` flips `verified` back to `false` and **keeps**
   `activated_at`. Deleting the row also flips `verified` back to
   `false`.
4. A second `insert` with the same e-mail fails on the unique
   constraint; a second insert with the same `pharmacy_id` and a
   different e-mail **succeeds** (several staff per pharmacy, 5.1).
5. `select medication_slug, medication_name, category from public.pharmacy_medication_status where pharmacy_id = '00000000-0000-4000-8000-000000000008';`
   returns 26 rows with the appended columns populated, and step 3's
   acceptance tests 3.16-5 and 3.16-6 still pass unchanged (the view's
   original columns are intact).
6. `explain analyze select … from public.pharmacy_medication_status where pharmacy_id = '…';`
   uses `stock_reports_medication_pharmacy_recent` — an index scan, not a
   sequential scan — **proving the mirror index in 5.5 is genuinely
   unnecessary.**
7. `select public.log_medication_view('levothyrox-50', repeat('a', 64));`
   inserts one `search_events` row;
   `select public.log_medication_view('does-not-exist');` inserts none
   and does not error.
   `select viewers_7d, views_7d from public.medication_search_stats_7d where medication_id = '10000000-0000-4000-8000-000000000001';`
   reflects it, and calling the RPC five more times with the *same*
   fingerprint leaves `viewers_7d` at 1 while `views_7d` rises.
8. As the anon role (`set local role anon;`):
   `select * from public.pharmacist_accounts`,
   `select * from public.search_events`,
   `select * from public.medication_search_stats_7d` and
   `select public.log_medication_view('levothyrox-50')` all fail with
   permission denied. **All four**, including the function.
9. **The invariant that matters most.** Sign in as a real pharmacist,
   copy the access token from `localStorage`, and
   `curl "$SUPABASE_URL/rest/v1/pharmacies?select=*" -H "apikey: $ANON" -H "Authorization: Bearer $USER_TOKEN"`.
   It must return **zero rows / permission denied**. A signed-in user has
   the `authenticated` role and still cannot read a single table. Repeat
   for `stock_reports` and `pharmacist_accounts`.

API:

10. Booting with `SUPABASE_ANON_KEY` unset **fails at startup** with a
    readable message.
11. `POST /api/pharmacist/registrations` with a valid body → **201**,
    `status == "pending"`, and the body contains **no** `phone`, no
    `registration_fingerprint`, no `status_note`.
12. The same call again → **409** `email already registered`. With an
    unknown `pharmacy_id` → **404**. With `"phone": "12345"` → **422**.
    With an extra `"status": "active"` field → **422** (proves
    `extra="forbid"` and that trust-deciding fields are server-set).
    With `"phone": "72 431 210"` → **201**, stored as `+21672431210`
    (proves `normalise_tn_phone`).
13. Four registrations in a row from one machine: the fourth → **429**
    `too many registration requests from this device`. The server log
    shows an 8-character fingerprint prefix and **no IP address**.
14. `GET /api/pharmacist/dashboard` with no `Authorization` → **401**;
    with a garbage token → **401**; with a valid token whose e-mail has
    no account row → **404** `pharmacist account not found`; with a valid
    token for a **pending** account → **200** with
    `account.status == "pending"` and a full 26-item `medications` array.
15. `POST /api/medications/levothyrox-50/views` → **204** with an empty
    body; `POST /api/medications/does-not-exist/views` → **204** as well
    (no information leak); both send `Cache-Control: no-store`.
16. `POST /api/pharmacist/medications/levothyrox-50/reports` with
    `{"status":"unsure"}` from a **pending** account → **403**
    `pharmacist account is not active`. After activation → **201** with
    `reported_by == "pharmacist"`, `reported_at` within a second of now,
    and `pharmacy_id` equal to the account's pharmacy.
17. The same call with `{"status":"in_stock","pharmacy_id":"<another pharmacy>"}`
    → **422** (extra field), and no row is written for the other
    pharmacy. **This is the authorisation proof: the pharmacy is derived,
    never accepted.**
18. In SQL:
    `select reported_by, reported_by_account_id is not null as has_account, reporter_fingerprint is null as no_fp from public.stock_reports order by created_at desc limit 1;`
    → `pharmacist`, `true`, `true`.
19. Suspend the account in the table editor, then tap again: the very
    next request → **403**, with no sign-out and no token change. (The
    free kill switch, 5.10.3.)
20. `/docs` shows the **Authorize** button, all four new endpoints with
    their models, and — with `SUPABASE_URL` pointed at an unreachable
    host — each returns 503 with a sanitised `detail` containing no key
    material and no token.

Frontend, local:

21. `npm run build` and `npm run lint` succeed. In particular the build
    does **not** fail with the `useSearchParams()` / missing-`Suspense`
    error on `/pharmacien/validation` (5.13.4), and there is no
    `window is not defined` from the Supabase client (5.11).
22. **The full happy path at 360 px.** `/pharmacien/inscription` → pick
    Pharmacie Ibn Khaldoun, fill the form → "Vérifiez votre boîte
    e-mail" → click the link in the e-mail **in the same browser** →
    `/pharmacien/validation` → redirected to `/pharmacien` → the
    "Compte en cours de vérification" banner, the pharmacy header, 26
    medications grouped under the four French headings, every toggle
    visibly disabled.
23. **The cross-device path.** Request a link on the desktop, open the
    e-mail on a phone, click the link: the French
    `validation.failedBody` appears — not a raw GoTrue error. Then, back
    on the desktop, type the 6-digit code from the same e-mail into the
    prompt: sign-in succeeds. (Without this, a real pharmacist is
    permanently stuck — 5.13.3.)
24. Activate the account in SQL, reload `/pharmacien`: the banner is
    gone and the toggles are live. Tapping **Incertain** on Levothyrox 50
    shows `Enregistrement…`, then the badge becomes **Incertain**, the
    line reads "Confirmé par la pharmacie à l'instant", and the button is
    `aria-pressed`.
25. **The badge payoff.** Open `/medicaments/levothyrox-50` and
    `/pharmacies` in another tab: Pharmacie Ibn Khaldoun now shows
    **Pharmacie inscrite**, in the list, in the map popup and in the
    directory — and no other pharmacy does. The stock legend's fifth line
    appears on the medication page and is absent on a medication page
    where no pharmacy is verified.
26. **The disclaimer audit.** `<Disclaimer />` is present and visible
    without scrolling at 360 px on `/`, `/medicaments/[slug]`,
    `/pharmacies` and `/statut`. `<PharmacistNotice />` — and not
    `<Disclaimer />` — is on all four `/pharmacien*` routes.
27. **Latest wins, end to end** (5.3). With the pharmacist's "Incertain"
    as the current status, tap **Disponible ici** as a patient on
    `/medicaments/levothyrox-50` from a different network: the badge
    becomes **Disponible** and reads "Signalé par un patient à
    l'instant". Reload the dashboard: it shows the patient's status plus
    `dashboard.lastByPatientHint`. Tap **En rupture** on the dashboard:
    the pharmacist wins again. No pinning, no grace period, no
    surprises.
28. **The pharmacist's toggle reaches patients immediately.** Toggle on
    the dashboard, then hard-reload `/medicaments/<slug>` in another
    browser profile: the new status is there, not up to 60 s later.
    (This proves `revalidateMedicationStock` is actually being called —
    5.14.)
29. `/pharmacien/connexion` with an address that has no account still
    shows "Vérifiez votre boîte e-mail", **never** "unknown account".
    (Anti-enumeration, 5.13.1.)
30. Sign out, then navigate directly to `/pharmacien`: redirected to
    `/pharmacien/connexion`. With the FastAPI server stopped, the
    dashboard shows `dashboard.errors.network` and a retry button — no
    stack trace, no blank page.
31. **The boundary invariant, in the shipped bundle.** With devtools
    open across `/`, `/medicaments/[slug]`, `/pharmacies` and the whole
    pharmacist flow, every request to `*.supabase.co` has a path starting
    `/auth/v1/`. There are **zero** requests to `/rest/v1/`,
    `/realtime/v1/` or `/storage/v1/`, and **zero** websockets
    (decisions 2.12.1 as amended, and 3.0.1).
32. `grep` the built output for the service-role key's first 12
    characters: absent (step 1 test 8, still required).
33. On `/medicaments/levothyrox-50`, exactly **one**
    `POST …/views` request fires per page load — not two (the StrictMode
    ref guard, 5.15.2) — and the page renders identically if that request
    fails.

Production:

34. The whole of 22–28 passes on the Vercel deployment against the Render
    API, from a real phone on mobile data, over HTTPS.
35. After a day of real traffic (or a scripted set of views from two
    different networks), the dashboard shows a non-zero
    `dashboard.searchCount` for at least one medication and the
    "Les plus recherchés cette semaine" block appears.

## 5.20 Explicit non-goals for step 5

- **No prescription upload, no hold requests, no Supabase Storage.** The
  dashboard has **no** hold-request section at all — the brief lists it
  under the pharmacist flow, but it is step 7 territory and adding a
  placeholder for it here would be dead UI.
- **No notify-me subscriptions, no `subscriptions` table, no Resend
  integration in the repo.** Step 6. (Configuring Resend as Supabase's
  SMTP provider in the dashboard is a hosting setting, not this feature —
  5.8.)
- **No admin UI.** No moderation screen, no account-approval page, no
  pharmacy editor, no stats console. Activation is a manual `update` in
  the Supabase table editor (5.2).
- **No password authentication, no OAuth, no phone/SMS OTP, no
  CAPTCHA.** The brief is explicit about magic link and about avoiding
  SMS cost. The 6-digit code fallback (5.13.3) is the *same e-mail*, not
  a second channel.
- **No pharmacy creation, editing or deletion from any endpoint.** A
  pharmacist claims one of the twelve seeded rows and can change nothing
  about it — not the name, address, phone or coordinates. Directory data
  stays curated in `seed.sql`.
- **No multi-pharmacy accounts, no account-to-account roles, no
  permissions model, no invite flow.** One account, one pharmacy, one
  capability: write stock reports for that pharmacy.
- **No self-service account management.** No change-e-mail, no
  change-pharmacy, no delete-my-account, no profile page. All of it is a
  SQL update by the operator for now.
- **No `verified` badge for unverified pharmacies**, no "non vérifiée"
  warning anywhere (step 2 §2.8's reasoning is unchanged).
- **No rate limiting on the authenticated pharmacist write path** and no
  per-account quotas (5.10.3 — the suspension kill switch replaces it).
- **No rate limiting on `POST /api/medications/{slug}/views`** (5.6 —
  distinct-counting makes single-source inflation pointless).
- **No pharmacy-scoped or geographic search statistics**, no "near you"
  proximity model, no geolocation, no PostGIS. Still deferred, since step
  2. The counter is city-wide and the copy says so.
- **No history or trend in the stats** — no sparkline, no
  week-over-week, no per-day breakdown, no export. One number, seven
  days.
- **No bulk actions on the dashboard** — no "tout marquer en rupture",
  no multi-select. One tap, one medication, one report.
- **No Realtime, no websocket, no polling loop.** Two pharmacists at one
  counter can overwrite each other; latest wins, as everywhere else.
  (3.0.1 reaffirmed.)
- **No `@supabase/ssr`, no auth cookies, no Next.js middleware, no
  server-side session, no server-side route protection** (5.12.2).
- **No direct Supabase data access from the browser.** No `.from()`, no
  `.rpc()`, no `.channel()`, no `.storage` anywhere in `frontend/` — and this
  is the invariant most at risk now that the SDK is installed. Acceptance
  test 5.19-31.
- **No RLS policies.** Not one, on any table, including the two new ones.
- **No JWT library, no local signature verification, no JWKS cache**
  (5.9.1).
- **No e-mail templates, sending code or SMTP configuration in the
  repo.** Auth e-mail is entirely Supabase's, configured in its
  dashboard.
- **No retention job** for `registration_fingerprint` or
  `viewer_fingerprint` (5.22, same posture as step 4).
- **No skeleton loaders, no `error.tsx` boundaries, no animation, no
  toasts.** Plain inline text states. (Step 8.)
- **No new npm dependencies beyond `@supabase/supabase-js`**, and one pip
  dependency (`email-validator`). No form library, no validation library,
  no state manager, no date library.
- **No Arabic dictionary**, no locale routing.
- **No tests.** Still manual acceptance only — though
  `normalise_tn_phone` joins `check_report_rate_limit` as an obvious
  first unit test when a harness arrives.

## 5.21 Decisions recorded in this step

Binding on later steps unless explicitly amended:

1. **The browser may call Supabase Auth (`/auth/v1/*`) and nothing
   else.** `@supabase/supabase-js` is installed for authentication only;
   `.from()`, `.rpc()`, `.channel()` and `.storage` are forbidden in
   `frontend/`. Decision 2.12.1 is narrowed from "no Supabase" to "no Supabase
   **data**"; decision 2.12.2 (zero RLS policies, revoked from
   `anon`/`authenticated`) is unchanged and now covers two more tables.
2. **All Supabase SDK usage is confined to
   `frontend/src/lib/supabase/auth.ts`**, so the boundary in (1) is auditable
   by reading one file. `frontend/src/lib/api.ts` remains the sole fetch
   chokepoint and never imports the SDK.
3. **Sessions live in `localStorage`, never in cookies.** No
   `@supabase/ssr`, no middleware, no server-side session, no
   server-rendered auth gate. `allow_credentials` stays `False`, which is
   what makes `allow_headers=["*"]` cover `Authorization`.
4. **PKCE flow, set explicitly**, with a 6-digit e-mail-OTP fallback in
   the same e-mail — because a PKCE sign-in only completes in the
   browser that started it, and pharmacists read e-mail on their phones.
5. **FastAPI verifies tokens remotely** via `GET /auth/v1/user`, using
   the anon key as the `apikey` header. No JWT library, no key material,
   no local signature validation. Amends step 1 §4.
6. **Identity is resolved on every request** to a `pharmacist_accounts`
   row, and `status` is read from the database every time — never from
   the token. Suspension therefore takes effect on the next request, at
   zero extra cost.
7. **The auth user is bound to the account on first authenticated call**,
   matching on the GoTrue-confirmed e-mail, by a guarded idempotent
   `update` inside the identity dependency.
8. **Registration claims an existing pharmacy; no endpoint can create
   one.** One account per pharmacy is not enforced; several staff per
   pharmacy is the expected case. One pharmacy per account is.
9. **Two independent gates: a Supabase session proves the mailbox; an
   `active` status proves the person.** Registration never auto-
   activates. Activation is a manual `update` after calling the
   *pharmacy's* number, not the registrant's. Pending accounts see the
   dashboard read-only.
10. **`pharmacies.verified` is derived by trigger** from "has at least
    one active pharmacist account", and is surfaced as the
    **Pharmacie inscrite** badge — never as a negative badge on
    unverified rows.
11. **"Latest wins" stays absolute.** A patient report overrides a
    pharmacist confirmation. Provenance is communicated by the
    `reported_by` label, never encoded in the ordering. Decision 3.18.5
    is untouched. (Answers step 4 §4.16.)
12. **`unsure` is writable only through the authenticated pharmacist
    toggle.** The public endpoint still 422s it. (Discharges 4.15.1.)
13. **`pharmacy_id` is derived from the authenticated identity, never
    accepted from the client** — the same structural rule as
    `reported_by` (4.15.7). `reported_by_account_id` attributes every
    pharmacist report.
14. **No rate limit on authenticated writes.** The named, phone-verified
    identity plus a free suspension kill switch replaces it. Anonymous
    write paths keep step 4's controls.
15. **A "search" is one patient opening one medication page**, recorded
    by a dedicated uncached `POST /api/medications/{slug}/views` from the
    browser — because ISR makes the cached read endpoints count cache
    misses rather than people.
16. **The displayed statistic is `count(distinct viewer_fingerprint)`
    over 7 days**, which matches the brief's wording, neutralises
    reload-heavy behaviour, and makes single-source inflation pointless.
    Per-medication distinct counts are never summed into a total.
17. **Statistics are city-wide, and the copy says "à Bizerte"** rather
    than "près de vous", because no proximity model exists.
18. **Unauthenticated writes fail closed when no client IP can be
    resolved; metric endpoints fail open.** Registration 503s; view
    logging records a null fingerprint.
19. **Pharmacist-facing routes show `<PharmacistNotice />` instead of
    `<Disclaimer />`.** Every patient-facing route keeps the disclaimer
    unchanged.
20. **The pharmacist toggle reuses step 4's write machinery unchanged**:
    optimistic patch from the 201 body, `Date.parse` merge with the
    server winning ties (4.15.10), and the existing
    `revalidateMedicationStock` server action to purge the patient
    page's caches (4.6).

## 5.22 Open questions for the user (non-blocking for step 5)

Step 5 can be implemented in full without answers to these — but two of
them block *launch*, not implementation, and are marked.

- **🚩 LAUNCH BLOCKER — real pharmacy phone numbers.** Step 2 §2.3's
  seeded numbers are fictional. Activation (5.2) *is* a call to
  `pharmacies.phone`; without real numbers, `verified` and the
  "Pharmacie inscrite" badge certify nothing. No account may be activated
  for a pharmacy whose phone number has not been sourced and confirmed.
  This escalates step 2's long-standing open question from "before public
  launch" to "before the first activation".
- **🚩 LAUNCH BLOCKER — e-mail deliverability and the domain.**
  Supabase's built-in mailer is capped at 2 messages/hour, and Resend's
  free tier cannot send to arbitrary addresses without a verified sending
  domain (5.8). Real pharmacists cannot be onboarded until a domain
  exists and is verified with Resend. The brief defers the `.tn` domain
  to "once validated"; this step and step 6 both need it earlier than
  that. Decide: buy the domain now, or use a cheap interim domain purely
  for e-mail sending.
- **`common.contactEmail` is a placeholder.** The registration page tells
  a pharmacist to write to it when their pharmacy is missing, and the
  rejected/suspended banners say "contactez-nous". Needs a real address —
  the same address the step-7 patient contact channel will probably use.
- **Anon-key e-mail abuse.** With project sign-ups enabled, anyone
  holding the anon key can make Supabase e-mail arbitrary addresses
  (5.0). Capped by the auth rate limit and useless (the resulting users
  map to no account). The named fix, if it ever matters: disable project
  sign-ups, create auth users from FastAPI via the Admin API during
  registration, and enable Turnstile on the auth endpoints. Roughly a
  half-day, and it needs verification of GoTrue's behaviour for
  admin-created unconfirmed users.
- **Fingerprint retention, now on two tables.** `search_events` will be
  the highest-volume table in the project and it keeps a keyed IP hash
  for exactly the 7 days the stats view reads. Nothing needs it after
  that. Step 4 already flagged this for `stock_reports`; a single
  scheduled job could null both (`update … set viewer_fingerprint = null
  where created_at < now() - interval '8 days'`). Not built. Decide
  before public launch — and note that using the *same* secret for both
  tables means the two fingerprint columns are linkable in principle, so
  nulling `search_events` is the higher-value half.
- **Token verification cost.** Every authenticated request costs one
  round trip to GoTrue (5.9.1). If the dashboard ever gets chattier, the
  cheap fix is a short in-process TTL cache keyed by a hash of the token
  — safe to lose on a Render restart (unlike rate-limit state, it fails
  *closed*: a cache miss just re-verifies).
- **Per-strength tracking, again.** Step 3 §3.19 asked whether
  pharmacists will tolerate toggling every strength separately. This step
  makes the question concrete and answerable: 26 rows is already a long
  screen on a phone. Ask a real pharmacist before adding a single
  medication.
- **Do pharmacists want a "rien n'a changé aujourd'hui" bulk
  confirmation?** Explicitly a non-goal here, but it is the most likely
  first request once someone uses this daily, and it interacts with
  freshness/staleness display (§3.12). Note it, do not build it.
- **Should the pharmacist's own page views be excluded from their search
  counter?** They are not today (there is no way to identify them at the
  view endpoint without sending the token, which would defeat the data
  minimisation in 5.6). Probably immaterial; revisit if a pharmacist
  reports odd numbers.
- **Still open from earlier steps:** real pharmacy data provenance
  (escalated above), who validates the medication list,
  city-vs-governorate coverage boundary, opening hours / pharmacie de
  garde, the patient contact channel for step 7, step 4's rate-limit
  numbers under Tunisian mobile NAT, and the public Server Action
  exposure.

## 5.23 If this step must be split

It is specced as one coherent unit, and it should be attempted as one:
the dashboard is meaningless without auth, and auth is pointless without
the dashboard. But it is the largest step in the project, so the seam is
recorded in advance rather than improvised under pressure.

**The only clean seam is the search-visibility counter.** It touches no
auth code, no write path and no shared component.

| | Contents | Notes |
| --- | --- | --- |
| **5a — auth, registration, dashboard, toggle** | 5.0–5.5, 5.7, 5.8, 5.9, 5.10.1–5.10.3, 5.11–5.14 (minus the stats block), 5.15.1, 5.16 (minus `searchCount*` / `topSearched*`), 5.17 | Fully shippable and independently valuable. The dashboard simply has no counters. |
| **5b — search-visibility counter** | 5.6, 5.10.4, 5.15.2, the stats block in 5.14, the stats copy in 5.16 | Migration `20260815090200_…` and its endpoint move here. Nothing in 5a depends on it. |

If split, `GET /api/pharmacist/dashboard` ships in 5a **already
returning `searches_last_7_days: 0` and `stats_window_days: 7`**, so 5b
is purely additive on the API contract and the frontend types never
change. Do not ship 5a with a different response shape and widen it
later.

Do **not** split along any other line. In particular, shipping auth
without the activation gate (5.2), or the toggle without
`revalidateMedicationStock` (5.14), produces something that looks
finished and is quietly wrong.
