# Deploy guide

How to stand up the Postgres database this app uses, both for local development
and for the production deployment (via Lovable → Cloudflare Workers).

## Current status

- ✅ Done: database schema (`src/lib/db/schema.ts`) and migration tooling. The
  schema exists and can be applied to a real database today.
- ⏳ Pending: the app itself doesn't talk to the database yet — login, customers,
  orders, etc. are all still in-memory demo data. That work is tracked in the
  approved plan; nothing below makes the running app "real" by itself. This guide
  only covers getting the *database* stood up, which is the prerequisite for that
  work to continue.

## 1. Create a Neon Postgres database

This project uses [Neon](https://neon.tech) specifically — not just any Postgres
host — because the app deploys to Cloudflare Workers, which can't hold a normal
database connection open. Neon's driver talks to the database over HTTP instead,
which works on Workers; a plain Postgres connection string from most other hosts
would not.

1. Go to [neon.tech](https://neon.tech) and sign up (free tier, no credit card
   needed).
2. Create a new project. Pick any region — closer to where the app is deployed
   is marginally faster, but it won't matter at this scale.
3. Neon creates a default database (usually named `neondb`) and branch (`main`)
   automatically. You don't need to create anything else.
4. On the project dashboard, find the **connection string** (usually on the
   "Connect" or overview screen). It looks like:
   ```
   postgresql://<user>:<password>@<endpoint>.neon.tech/neondb?sslmode=require
   ```
   Copy it — you'll need it in the next step. Keep it secret; it's effectively
   a password.

## 2. Local environment setup

1. Copy the env template and fill in the connection string:
   ```
   cp .env.example .env
   ```
   Then edit `.env` and replace the placeholder `DATABASE_URL` with the real
   connection string from step 1. `.env` is gitignored — it will never be
   committed.
2. Install dependencies, if you haven't already:
   ```
   npm install
   ```
3. Apply the schema to your new database:
   ```
   npm run db:migrate
   ```
   This runs the SQL in `drizzle/0000_nostalgic_storm.sql` against your Neon
   database, creating all the tables (workshops, users, customers, vehicles,
   work orders, etc.).
4. (Optional) Browse the database with Drizzle's own GUI:
   ```
   npm run db:studio
   ```
   This opens a local web UI showing your tables — a quick way to confirm the
   migration worked, or to poke at data by hand later.

If `db:migrate` fails with a connection error, double-check the connection
string has `?sslmode=require` at the end and that you copied it in full
(no line breaks).

## 3. Running the app locally

```
npm run dev
```

The app runs exactly as before (demo data, click-a-name login) — nothing is
wired to the database yet. Once auth and the data layer are rebuilt against
Postgres (see the pending work above), this section will get an update with
real login credentials and a `npm run db:seed` step.

## 4. Production deployment

⚠️ **This section is out of date and being rewritten.** The app no longer goes
through Lovable, which is what previously fixed the build/deploy target to
Cloudflare Workers (and is why Neon's HTTP driver was chosen in the first
place — Workers can't hold a normal database connection open). Now that
that's gone, the actual hosting target needs deciding before this section
means anything again. Whatever we land on, one thing stays true regardless:
**migrations don't run themselves** — `npm run db:migrate` has to be run
against the production `DATABASE_URL` (from a local machine or CI) whenever
the schema changes.

Neon supports branching a database (like a git branch) if you want separate
dev/staging/production databases without paying for multiple projects — worth
using once this moves past local development.

## What's next

The database existing doesn't yet mean the app uses it. The remaining work
(real auth, server functions, rewriting the data layer, a minimal
`/system/workshops` page for onboarding new workshops) is broken into phases —
ask to see the current plan for where things stand.
