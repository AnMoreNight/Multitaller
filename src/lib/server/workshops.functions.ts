import { createServerFn } from "@tanstack/react-start";
import { hash } from "bcryptjs";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { getDb } from "@/lib/db/client";
import { toWorkshop } from "@/lib/db/mappers";
import { users, workshops } from "@/lib/db/schema";
import { systemAdminMiddleware } from "@/lib/server/auth-middleware";

export const listWorkshops = createServerFn({ method: "GET" })
  .middleware([systemAdminMiddleware])
  .handler(async () => {
    const db = getDb();
    const rows = await db.query.workshops.findMany();
    return rows.map(toWorkshop);
  });

export const createWorkshop = createServerFn({ method: "POST" })
  .middleware([systemAdminMiddleware])
  .validator(
    z.object({
      name: z.string().min(1),
      adminName: z.string().min(1),
      adminTitle: z.string().min(1),
      adminEmail: z.string().email(),
      adminPassword: z.string().min(8),
    }),
  )
  .handler(async ({ data }) => {
    const db = getDb();
    // Not wrapped in a transaction: neon-http's transaction support only
    // covers a fixed batch of statements, not conditional logic between them.
    // Worst case on a mid-way failure is an orphaned workshop with no admin
    // yet — recoverable by hand, not a correctness or security issue, so the
    // extra complexity isn't worth it for this Phase 1 scope.
    const [workshop] = await db.insert(workshops).values({ name: data.name }).returning();
    if (!workshop) throw new Error("No se pudo crear el taller");

    const passwordHash = await hash(data.adminPassword, 12);
    await db.insert(users).values({
      workshopId: workshop.id,
      email: data.adminEmail.trim().toLowerCase(),
      passwordHash,
      name: data.adminName,
      title: data.adminTitle,
      role: "admin",
      canChangeOrderStatus: true,
    });

    return toWorkshop(workshop);
  });

export const updateWorkshop = createServerFn({ method: "POST" })
  .middleware([systemAdminMiddleware])
  .validator(z.object({ workshopId: z.string().uuid(), isActive: z.boolean() }))
  .handler(async ({ data }) => {
    const db = getDb();
    const [row] = await db
      .update(workshops)
      .set({ isActive: data.isActive })
      .where(eq(workshops.id, data.workshopId))
      .returning();
    if (!row) throw new Error("Taller no encontrado");
    return toWorkshop(row);
  });
