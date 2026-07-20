# SafeSign

Digital liability waivers for activity businesses (escape rooms, climbing gyms, trampoline parks, karting, watersports, wellness…). FR/EU-native, RGPD-friendly, hosted in the EU.

> This repository is a **clean scaffold**: infrastructure, config and client wiring are in place. Business features (waiver editor, public signing page, PDF generation, dashboard, billing gating) are **not implemented yet**.

## Stack

- **Next.js 15** (App Router) + **TypeScript**
- **Tailwind CSS v4**
- **Supabase** (Postgres + Auth + Storage) — EU region
- **Stripe** (subscription billing)

## Getting started

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env.local   # then fill in the values

# 3. Run the dev server
npm run dev
```

Open http://localhost:3000.

## Project structure

```
src/
  app/
    layout.tsx            # root layout
    page.tsx              # landing page
    globals.css           # Tailwind v4 + design tokens
    dashboard/            # (placeholder) authenticated area
    api/
      health/route.ts     # health check
      stripe/webhook/     # Stripe webhook (stub)
  lib/
    supabase/             # browser + server clients, session middleware
    stripe/               # server-side Stripe client
    env.ts                # typed access to environment variables
    utils.ts              # cn() helper
  types/
    database.types.ts     # generated Supabase types (placeholder)
  middleware.ts           # refreshes the Supabase auth session
supabase/
  migrations/
    0001_init.sql         # database schema + RLS policies
```

## Database

Apply the initial migration to your Supabase project (SQL editor or CLI):

```bash
# Using the Supabase CLI (recommended)
supabase db push
# or paste supabase/migrations/0001_init.sql into the Supabase SQL editor
```

## Roadmap (V1, 7 days)

1. Auth + business onboarding
2. Waiver template editor
3. Public signing page (touch signature)
4. Timestamped PDF generation + email
5. Submissions dashboard (search, export, QR)
6. Stripe subscription + free-trial gating
7. Polish, legal pages, SEO, ship

## Deployment

Deploy on Vercel with the region set to `fra1` (Paris) to keep data in the EU.
