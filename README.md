# Ferro Taller

Operations panel for mechanical workshops — customers, vehicles, work orders,
parts pricing, and basic financial reports. Spanish-first, dark industrial
interface built for fast, high-contrast scanning on a shop floor.

## Stack

- [TanStack Start](https://tanstack.com/start) (React 19, SSR, file-based routing)
- TypeScript
- Tailwind CSS v4 + shadcn/Radix UI
- PostgreSQL ([Neon](https://neon.tech)) + [Drizzle ORM](https://orm.drizzle.team) — schema and migrations exist; the app itself is still being wired up to them, see [DEPLOY.md](DEPLOY.md)

## Local development

Requires Node.js and npm.

```sh
npm install
npm run dev
```

The app opens at `http://localhost:8080` (or the next free port). It currently
runs on in-memory demo data — no database is required to run or click through it.

## Scripts

- `npm run dev` — dev server
- `npm run build` / `npm run preview` — production build / preview it locally
- `npm run lint` / `npm run format` — ESLint / Prettier
- `npm run db:generate` / `db:migrate` / `db:studio` — Drizzle schema & migrations (see [DEPLOY.md](DEPLOY.md))

## More context

- [AGENTS.md](AGENTS.md) — project conventions
- [roadmap.md](roadmap.md) — phase scope
- [DEPLOY.md](DEPLOY.md) — setting up the Postgres database (Neon) and deploying
