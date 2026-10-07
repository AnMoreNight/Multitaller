import { createServerFn } from "@tanstack/react-start";
import { eq, sql } from "drizzle-orm";
import { z } from "zod";

import { getDb } from "@/lib/db/client";
import { toWorkOrder } from "@/lib/db/mappers";
import { laborItems, partLines, workOrders, workshops } from "@/lib/db/schema";
import { authMiddleware, adminMiddleware } from "@/lib/server/auth-middleware";

const orderStatusValues = [
  "Pendiente inspección",
  "Esperando repuesto",
  "En proceso",
  "Completado",
  "Entregado",
  "Garantía",
] as const;

// Parity with the old in-memory data: any workshop member could already read
// full order objects (diagnosis, labor, parts, costs) from useData() — only
// the UI hid cost fields from workers (canSeeCosts in the order detail page).
// Keeping that same trust boundary here rather than redacting server-side,
// confirmed earlier as the intended scope for this phase.
export const listOrders = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const db = getDb();
    const rows = await db.query.workOrders.findMany({
      where: eq(workOrders.workshopId, context.workshopId),
      with: { labor: true, parts: true },
    });
    return rows.map(toWorkOrder);
  });

export const createOrder = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .validator(
    z.object({
      customerId: z.string().uuid(),
      vehicleId: z.string().uuid(),
      createdAt: z.string(),
      reason: z.string().min(1),
      warningLights: z.array(z.string()),
      complaint: z.string().optional(),
      status: z.enum(orderStatusValues),
      diagnosisFee: z.number().min(0),
      diagnosisWaived: z.boolean(),
      applyMaterialsFee: z.boolean(),
      warrantyOf: z.string().optional(),
    }),
  )
  .handler(async ({ context, data }) => {
    const db = getDb();
    // Atomic FT-#### id — replaces the old client-side max-scan (nextOrderId
    // in work-order.ts), which was racy against a shared database.
    const [seqRow] = await db
      .update(workshops)
      .set({ nextOrderSeq: sql`${workshops.nextOrderSeq} + 1` })
      .where(eq(workshops.id, context.workshopId))
      .returning({ nextOrderSeq: workshops.nextOrderSeq });
    if (!seqRow) throw new Error("No se pudo generar el número de orden");
    const id = `FT-${seqRow.nextOrderSeq}`;

    const [row] = await db
      .insert(workOrders)
      .values({
        id,
        workshopId: context.workshopId,
        customerId: data.customerId,
        vehicleId: data.vehicleId,
        createdAt: data.createdAt,
        reason: data.reason,
        warningLights: data.warningLights,
        complaint: data.complaint,
        status: data.status,
        diagnosisFee: data.diagnosisFee.toFixed(2),
        diagnosisWaived: data.diagnosisWaived,
        applyMaterialsFee: data.applyMaterialsFee,
        warrantyOf: data.warrantyOf,
      })
      .returning();
    if (!row) throw new Error("No se pudo crear la orden");
    return toWorkOrder({ ...row, labor: [], parts: [] });
  });

const laborItemInput = z.object({
  id: z.string(),
  description: z.string(),
  price: z.number(),
});
const partLineInput = z.object({
  id: z.string(),
  partId: z.string().uuid().optional(),
  name: z.string(),
  workshopCost: z.number(),
  customerPrice: z.number(),
  warranty: z.boolean(),
  qty: z.number().int().min(1),
});

