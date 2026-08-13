Mawjoud — Project Memory

Full project brief: @docs/BRIEF.md

Build discipline

Work through the build order in docs/BRIEF.md in strict sequence. Each step must be fully working (and reviewed by you) before starting the next one. Do not implement steps out of order or in parallel.

Tech stack (do not substitute)
Frontend: Next.js (App Router) + TypeScript + Tailwind CSS → deployed to Vercel
Backend: FastAPI (Python) → deployed to Render.com
Data / Auth / Storage / Realtime: Supabase (Postgres, email magic-link auth, Storage, Realtime)
Maps: Leaflet.js + OpenStreetMap tiles (no API key, no billing account)
Fuzzy search: Postgres pg_trgm extension
Email: Resend (free tier)
Everything on free tiers for now
Agent workflow
architect subagent: produces or updates the concrete spec for the current build-order step (API contract, DB schema, component breakdown) in docs/ARCHITECTURE.md. Read-only on source code — writes only to docs/.
developer subagent: implements the current step strictly against docs/ARCHITECTURE.md. Full-stack (Next.js + FastAPI + Supabase).

Typical loop per build-order step:

Ask the architect subagent to spec the step in docs/ARCHITECTURE.md
Review the spec, correct anything off
Ask the developer subagent to implement it
Test / review the diff, commit
Move to the next step
Non-negotiables
Every patient-facing page shows the "community-reported data, not an official or guaranteed stock feed — call ahead" disclaimer.
Primary language is French; structure copy so Tunisian Arabic can be added later without a rewrite.
Mobile-first responsive design.
Nothing from the "Explicitly Out of Scope for MVP" list in docs/BRIEF.md (no ordering/payment/delivery, no appointment booking, no bot, no dispensing logic, no medical advice).