# Mawjoud

Mawjoud is a web app that lets people in Tunisia check whether a specific
medication is currently available at nearby pharmacies, and lets
pharmacists (and other patients) report stock status in real time. It is
French-facing; this documentation is in English.

## Stack

- Frontend: Next.js (App Router) + TypeScript + Tailwind CSS, deployed to
  Vercel.
- Backend: FastAPI (Python), deployed to Render.
- Database / Auth / Storage / Realtime: Supabase (Postgres, email
  magic-link auth, Storage, Realtime).
- Maps: Leaflet.js + OpenStreetMap tiles.
- Fuzzy search: Postgres `pg_trgm`.
- Email: Resend.

## Repo layout

```
Mawjoud/
├── render.yaml          # Render Blueprint for the API
├── docs/
│   ├── BRIEF.md          # product scope, source of truth
│   └── ARCHITECTURE.md   # per-step implementation spec
├── backend/              # FastAPI service (Render root dir)
│   └── app/
│       ├── main.py
│       ├── config.py
│       ├── supabase_client.py
│       └── routers/
└── frontend/               # Next.js app (Vercel root dir)
    └── src/
        ├── app/
        ├── components/
        └── lib/
```

## Local development

### API (`backend/`)

```
cd backend
python -m venv .venv
.venv\Scripts\activate        # Windows; use `source .venv/bin/activate` on macOS/Linux
pip install -r requirements.txt
copy .env.example .env        # then fill in real values
uvicorn app.main:app --reload --port 8000
```

### Web (`frontend/`)

```
cd frontend
npm install
copy .env.example .env        # then fill in real values
npm run dev
```

## Environment variables

See section 5 of `docs/ARCHITECTURE.md` for the full list of variables for
both apps, what they're for, and which are required.

## Deployment

- **Render (API):** deploy via the `render.yaml` Blueprint at the repo
  root. See section 6a of `docs/ARCHITECTURE.md`.
- **Vercel (Web):** import the repo in the Vercel dashboard with root
  directory set to `frontend`. See section 6b of `docs/ARCHITECTURE.md`.

## Docs

`docs/BRIEF.md` is the scope source of truth. `docs/ARCHITECTURE.md` is
the concrete, per-build-order-step implementation spec — read the section
for the step you're working on before writing code.
