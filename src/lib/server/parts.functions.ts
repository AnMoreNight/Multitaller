import { createServerFn } from "@tanstack/react-start";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { getDb } from "@/lib/db/client";
import { toPartCatalogItem } from "@/lib/db/mappers";
import { partLines, partsCatalog } from "@/lib/db/schema";
import { adminMiddleware, authMiddleware } from "@/lib/server/auth-middleware";

// Parity with the old in-memory data: every workshop member could already
// read partsCatalog from useData() (only the /repuestos page itself and
// adding parts were admin-gated in the UI), so listing stays authMiddleware.
export const listPartsCatalog = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const db = getDb();
    const rows = await db.query.partsCatalog.findMany({
      where: eq(partsCatalog.workshopId, context.workshopId),
    });
    return rows.map(toPartCatalogItem);
  });

export const createPart = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .validator(
    z.object({
      sku: z.string().optional(),
      name: z.string().min(1),
      workshopCost: z.number().min(0),
      customerPrice: z.number().min(0),
      warranty: z.boolean(),
    }),
  )
  .handler(async ({ context, data }) => {
    const db = getDb();
    const [row] = await db
      .insert(partsCatalog)
      .values({
        workshopId: context.workshopId,
        ...data,
        workshopCost: data.workshopCost.toFixed(2),
        customerPrice: data.customerPrice.toFixed(2),
      })
      .returning();
    if (!row) throw new Error("No se pudo crear el repuesto");
    return toPartCatalogItem(row);
  });

export const updatePart = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .validator(
    z.object({
      partId: z.string().uuid(),
      // Plain string (not .optional()) -- this is a full-form edit, so an
      // empty value means "clear the SKU", not "leave it unchanged". Drizzle's
      // .set() skips undefined-valued keys rather than nulling them, which
      // would make that distinction impossible to express with .optional().
      sku: z.string(),
      name: z.string().min(1),
      workshopCost: z.number().min(0),
      customerPrice: z.number().min(0),
      warranty: z.boolean(),
    }),
  )
  .handler(async ({ context, data }) => {
    const db = getDb();
    const part = await db.query.partsCatalog.findFirst({
      where: eq(partsCatalog.id, data.partId),
    });
    if (!part || part.workshopId !== context.workshopId) {
      throw new Error("Repuesto no encontrado en este taller");
    }
    const [row] = await db
      .update(partsCatalog)
      .set({
        sku: data.sku || null,
        name: data.name,
        workshopCost: data.workshopCost.toFixed(2),
        customerPrice: data.customerPrice.toFixed(2),
        warranty: data.warranty,
      })
      .where(eq(partsCatalog.id, data.partId))
      .returning();
    if (!row) throw new Error("No se pudo actualizar el repuesto");
    return toPartCatalogItem(row);
  });

// Past orders keep their own copy of a part line's name/cost/price (see
// part_lines), so deleting a catalog entry doesn't touch order history --
// it only detaches the "came from this catalog item" backlink on any line
// that referenced it, which is what the FK (no ON DELETE) would otherwise
// block.
export const deletePart = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .validator(z.object({ partId: z.string().uuid() }))
  .handler(async ({ context, data }) => {
    const db = getDb();
    const part = await db.query.partsCatalog.findFirst({
      where: eq(partsCatalog.id, data.partId),
    });
    if (!part || part.workshopId !== context.workshopId) {
      throw new Error("Repuesto no encontrado en este taller");
    }
    await db.update(partLines).set({ partId: null }).where(eq(partLines.partId, data.partId));
    await db.delete(partsCatalog).where(eq(partsCatalog.id, data.partId));
  });
