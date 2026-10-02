import { createMiddleware } from "@tanstack/react-start";

import { toAppUser } from "@/lib/db/mappers";
import { findSessionUserWithWorkshop, readSessionToken } from "@/lib/server/session.server";

/**
 * Any signed-in user, regardless of role or workshop — the only check that
 * works for a system_admin too (who has no workshopId, so authMiddleware
 * always rejects them). Use this for actions that make sense for every role
 * alike, such as changing your own password.
 */
export const signedInMiddleware = createMiddleware({ type: "function" }).server(
  async ({ next }) => {
    const token = readSessionToken();
    const userRow = token ? await findSessionUserWithWorkshop(token) : null;
    if (!userRow) throw new Error("No autenticado");
    return next({ context: { user: toAppUser(userRow) } });
  },
);

/**
 * Any signed-in workshop member (admin or worker) — never system_admin, whose
 * session has no workshopId. Callers get a guaranteed-non-null context.workshopId,
 * so downstream code never has to re-check it before scoping a query.
 */
export const authMiddleware = createMiddleware({ type: "function" }).server(async ({ next }) => {
  const token = readSessionToken();
  const userRow = token ? await findSessionUserWithWorkshop(token) : null;
  if (!userRow || !userRow.workshopId) throw new Error("No autenticado");
  return next({
    context: { user: toAppUser(userRow), workshopId: userRow.workshopId },
  });
});

export const adminMiddleware = createMiddleware({ type: "function" })
  .middleware([authMiddleware])
  .server(async ({ next, context }) => {
    if (context.user.role !== "admin") {
      throw new Error("Requiere permisos de administrador");
    }
    return next();
  });

/** Platform-level only — a workshop admin/worker is not authorized here even though they're signed in. */
export const systemAdminMiddleware = createMiddleware({ type: "function" }).server(
  async ({ next }) => {
    const token = readSessionToken();
    const userRow = token ? await findSessionUserWithWorkshop(token) : null;
    if (!userRow || userRow.role !== "system_admin") {
      throw new Error("No autorizado");
    }
    return next({ context: { user: toAppUser(userRow) } });
  },
);
