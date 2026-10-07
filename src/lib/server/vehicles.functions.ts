import { createServerFn } from "@tanstack/react-start";
import { eq, inArray } from "drizzle-orm";
import { z } from "zod";

import { getDb } from "@/lib/db/client";
import { toVehicle } from "@/lib/db/mappers";
import { customers, vehicles, workOrders } from "@/lib/db/schema";
import { adminMiddleware, authMiddleware } from "@/lib/server/auth-middleware";

export const listVehicles = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const db = getDb();
    const rows = await db.query.vehicles.findMany({
      where: eq(vehicles.workshopId, context.workshopId),
    });
    return rows.map(toVehicle);
  });

export const createVehicle = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .validator(
    z.object({
      customerId: z.string().uuid(),
      make: z.string().min(1),
      model: z.string().min(1),
      year: z.number().int(),
      vin: z.string().optional(),
      plate: z.string().optional(),
      color: z.string().optional(),
      notes: z.string().optional(),
    }),
  )
  .handler(async ({ context, data }) => {
    const db = getDb();
    // Shape-valid UUID is not authorization — the customer must actually
    // belong to this workshop, same check pattern as updateUser.
    const customer = await db.query.customers.findFirst({
      where: eq(customers.id, data.customerId),
    });
    if (!customer || customer.workshopId !== context.workshopId) {
      throw new Error("Cliente no encontrado en este taller");
    }
    const [row] = await db
      .insert(vehicles)
      .values({ workshopId: context.workshopId, ...data })
      .returning();
    if (!row) throw new Error("No se pudo registrar el vehículo");
    return toVehicle(row);
  });

// Deletes the vehicle along with its orders -- there's no "archive" concept
// yet, and work_orders.vehicleId has no ON DELETE, so leaving orphaned
// orders behind isn't an option.
export const deleteVehicle = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .validator(z.object({ vehicleId: z.string().uuid() }))
  .handler(async ({ context, data }) => {
    const db = getDb();
    const vehicle = await db.query.vehicles.findFirst({
      where: eq(vehicles.id, data.vehicleId),
    });
    if (!vehicle || vehicle.workshopId !== context.workshopId) {
      throw new Error("Vehículo no encontrado en este taller");
    }

    const vehicleOrders = await db.query.workOrders.findMany({
      where: eq(workOrders.vehicleId, data.vehicleId),
      columns: { id: true },
    });
    const orderIds = vehicleOrders.map((order) => order.id);

    if (orderIds.length > 0) {
      // A warranty-visit order's warrantyOf FK (no ON DELETE) would otherwise
      // block deleting the original order it points back to.
      await db
        .update(workOrders)
        .set({ warrantyOf: null })
        .where(inArray(workOrders.warrantyOf, orderIds));
      await db.delete(workOrders).where(inArray(workOrders.id, orderIds));
    }
    await db.delete(vehicles).where(eq(vehicles.id, data.vehicleId));
  });
