import { createServerFn } from "@tanstack/react-start";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { getDb } from "@/lib/db/client";
import { toCustomer } from "@/lib/db/mappers";
import { customers } from "@/lib/db/schema";
import { adminMiddleware, authMiddleware } from "@/lib/server/auth-middleware";

// Any workshop member can list — a worker needs customer names resolved on
// orders/vehicles they can see, even though the Clientes page itself (and
// creating one) is admin-only, same as it was with the in-memory demo data.
export const listCustomers = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const db = getDb();
    const rows = await db.query.customers.findMany({
      where: eq(customers.workshopId, context.workshopId),
    });
    return rows.map(toCustomer);
  });

export const createCustomer = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .validator(
    z.object({
      name: z.string().min(1),
      phone: z.string().min(1),
      email: z.string().trim().email().optional(),
      notes: z.string().optional(),
    }),
  )
  .handler(async ({ context, data }) => {
    const db = getDb();
    const [row] = await db
      .insert(customers)
      .values({ workshopId: context.workshopId, ...data })
      .returning();
    if (!row) throw new Error("No se pudo crear el cliente");
    return toCustomer(row);
  });
