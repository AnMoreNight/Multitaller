# Deploy guide

How to stand up the Postgres database this app uses, and how to deploy the app
itself — Vercel for staging, a VPS for production.

## Current status

- ✅ Done: database schema (`src/lib/db/schema.ts`), migrations, and real
  auth — login/logout, sessions, workshops, and team management (`/equipo`,
  `/system/workshops`) all talk to Postgres. There is no demo login anymore.
- ⏳ Pending: customers, vehicles, work orders, and the parts catalog still
  live in `src/lib/taller-data.ts` as static demo data, not the database.
  Everything below stands up real infrastructure; it doesn't by itself move
  that remaining data over.

## 1. Create a Neon Postgres database

This project uses [Neon](https://neon.tech) — a serverless Postgres host with
an HTTP-based driver (`@neondatabase/serverless`) instead of a normal TCP
connection. That makes it work identically in every deploy target this app
uses (Vercel functions, a plain VPS, or anything else) and in local dev,
without connection-pooling concerns from many short-lived serverless
invocations. A plain Postgres host works too if you'd rather self-host the
database, but you'd swap the driver in `src/lib/db/client.ts` accordingly —
not covered here.

1. Go to [neon.tech](https://neon.tech) and sign up (free tier, no credit card
   needed).
2. Create a new project. Pick any region — closer to where the app is deployed
   is marginally faster, but it won't matter at this scale.
3. Neon creates a default database (usually named `neondb`) and branch (`main`)
   automatically. You don't need to create anything else yet — see the
   two-branch setup in the deployment section below once you're ready for
   staging + production.
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
   This runs the SQL in `drizzle/` against your Neon database, creating all
   the tables (workshops, users, sessions, customers, vehicles, work orders,
   etc.).
4. Seed a first login:
   ```
   npm run db:seed
   ```
   This is safe to re-run — it skips anything that already exists. It creates:
   - a platform `system_admin`: `admin@ferrotaller.dev` / `changeme123`
   - a first workshop ("Ferro Taller") with an admin (`andrea@ferrotaller.dev`)
     and a worker (`jorge@ferrotaller.dev`), both `changeme123`

   **Change these passwords (or delete and recreate these accounts) before
   using a database for anything real** — they're seeded in plain sight in
   `src/lib/db/seed.ts` for local dev convenience.
5. (Optional) Browse the database with Drizzle's own GUI:
   ```
   npm run db:studio
   ```
   This opens a local web UI showing your tables.

If `db:migrate` fails with a connection error, double-check the connection
string has `?sslmode=require` at the end and that you copied it in full
(no line breaks).

## 3. Running the app locally

```
npm run dev
```

Log in with one of the seeded accounts above. A `system_admin` lands on
`/system/workshops` (create/deactivate workshops); a workshop `admin`/`worker`
lands on the normal dashboard.

## 4. Deployment targets: Vercel (staging) + a VPS (production)

Two different targets share the exact same codebase and build command — Nitro
(the build tool under TanStack Start) picks the right output format
automatically, via `vite.config.ts`:

```ts
preset: process.env["VERCEL"] ? "vercel" : "node-server"
```

`VERCEL=1` is a variable Vercel's own platform sets on every build it runs —
never set locally or on a VPS — so nothing needs configuring per environment;
the same `npm run build` just does the right thing in each place. A plain
build produces `.output/server/index.mjs` (runnable with `node`);
`VERCEL=1 npm run build` produces `.vercel/output/` in Vercel's Build Output
API v3 format instead.

### Staging on Vercel

1. Import the GitHub repo in Vercel's dashboard. It doesn't need to recognize
   "TanStack Start" as a framework — the Build Output API structure Nitro
   produces is enough for Vercel to serve it correctly regardless.
2. Add `DATABASE_URL` under the project's Environment Variables. Point it at a
   separate Neon **branch** (see below) rather than the same database as
   production.
3. Deploy. Every push (or PR, depending on your Vercel settings) rebuilds and
   redeploys automatically.

### Production on your VPS

This assumes a fresh Ubuntu/Debian VPS with a domain already pointed at its
IP address (an `A` record). Adjust package-manager commands if you're on a
different distro — everything else (Node, systemd, nginx, certbot) is the
same regardless.

#### One-time server setup

1. **Node.js.** Install a current LTS (Node 20+) via
   [NodeSource](https://github.com/nodesource/distributions), not the distro's
   default repo (which is usually too old):
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
   sudo apt-get install -y nodejs
   node --version   # confirm v20.x or newer
   ```
2. **A deploy user.** Don't run the app as root. If you don't already have a
   non-root user with sudo access, create one:
   ```bash
   sudo adduser deploy
   sudo usermod -aG sudo deploy
   su - deploy
   ```
3. **nginx + certbot** (reverse proxy + free TLS certificate):
   ```bash
   sudo apt-get install -y nginx certbot python3-certbot-nginx
   ```
4. **Firewall** — allow SSH and web traffic, nothing else needs to be public
   (the app itself listens on `localhost` only, behind nginx):
   ```bash
   sudo ufw allow OpenSSH
   sudo ufw allow "Nginx Full"
   sudo ufw enable
   ```

#### First deploy

1. Clone the repo:
   ```bash
   cd ~
   git clone https://github.com/AnMoreNight/Multitaller.git ferro-taller
   cd ferro-taller
   ```
2. Install dependencies and build:
   ```bash
   npm ci
   npm run build
   ```
   With no `VERCEL` env var set, this produces the plain Node build at
   `.output/server/index.mjs`.
3. Create the production env file (not committed — lives only on the server):
   ```bash
   cat > .env << 'EOF'
   DATABASE_URL=postgresql://<user>:<password>@<endpoint>.neon.tech/neondb?sslmode=require
   EOF
   ```
   Use the **production** Neon branch's connection string here (see the
   branching section below) — not the same one staging uses.
4. Apply migrations, then seed a first login:
   ```bash
   npm run db:migrate
   npm run db:seed
   ```
   `db:seed` creates **both** the platform `system_admin` account **and** a
   demo workshop ("Ferro Taller") with fake staff — it's written as a local-dev
   convenience, not a production bootstrap step (see the comment at the top of
   `src/lib/db/seed.ts`). On a real production database:
   - Log in as `admin@ferrotaller.dev` / `changeme123` and **change that
     password immediately** (there's no "change password" UI yet — update
     `password_hash` directly via `npm run db:studio`, or re-run the app's
     `login` flow once that exists).
   - Create your real workshop(s) and their admin(s) through
     `/system/workshops`.
   - Deactivate (or delete, via `db:studio`) the seeded demo workshop and its
     `andrea@ferrotaller.dev` / `jorge@ferrotaller.dev` accounts once your
     real ones exist.
5. Create the systemd service so the app survives reboots and restarts itself
   if it crashes. Create `/etc/systemd/system/ferro-taller.service`:
   ```ini
   [Unit]
   Description=Ferro Taller
   After=network.target

   [Service]
   Type=simple
   User=deploy
   WorkingDirectory=/home/deploy/ferro-taller
   EnvironmentFile=/home/deploy/ferro-taller/.env
   Environment=NODE_ENV=production
   Environment=PORT=3000
   Environment=HOST=127.0.0.1
   ExecStart=/usr/bin/node .output/server/index.mjs
   Restart=on-failure
   RestartSec=5

   [Install]
   WantedBy=multi-user.target
   ```
   `HOST=127.0.0.1` is deliberate — the app only listens on localhost; nginx
   is the only thing exposed to the internet, on 80/443.

   Enable and start it:
   ```bash
   sudo systemctl daemon-reload
   sudo systemctl enable --now ferro-taller
   sudo systemctl status ferro-taller   # confirm it's running
   journalctl -u ferro-taller -f        # tail logs
   ```
6. Configure nginx as a reverse proxy. Create
   `/etc/nginx/sites-available/ferro-taller` (replace `yourdomain.com`):
   ```nginx
   server {
       listen 80;
       server_name yourdomain.com;

       location / {
           proxy_pass http://127.0.0.1:3000;
           proxy_http_version 1.1;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection "upgrade";
       }
   }
   ```
   Enable it and reload:
   ```bash
   sudo ln -s /etc/nginx/sites-available/ferro-taller /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl reload nginx
   ```
7. Get a TLS certificate — certbot edits the nginx config above to add the
   `listen 443 ssl` block and redirect HTTP to HTTPS automatically:
   ```bash
   sudo certbot --nginx -d yourdomain.com
   ```
   The login cookie (`__Host-session`) requires HTTPS (`Secure` attribute) —
   without this step, login will silently fail to persist a session.
8. Visit `https://yourdomain.com` and confirm login works with a seeded
   account.

#### Redeploying after a change

```bash
cd ~/ferro-taller
git pull
npm ci
npm run build
npm run db:migrate   # only does anything if the schema changed; safe to always run
sudo systemctl restart ferro-taller
```

There's a brief gap (a few seconds) between the restart and the new process
being ready, during which nginx will show a connection error. That's fine for
a small internal tool; if it ever matters, look into pm2's cluster mode or a
second systemd instance behind nginx for zero-downtime restarts — not set up
here.

### Database: one Neon project, two branches

Neon supports branching a database like a git branch, so staging and
production can be isolated without paying for two separate projects:
one branch (e.g. `main`) for production, another (e.g. `staging`) for Vercel —
each gets its own `DATABASE_URL`. Whichever branch changes, remember:
**migrations don't run themselves** — `npm run db:migrate` has to be run by
hand (or in CI) against that branch's `DATABASE_URL` whenever the schema
changes; Vercel and the VPS both just run the already-built app.

### Resetting a database (staging or local)

Useful when staging's data has drifted too far from something testable, or
you just want a clean slate. **Never run this against the production
`DATABASE_URL`** — it deletes everything, no undo.

Point a one-off command at a specific database without touching your `.env`
or the current shell's environment:

```powershell
# PowerShell
$env:DATABASE_URL = "postgresql://...the target database..."
npm run db:migrate
```

```bash
# bash
DATABASE_URL='postgresql://...the target database...' npm run db:migrate
```

To actually wipe a database before re-migrating, drop **both** schemas —
`public` (the app's tables) and `drizzle` (drizzle-kit's own migration
tracking table). Dropping only `public` leaves the tracking table believing
every migration is already applied, so `db:migrate` reports success without
recreating anything, and every query then fails with
`relation "users" does not exist`. This is exactly what happened the first
time a staging reset was attempted — the fix was to drop `drizzle` too, then
`db:migrate` actually recreated the tables.

```powershell
# PowerShell — paste as one block
@'
import { neon } from "@neondatabase/serverless";
const sql = neon(process.env.DATABASE_URL);
await sql`DROP SCHEMA public CASCADE`;
await sql`CREATE SCHEMA public`;
await sql`DROP SCHEMA IF EXISTS drizzle CASCADE`;
console.log("Schemas reset.");
'@ | Set-Content -Encoding utf8 reset-db.tmp.mjs
node reset-db.tmp.mjs
Remove-Item reset-db.tmp.mjs
npm run db:migrate
npm run db:seed
```

After `db:seed` finishes you'll have the same three accounts as a fresh
local setup: `admin@ferrotaller.dev` (system_admin), `andrea@ferrotaller.dev`
(admin), `jorge@ferrotaller.dev` (worker) — all `changeme123`.

To check what's actually in a database without going through the app (e.g.
to confirm a reset worked, or that migrate actually created tables):

```powershell
@'
import { neon } from "@neondatabase/serverless";
const sql = neon(process.env.DATABASE_URL);
const tables = await sql`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name`;
console.log("Tables:", tables.map(t => t.table_name));
'@ | Set-Content -Encoding utf8 check-db.tmp.mjs
node check-db.tmp.mjs
Remove-Item check-db.tmp.mjs
```

## What's next

Customers, vehicles, work orders, and the parts catalog are still static
demo data in `src/lib/taller-data.ts`, not the database — moving those over
is the remaining work. Ask to see the current plan for where things stand.