export const updateOrder = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(
    z.object({
      orderId: z.string(),
      changes: z.object({
        reason: z.string().min(1).optional(),
        warningLights: z.array(z.string()).optional(),
        complaint: z.string().optional(),
        status: z.enum(orderStatusValues).optional(),
        diagnosisFee: z.number().min(0).optional(),
        diagnosisWaived: z.boolean().optional(),
        applyMaterialsFee: z.boolean().optional(),
        labor: z.array(laborItemInput).optional(),
        parts: z.array(partLineInput).optional(),
      }),
    }),
  )
  .handler(async ({ context, data }) => {
    const db = getDb();
    const target = await db.query.workOrders.findFirst({
      where: eq(workOrders.id, data.orderId),
    });
    if (!target || target.workshopId !== context.workshopId) {
      throw new Error("Orden no encontrada en este taller");
    }

    // Matches the client's canEdit (admin only) vs canEditStatus (admin OR
    // canChangeOrderStatus) split in the order detail page exactly: only a
    // status-only change gets the relaxed check.
    const { labor, parts, status, ...otherChanges } = data.changes;
    const onlyStatusChanging =
      status !== undefined &&
      Object.keys(otherChanges).length === 0 &&
      labor === undefined &&
      parts === undefined;
    const isAdmin = context.user.role === "admin";
    if (onlyStatusChanging) {
      if (!isAdmin && !context.user.canChangeOrderStatus) {
        throw new Error("No tienes permiso para cambiar el estado de esta orden");
      }
    } else if (!isAdmin) {
      throw new Error("Solo un administrador puede editar esta orden");
    }

    // Built field-by-field rather than spreading otherChanges directly: zod's
    // .optional() types each field as `T | undefined` rather than a truly
    // absent key, which exactOptionalPropertyTypes rejects on assignment to
    // Drizzle's insert type -- and the optional() helper from lib/utils isn't
    // right here either, since it treats false/0 as "omit", which would
    // silently drop a legitimate diagnosisWaived: false or fee: 0.
    const columnChanges: Partial<typeof workOrders.$inferInsert> = {};
    if (otherChanges.reason !== undefined) columnChanges.reason = otherChanges.reason;
    if (otherChanges.warningLights !== undefined) {
      columnChanges.warningLights = otherChanges.warningLights;
    }
    if (otherChanges.complaint !== undefined) columnChanges.complaint = otherChanges.complaint;
    if (status !== undefined) columnChanges.status = status;
    if (otherChanges.diagnosisWaived !== undefined) {
      columnChanges.diagnosisWaived = otherChanges.diagnosisWaived;
    }
    if (otherChanges.applyMaterialsFee !== undefined) {
      columnChanges.applyMaterialsFee = otherChanges.applyMaterialsFee;
    }
    if (otherChanges.diagnosisFee !== undefined) {
      columnChanges.diagnosisFee = otherChanges.diagnosisFee.toFixed(2);
    }
    if (Object.keys(columnChanges).length > 0) {
      await db.update(workOrders).set(columnChanges).where(eq(workOrders.id, data.orderId));
    }

    // Replace-all-children rather than diffing: orders have a handful of
    // lines at most, and this avoids needing separate add/remove/reorder
    // endpoints. Line ids stay client-generated (see NewOrderWizard et al.'s
    // generateId()) and are inserted as-is rather than DB-assigned, so the
    // optimistic UI's ids never get invalidated out from under an in-progress
    // edit by a debounced sync landing mid-keystroke.
    if (labor !== undefined) {
      await db.delete(laborItems).where(eq(laborItems.workOrderId, data.orderId));
      if (labor.length > 0) {
        await db.insert(laborItems).values(
          labor.map((item) => ({
            id: item.id,
            workOrderId: data.orderId,
            description: item.description,
            price: item.price.toFixed(2),
          })),
        );
      }
    }
    if (parts !== undefined) {
      await db.delete(partLines).where(eq(partLines.workOrderId, data.orderId));
      if (parts.length > 0) {
        await db.insert(partLines).values(
          parts.map((item) => ({
            id: item.id,
            workOrderId: data.orderId,
            partId: item.partId,
            name: item.name,
            workshopCost: item.workshopCost.toFixed(2),
            customerPrice: item.customerPrice.toFixed(2),
            warranty: item.warranty,
            qty: item.qty,
          })),
        );
      }
    }

    const updated = await db.query.workOrders.findFirst({
      where: eq(workOrders.id, data.orderId),
      with: { labor: true, parts: true },
    });
    if (!updated) throw new Error("No se pudo actualizar la orden");
    return toWorkOrder(updated);
  });

export const deleteOrder = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .validator(z.object({ orderId: z.string() }))
  .handler(async ({ context, data }) => {
    const db = getDb();
    const target = await db.query.workOrders.findFirst({
      where: eq(workOrders.id, data.orderId),
    });
    if (!target || target.workshopId !== context.workshopId) {
      throw new Error("Orden no encontrada en este taller");
    }

    // A warranty-visit order's warrantyOf FK (no ON DELETE) would otherwise
    // block deleting the original order it points back to.
    await db
      .update(workOrders)
      .set({ warrantyOf: null })
      .where(eq(workOrders.warrantyOf, data.orderId));
    // labor_items/part_lines cascade automatically (onDelete: "cascade").
    await db.delete(workOrders).where(eq(workOrders.id, data.orderId));
  });
