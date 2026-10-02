import { createServerFn } from "@tanstack/react-start";
import { compare, hash } from "bcryptjs";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { getDb } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { toAppUser } from "@/lib/db/mappers";
import { signedInMiddleware } from "@/lib/server/auth-middleware";
import {
  clearSessionCookie,
  createSession,
  findSessionUserWithWorkshop,
  readSessionToken,
  revokeAllSessionsForUser,
  revokeSession,
  setSessionCookie,
} from "@/lib/server/session.server";

// bcrypt hash of an unrelated, never-used password, generated once ahead of
// time. Comparing against this for an unknown email keeps the response time
// the same as a wrong-password attempt on a real account — otherwise an
// attacker can enumerate registered emails by timing alone.
const DUMMY_PASSWORD_HASH = "$2b$12$gVAiw31iQFPFeF45gbA4J.CE8H2Mqqn/ZvSfclKWw.W/9QzRsdjTm";

export const getSession = createServerFn({ method: "GET" }).handler(async () => {
  const token = readSessionToken();
  if (!token) return { user: null };
  const userRow = await findSessionUserWithWorkshop(token);
  return { user: userRow ? toAppUser(userRow) : null };
});

export const login = createServerFn({ method: "POST" })
  .validator(z.object({ email: z.string().email(), password: z.string().min(1) }))
  .handler(async ({ data }) => {
    const db = getDb();
    const userRow = await db.query.users.findFirst({
      where: eq(users.email, data.email.trim().toLowerCase()),
      with: { workshop: true },
    });

    const hashToCheck = userRow?.passwordHash ?? DUMMY_PASSWORD_HASH;
    const passwordOk = await compare(data.password, hashToCheck);

    if (!userRow || !passwordOk) {
      throw new Error("Correo o contraseña incorrectos");
    }

    // Only reachable once the password has already been verified — telling a
    // genuine account holder their workshop is deactivated isn't an
    // enumeration risk the way distinguishing wrong-email/wrong-password
    // would be, and it beats leaving them thinking they mistyped a correct
    // password (this error used to be folded into the generic one above).
    if (userRow.role !== "system_admin" && userRow.workshop?.isActive === false) {
      throw new Error("Tu taller ha sido desactivado. Contacta al administrador de la plataforma.");
    }

    // Session rotation: destroy any pre-existing sessions for this user, then
    // issue a fresh one — defeats session fixation.
    await revokeAllSessionsForUser(userRow.id);
    const token = await createSession(userRow.id);
    setSessionCookie(token);

    return { user: toAppUser(userRow) };
  });

export const changeOwnPassword = createServerFn({ method: "POST" })
  .middleware([signedInMiddleware])
  .validator(z.object({ currentPassword: z.string().min(1), newPassword: z.string().min(8) }))
  .handler(async ({ context, data }) => {
    const db = getDb();
    const row = await db.query.users.findFirst({ where: eq(users.id, context.user.id) });
    if (!row) throw new Error("Usuario no encontrado");

    const currentOk = await compare(data.currentPassword, row.passwordHash);
    if (!currentOk) throw new Error("La contraseña actual no es correcta");

    const passwordHash = await hash(data.newPassword, 12);
    await db.update(users).set({ passwordHash }).where(eq(users.id, row.id));

    // Same rationale as a role change: a password change invalidates every
    // session trusting the old one, including this one — the client signs
    // the user out and sends them back to /login with the new password.
    await revokeAllSessionsForUser(row.id);
    clearSessionCookie();

    return { ok: true };
  });

// No auth middleware on purpose: logout must work for every role, including
// system_admin (who has no workshopId, so authMiddleware would reject them).
// Revoking an already-invalid token / clearing an absent cookie is a harmless
// no-op, so there's nothing to gate here.
export const logout = createServerFn({ method: "POST" }).handler(async () => {
  const token = readSessionToken();
  if (token) await revokeSession(token);
  clearSessionCookie();
  return { ok: true };
});
