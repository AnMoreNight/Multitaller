import { createServerFn } from "@tanstack/react-start";
import { eq, inArray } from "drizzle-orm";
import { z } from "zod";

import { getDb } from "@/lib/db/client";
import { toCustomer } from "@/lib/db/mappers";
import { customers, vehicles, workOrders } from "@/lib/db/schema";
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

// Deletes the customer along with their vehicles and orders -- there's no
// "archive" concept yet, and leaving orphaned vehicles/orders behind (the FK
// has no ON DELETE) isn't an option, so this cascades by hand instead.
export const deleteCustomer = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .validator(z.object({ customerId: z.string().uuid() }))
  .handler(async ({ context, data }) => {
    const db = getDb();
    const customer = await db.query.customers.findFirst({
      where: eq(customers.id, data.customerId),
    });
    if (!customer || customer.workshopId !== context.workshopId) {
      throw new Error("Cliente no encontrado en este taller");
    }

    const customerOrders = await db.query.workOrders.findMany({
      where: eq(workOrders.customerId, data.customerId),
      columns: { id: true },
    });
    const orderIds = customerOrders.map((order) => order.id);

    if (orderIds.length > 0) {
      // A warranty-visit order's warrantyOf FK (no ON DELETE) would otherwise
      // block deleting the original order it points back to.
      await db
        .update(workOrders)
        .set({ warrantyOf: null })
        .where(inArray(workOrders.warrantyOf, orderIds));
      await db.delete(workOrders).where(inArray(workOrders.id, orderIds));
    }
    await db.delete(vehicles).where(eq(vehicles.customerId, data.customerId));
    await db.delete(customers).where(eq(customers.id, data.customerId));
  });
