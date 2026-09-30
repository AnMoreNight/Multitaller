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

import { getDb } from "./client";
import { users, workshops } from "./schema";

process.loadEnvFile?.();

const WORKSHOP_ONE_ID = "00000000-0000-0000-0000-000000000001";
const SEED_PASSWORD = "changeme123";

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

  console.log("Seed complete.");
}

main()
  .then(() => process.exit(0))
  .catch((err: unknown) => {
    console.error(err);
    process.exit(1);
  });
