import { createServerFn } from "@tanstack/react-start";
import { hash } from "bcryptjs";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { getDb } from "@/lib/db/client";
import { toAppUser } from "@/lib/db/mappers";
import { users } from "@/lib/db/schema";
import { adminMiddleware, authMiddleware } from "@/lib/server/auth-middleware";
import { revokeAllSessionsForUser } from "@/lib/server/session.server";

export const listUsers = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const db = getDb();
    const rows = await db.query.users.findMany({
      where: eq(users.workshopId, context.workshopId),
    });
    return rows.map(toAppUser);
  });

export const createUser = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .validator(
    z.object({
      name: z.string().min(1),
      title: z.string().min(1),
      role: z.enum(["admin", "worker"]),
      canChangeOrderStatus: z.boolean(),
      email: z.string().trim().email(),
      password: z.string().min(8),
    }),
  )
  .handler(async ({ context, data }) => {
    const db = getDb();
    const passwordHash = await hash(data.password, 12);
    const [row] = await db
      .insert(users)
      .values({
        workshopId: context.workshopId,
        email: data.email.trim().toLowerCase(),
        passwordHash,
        name: data.name,
        title: data.title,
        role: data.role,
        canChangeOrderStatus: data.canChangeOrderStatus,
      })
      .returning();
    if (!row) throw new Error("No se pudo crear el usuario");
    return toAppUser(row);
  });

export const updateUser = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(
    z.object({
      userId: z.string().uuid(),
      changes: z.object({
        name: z.string().min(1).optional(),
        title: z.string().min(1).optional(),
        role: z.enum(["admin", "worker"]).optional(),
        canChangeOrderStatus: z.boolean().optional(),
      }),
    }),
  )
  .handler(async ({ context, data }) => {
    const db = getDb();
    // Shape-valid UUID is not authorization — re-check it's actually a member
    // of the caller's own workshop before touching it.
    const target = await db.query.users.findFirst({ where: eq(users.id, data.userId) });
    if (!target || target.workshopId !== context.workshopId) {
      throw new Error("Usuario no encontrado en este taller");
    }

    const isSelf = target.id === context.user.id;
    const changingPrivileges =
      data.changes.role !== undefined || data.changes.canChangeOrderStatus !== undefined;
    if (!isSelf && context.user.role !== "admin") {
      throw new Error("No tienes permiso para editar a otro usuario");
    }
    if (changingPrivileges && context.user.role !== "admin") {
      throw new Error("Solo un administrador puede cambiar el rol o los permisos");
    }

    const [row] = await db
      .update(users)
      .set(data.changes)
      .where(eq(users.id, data.userId))
      .returning();
    if (!row) throw new Error("No se pudo actualizar el usuario");
    // Privilege change (role/permission) invalidates any session already
    // trusting the old privileges — force a fresh login.
    if (changingPrivileges) await revokeAllSessionsForUser(row.id);
    return toAppUser(row);
  });

// There's no self-service "forgot password" flow yet (no email provider is
// configured) -- an admin resetting a locked-out teammate's password
// directly, the same way they set its initial value in createUser, is the
// recovery path until that exists.
export const resetUserPassword = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .validator(z.object({ userId: z.string().uuid(), newPassword: z.string().min(8) }))
  .handler(async ({ context, data }) => {
    const db = getDb();
    const target = await db.query.users.findFirst({ where: eq(users.id, data.userId) });
    if (!target || target.workshopId !== context.workshopId) {
      throw new Error("Usuario no encontrado en este taller");
    }
    if (target.id === context.user.id) {
      // Bypassing current-password verification for your own account is a
      // real privilege escalation risk if a session is ever compromised --
      // use "Cambiar contraseña" in Mi perfil instead, which requires it.
      throw new Error("Usa 'Cambiar contraseña' en Mi perfil para tu propia cuenta");
    }
    const passwordHash = await hash(data.newPassword, 12);
    await db.update(users).set({ passwordHash }).where(eq(users.id, data.userId));
    // The teammate's existing session(s) trusted the old password -- force a
    // fresh login so a reset actually locks out anyone who had it before.
    await revokeAllSessionsForUser(target.id);
    return { ok: true };
  });

export const removeUser = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .validator(z.object({ userId: z.string().uuid() }))
  .handler(async ({ context, data }) => {
    const db = getDb();
    const target = await db.query.users.findFirst({ where: eq(users.id, data.userId) });
    if (!target || target.workshopId !== context.workshopId) {
      throw new Error("Usuario no encontrado en este taller");
    }
    if (target.id === context.user.id) {
      throw new Error("No puedes eliminar tu propia cuenta");
    }
    if (target.role === "admin") {
      const teammates = await db.query.users.findMany({
        where: eq(users.workshopId, context.workshopId),
      });
      const remainingAdmins = teammates.filter(
        (u) => u.role === "admin" && u.id !== target.id,
      ).length;
      if (remainingAdmins === 0) {
        throw new Error("No puedes eliminar al último administrador del taller");
      }
    }
    await revokeAllSessionsForUser(target.id);
    await db.delete(users).where(eq(users.id, data.userId));
    return { ok: true };
  });
