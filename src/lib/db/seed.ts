// Explicitly-invoked only (`npm run db:seed`) — never auto-run. Seeds:
//  1. one system_admin account (platform-level, no workshop)
//  2. as a dev-only convenience, workshop #1 + its admin + worker, matching
//     the demo accounts src/lib/taller-data.ts already ships (Andrea Ruiz /
//     Jorge Herrera) — this is NOT the intended production bootstrap path for
//     a *second* workshop, that's what /system/workshops is for. This just
//     saves clicking through that form for the very first workshop every time
//     a dev database gets reset.
//
// Workshop #1 uses a fixed, well-known id (not a random one) so it matches
// the workshopId literals still hardcoded across taller-data.ts's demo
// customers/vehicles/orders/parts — those haven't moved to Postgres yet.

import { eq } from "drizzle-orm";
import { hash } from "bcryptjs";

import {
  customers as demoCustomers,
  initialOrders as demoOrders,
  partsCatalog as demoPartsCatalog,
  vehicles as demoVehicles,
} from "@/lib/taller-data";

import type { Db } from "./client";
import { getDb } from "./client";
import {
  customers,
  laborItems,
  partLines,
  partsCatalog,
  users,
  vehicles,
  workOrders,
  workshops,
} from "./schema";

process.loadEnvFile?.();

const WORKSHOP_ONE_ID = "00000000-0000-0000-0000-000000000001";
const SEED_PASSWORD = "changeme123";

// Workshop #1's customers/vehicles/orders/parts used to live only in
// taller-data.ts's static arrays (read straight into React state). Now that
// store.tsx reads them from Postgres, seeding this same demo content here is
// what keeps the local dev workshop from looking empty after the migration —
// ids are re-generated as real uuids (taller-data.ts's "c1"/"v1"/"pc1" aren't
// valid uuids), work order ids stay literal (FT-#### is a text column).
async function seedDemoData(db: Db) {
  const existingCustomer = await db.query.customers.findFirst({
    where: eq(customers.workshopId, WORKSHOP_ONE_ID),
  });
  if (existingCustomer) {
    console.log("Workshop #1 demo data already exists, skipping.");
    return;
  }

  const partRows = await db
    .insert(partsCatalog)
    .values(
      demoPartsCatalog.map((part) => ({
        workshopId: WORKSHOP_ONE_ID,
        sku: part.sku,
        name: part.name,
        workshopCost: part.workshopCost.toFixed(2),
        customerPrice: part.customerPrice.toFixed(2),
        warranty: part.warranty,
      })),
    )
    .returning();
  const partIdMap = new Map(demoPartsCatalog.map((part, index) => [part.id, partRows[index]!.id]));

  const customerRows = await db
    .insert(customers)
    .values(
      demoCustomers.map((customer) => ({
        workshopId: WORKSHOP_ONE_ID,
        name: customer.name,
        phone: customer.phone,
        email: customer.email,
        notes: customer.notes,
      })),
    )
    .returning();
  const customerIdMap = new Map(
    demoCustomers.map((customer, index) => [customer.id, customerRows[index]!.id]),
  );

  const vehicleRows = await db
    .insert(vehicles)
    .values(
      demoVehicles.map((vehicle) => ({
        workshopId: WORKSHOP_ONE_ID,
        customerId: customerIdMap.get(vehicle.customerId)!,
        vin: vehicle.vin,
        plate: vehicle.plate,
        make: vehicle.make,
        model: vehicle.model,
        year: vehicle.year,
        color: vehicle.color,
        notes: vehicle.notes,
      })),
    )
    .returning();
  const vehicleIdMap = new Map(
    demoVehicles.map((vehicle, index) => [vehicle.id, vehicleRows[index]!.id]),
  );

  await db.insert(workOrders).values(
    demoOrders.map((order) => ({
      id: order.id,
      workshopId: WORKSHOP_ONE_ID,
      customerId: customerIdMap.get(order.customerId)!,
      vehicleId: vehicleIdMap.get(order.vehicleId)!,
      createdAt: order.createdAt,
      reason: order.reason,
      warningLights: order.warningLights,
      complaint: order.complaint,
      status: order.status,
      diagnosisFee: order.diagnosis.fee.toFixed(2),
      diagnosisWaived: order.diagnosis.waived,
      applyMaterialsFee: order.applyMaterialsFee,
      warrantyOf: order.warrantyOf,
    })),
  );

  const labor = demoOrders.flatMap((order) =>
    order.labor.map((item) => ({
      workOrderId: order.id,
      description: item.description,
      price: item.price.toFixed(2),
    })),
  );
  if (labor.length > 0) await db.insert(laborItems).values(labor);

  const parts = demoOrders.flatMap((order) =>
    order.parts.map((item) => ({
      workOrderId: order.id,
      partId: item.partId ? partIdMap.get(item.partId) : undefined,
      name: item.name,
      workshopCost: item.workshopCost.toFixed(2),
      customerPrice: item.customerPrice.toFixed(2),
      warranty: item.warranty,
      qty: item.qty,
    })),
  );
  if (parts.length > 0) await db.insert(partLines).values(parts);

  // Demo orders use fixed FT-2049..FT-2058 ids — point the atomic sequence
  // past the highest one so the next real createOrder doesn't produce an id
  // that looks like it belongs to this seeded range.
  const maxSeq = demoOrders.reduce((highest, order) => {
    const seq = Number(order.id.split("-")[1]);
    return Number.isFinite(seq) ? Math.max(highest, seq) : highest;
  }, 0);
  await db.update(workshops).set({ nextOrderSeq: maxSeq }).where(eq(workshops.id, WORKSHOP_ONE_ID));

  console.log(
    `Seeded workshop #1 demo data: ${customerRows.length} customers, ${vehicleRows.length} vehicles, ${partRows.length} parts, ${demoOrders.length} orders.`,
  );
}

