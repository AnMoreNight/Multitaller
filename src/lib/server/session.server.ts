import { deleteCookie, getCookie, setCookie } from "@tanstack/react-start/server";
import { eq } from "drizzle-orm";

import { getDb } from "@/lib/db/client";
import { sessions } from "@/lib/db/schema";

// __Host- prefix binds the cookie to this exact origin (no Domain, Path must
// be "/", Secure must be set) — a subdomain can't forge or read it.
const SESSION_COOKIE = "__Host-session";
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30; // 30 days

export function readSessionToken(): string | undefined {
  return getCookie(SESSION_COOKIE);
}

export function setSessionCookie(token: string) {
  setCookie(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_MS / 1000,
  });
}

export function clearSessionCookie() {
  // __Host- requires Secure on every Set-Cookie for this name, including the
  // clearing one, or the browser rejects it and the stale cookie lingers.
  deleteCookie(SESSION_COOKIE, { path: "/", secure: true });
}

export async function createSession(userId: string): Promise<string> {
  const db = getDb();
  const token = crypto.randomUUID();
  await db.insert(sessions).values({
    id: token,
    userId,
    expiresAt: new Date(Date.now() + SESSION_TTL_MS),
  });
  return token;
}

/** Called on login (session rotation) and whenever a user's role/permissions/removal changes. */
export async function revokeAllSessionsForUser(userId: string) {
  const db = getDb();
  await db.delete(sessions).where(eq(sessions.userId, userId));
}

export async function revokeSession(token: string) {
  const db = getDb();
  await db.delete(sessions).where(eq(sessions.id, token));
}

/**
 * Resolves a session token to its user (with workshop, for the is_active
 * check). Returns null for a missing/expired/unknown token, or when the
 * user's workshop has been deactivated — treated the same as "no session" so
 * a deactivated workshop's staff are silently signed out rather than erroring.
 */
export async function findSessionUserWithWorkshop(token: string) {
  const db = getDb();
  const row = await db.query.sessions.findFirst({
    where: eq(sessions.id, token),
    with: { user: { with: { workshop: true } } },
  });
  if (!row) return null;
  if (row.expiresAt.getTime() < Date.now()) {
    await revokeSession(token);
    return null;
  }
  const { user } = row;
  const workshopInactive = user.role !== "system_admin" && user.workshop?.isActive === false;
  if (workshopInactive) {
    await revokeSession(token);
    return null;
  }
  return user;
}

export type SessionUser = NonNullable<Awaited<ReturnType<typeof findSessionUserWithWorkshop>>>;
