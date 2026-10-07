import type { InferSelectModel } from "drizzle-orm";

import { optional } from "@/lib/utils";
import type {
  AppUser,
  Customer,
  LaborItem,
  PartCatalogItem,
  PartLine,
  Vehicle,
  Workshop,
  WorkOrder,
} from "@/lib/taller-data";
import type {
  customers,
  laborItems,
  partLines,
  partsCatalog,
  users,
  vehicles,
  workOrders,
  workshops,
} from "./schema";

// Row -> domain-type converters. Kept separate from the server functions that
// call them so the same mapping logic is reusable across every function that
// returns a user/workshop, and so it's obvious at a glance that passwordHash
// never leaves this file (never spread a raw user row back to the client).

type UserRow = InferSelectModel<typeof users>;
type WorkshopRow = InferSelectModel<typeof workshops>;

// `workshop` is only present when the caller joined it in (session lookups
// do; plain workshop-roster queries don't need to). Its name lets the UI
// show the signed-in user's actual workshop instead of a hardcoded one.
export function toAppUser(row: UserRow & { workshop?: WorkshopRow | null }): AppUser {
  return {
    id: row.id,
    ...optional("workshopId", row.workshopId),
    ...optional("workshopName", row.workshop?.name),
    name: row.name,
    title: row.title,
    role: row.role,
    canChangeOrderStatus: row.canChangeOrderStatus,
  };
}

export function toWorkshop(row: WorkshopRow): Workshop {
  return {
    id: row.id,
    name: row.name,
    businessType: row.businessType,
    isActive: row.isActive,
  };
}

type CustomerRow = InferSelectModel<typeof customers>;
type VehicleRow = InferSelectModel<typeof vehicles>;
type PartsCatalogRow = InferSelectModel<typeof partsCatalog>;
type WorkOrderRow = InferSelectModel<typeof workOrders>;
type LaborItemRow = InferSelectModel<typeof laborItems>;
type PartLineRow = InferSelectModel<typeof partLines>;

export function toCustomer(row: CustomerRow): Customer {
  return {
    id: row.id,
    workshopId: row.workshopId,
    name: row.name,
    phone: row.phone,
    ...optional("email", row.email),
    ...optional("notes", row.notes),
  };
}

export function toVehicle(row: VehicleRow): Vehicle {
  return {
    id: row.id,
    workshopId: row.workshopId,
    customerId: row.customerId,
    ...optional("vin", row.vin),
    ...optional("plate", row.plate),
    make: row.make,
    model: row.model,
    year: row.year,
    ...optional("color", row.color),
    ...optional("notes", row.notes),
  };
}

// numeric columns come back as strings from the driver — Number(...) here is
// the one place that happens, so every consumer past this file keeps getting
// real numbers like taller-data.ts's demo arrays always had.
export function toPartCatalogItem(row: PartsCatalogRow): PartCatalogItem {
  return {
    id: row.id,
    workshopId: row.workshopId,
    ...optional("sku", row.sku),
    name: row.name,
    workshopCost: Number(row.workshopCost),
    customerPrice: Number(row.customerPrice),
    warranty: row.warranty,
  };
}

export function toLaborItem(row: LaborItemRow): LaborItem {
  return {
    id: row.id,
    description: row.description,
    price: Number(row.price),
  };
}

export function toPartLine(row: PartLineRow): PartLine {
  return {
    id: row.id,
    ...optional("partId", row.partId),
    name: row.name,
    workshopCost: Number(row.workshopCost),
    customerPrice: Number(row.customerPrice),
    warranty: row.warranty,
    qty: row.qty,
  };
}

export function toWorkOrder(
  row: WorkOrderRow & { labor: LaborItemRow[]; parts: PartLineRow[] },
): WorkOrder {
  return {
    id: row.id,
    workshopId: row.workshopId,
    customerId: row.customerId,
    vehicleId: row.vehicleId,
    createdAt: row.createdAt,
    reason: row.reason,
    warningLights: row.warningLights as WorkOrder["warningLights"],
    ...optional("complaint", row.complaint),
    status: row.status,
    diagnosis: { fee: Number(row.diagnosisFee), waived: row.diagnosisWaived },
    labor: row.labor.map(toLaborItem),
    parts: row.parts.map(toPartLine),
    applyMaterialsFee: row.applyMaterialsFee,
    ...optional("warrantyOf", row.warrantyOf),
  };
}
