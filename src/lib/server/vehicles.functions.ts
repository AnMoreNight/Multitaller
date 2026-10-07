import { createServerFn } from "@tanstack/react-start";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { getDb } from "@/lib/db/client";
import { toVehicle } from "@/lib/db/mappers";
import { customers, vehicles } from "@/lib/db/schema";
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
