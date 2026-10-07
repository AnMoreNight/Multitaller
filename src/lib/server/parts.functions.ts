import { createServerFn } from "@tanstack/react-start";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { getDb } from "@/lib/db/client";
import { toPartCatalogItem } from "@/lib/db/mappers";
import { partsCatalog } from "@/lib/db/schema";
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