async function main() {
  const db = getDb();

  const systemAdminEmail = "admin@ferrotaller.dev";
  const existingSystemAdmin = await db.query.users.findFirst({
    where: eq(users.email, systemAdminEmail),
  });
  if (existingSystemAdmin) {
    console.log("system_admin already exists, skipping.");
  } else {
    await db.insert(users).values({
      email: systemAdminEmail,
      passwordHash: await hash(SEED_PASSWORD, 12),
      name: "System Admin",
      title: "Plataforma",
      role: "system_admin",
      canChangeOrderStatus: false,
    });
    console.log(`Created system_admin: ${systemAdminEmail} / ${SEED_PASSWORD}`);
  }

  const existingWorkshop = await db.query.workshops.findFirst({
    where: eq(workshops.id, WORKSHOP_ONE_ID),
  });
  if (existingWorkshop) {
    console.log("Workshop #1 already exists, skipping.");
  } else {
    await db.insert(workshops).values({
      id: WORKSHOP_ONE_ID,
      name: "Ferro Taller",
      businessType: "mechanical_workshop",
    });
    await db.insert(users).values([
      {
        workshopId: WORKSHOP_ONE_ID,
        email: "andrea@ferrotaller.dev",
        passwordHash: await hash(SEED_PASSWORD, 12),
        name: "Andrea Ruiz",
        title: "Administradora",
        role: "admin",
        canChangeOrderStatus: true,
      },
      {
        workshopId: WORKSHOP_ONE_ID,
        email: "jorge@ferrotaller.dev",
        passwordHash: await hash(SEED_PASSWORD, 12),
        name: "Jorge Herrera",
        title: "Mecánico jefe",
        role: "worker",
        canChangeOrderStatus: true,
      },
    ]);
    console.log(
      `Created workshop #1 (Ferro Taller) with admin+worker accounts, password: ${SEED_PASSWORD}`,
    );
  }

  await seedDemoData(db);

  console.log("Seed complete.");
}

main()
  .then(() => process.exit(0))
  .catch((err: unknown) => {
    console.error(err);
    process.exit(1);
  });
