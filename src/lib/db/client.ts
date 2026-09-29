import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";

import * as schema from "./schema";

/**
 * Cloudflare Workers injects env vars per-request, not at module load — reading
 * process.env.DATABASE_URL at module scope resolves to undefined in the deployed
 * Worker even though it works fine in local `vite dev` (Node). Always call this
 * from inside a server function handler, never at import time.
 */
export function getDb() {
  const url = process.env["DATABASE_URL"];
  if (!url) throw new Error("DATABASE_URL is not set");
  return drizzle(neon(url), { schema });
}

export type Db = ReturnType<typeof getDb>;
