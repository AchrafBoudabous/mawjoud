# Mawjoud — Real-Time Medication Availability for Tunisia

You are helping me build Mawjoud, a web app that lets people in Tunisia
check whether a specific medication is currently available at nearby
pharmacies, and lets pharmacists (and other patients) report stock status
in real time. This document is the full project brief — follow it as the
source of truth for scope, stack, and priorities. Ask before making major
architectural changes not covered here.

## Problem

Tunisia is in an ongoing medication shortage crisis (thyroid, insulin,
psychiatric, and cancer-pain medications are worst affected), driven by
the Pharmacie Centrale's financial/supply issues. Patients currently find
out a pharmacy doesn't have their medication only by physically showing
up, then repeat this at pharmacy after pharmacy. Existing apps (TunPharma,
Apothicare) only show pharmacy hours/location, not stock. An older app
(DAWI.tn) attempted stock-checking but appears abandoned since ~2019.

## MVP Scope — keep this narrow

- One city to start: Bizerte.
- ~20–30 tracked medications: chronic/high-shortage drugs only (thyroid,
  insulin, key psychiatric meds, cancer-pain medications). Don't try to
  cover all medications everywhere yet.
- Web only — no native app, no Telegram/WhatsApp bot. Everything happens
  on the website, for both patients and pharmacists.

## Users & Core Flows

### Patient (no login required for core use)
- Search a medication by name (brand or generic) — fuzzy matching handles
  typos/partial names.
- See results as a list + map: nearby pharmacies tagged in stock / out of
  stock / no reports yet, each with a timestamp ("confirmed 2 hours ago").
- Report what they found after visiting a pharmacy ("found it here" /
  "not available here") — two taps, no login needed.
- Subscribe to be notified (email) when a specific drug is reported back
  in stock near them.
- Once they find a pharmacy that has it, upload a photo of their
  prescription and request that pharmacy hold/prepare it.
- Every page shows a persistent, clear disclaimer: this is
  community-reported data, not an official or guaranteed stock feed —
  call ahead before traveling.

### Pharmacist (requires login)
- One-time registration: pharmacy name, address, phone (for
  verification), email.
- Log in via Supabase email magic link (no password, no SMS/OTP cost).
- Dashboard listing tracked medications with a one-tap toggle: In stock /
  Out / Unsure.
- See incoming prescription hold requests from patients; accept or
  decline each.
- See simple visibility stats: "X people searched for [drug] near you
  this week" — this is the incentive to keep data updated.

## Explicitly Out of Scope for MVP

- No online ordering, payment, or delivery of medication.
- No doctor appointment booking (a few competitor sites do this — don't
  fold it in, it dilutes the core value prop).
- No Telegram/WhatsApp bot.
- No prescription fulfillment or dispensing logic — the "hold request" is
  just a message to the pharmacist, not a legal transaction.
- No medical advice anywhere in the copy.

## Tech Stack — free tier only for now

- Frontend: Next.js (App Router) + TypeScript + Tailwind CSS. Deploy to
  Vercel free tier.
- Backend: FastAPI (Python). Deploy to Render.com free tier.
- Database/Auth/Storage: Supabase free tier — Postgres for data,
  built-in email magic-link auth for pharmacists, Storage for
  prescription photo uploads, Realtime for live stock status updates on
  the frontend.
- Maps: Leaflet.js + OpenStreetMap tiles — no API key or billing account
  needed.
- Fuzzy search: Postgres pg_trgm extension for medication name matching
  (misspellings, partial names). No LLM needed at MVP stage.
- Email: Resend free tier for "notify me" alerts and prescription-request
  notifications.
- Domain: Start on the free Vercel subdomain; buy a .tn domain later once
  validated.

## Rough Data Model

```
pharmacies
  id, name, address, lat, lng, phone, governorate, verified (bool)

medications
  id, name, generic_name, aliases (text[] for fuzzy matching)

stock_reports
  id, pharmacy_id, medication_id, status (enum: in_stock/out_of_stock/unsure),
  reported_by (enum: pharmacist/patient), reported_at (timestamp)

pharmacist_accounts
  id, pharmacy_id, email (linked to Supabase auth user)

subscriptions
  id, email, medication_id, area/city, created_at

prescription_requests
  id, patient_contact, pharmacy_id, medication_id, image_url,
  status (enum: pending/accepted/declined), created_at
```

Adjust freely as you build — this is a starting point, not a locked
schema.

## Non-Functional Requirements

- Mobile-first responsive design — most users will be on phones.
- Fast load times — people searching are often anxious/rushed.
- Primary language: French (matches TunPharma/DAWI/med.tn convention and
  the target audience). Structure text/copy so Arabic (Tunisian dialect)
  can be added as a second language in phase 2 without a rewrite.
- Clean, calm, trustworthy visual design — avoid anything that looks
  flashy or ad-like given the health context.

## Suggested Build Order

1. Scaffold Next.js + FastAPI + Supabase connection; deploy empty
   skeleton to Vercel/Render to confirm the pipeline works end to end.
2. Pharmacy directory + map view, using manually seeded data for
   Bizerte.
3. Medication search + stock display (read-only against seeded data).
4. Public community stock reporting (no auth required).
5. Pharmacist auth (Supabase magic link) + dashboard + stock toggle.
6. Notify-me subscriptions + Resend email alerts.
7. Prescription upload + hold request flow (Supabase Storage).
8. Polish: disclaimers everywhere, mobile QA, loading/empty states.

Work through these in order — get each one fully working before moving to
the next, rather than building all features halfway in parallel.