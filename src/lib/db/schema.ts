import { relations, sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";

// Mirrors the TS unions in src/lib/taller-data.ts — keep these two in sync by hand,
// there is no codegen linking them.
// system_admin is platform-level (no workshop) — creates/activates workshops and
// their first admin. Never shown the taller UI; see src/routes/system.workshops.tsx.
export const roleEnum = pgEnum("role", ["system_admin", "admin", "worker"]);
export const businessTypeEnum = pgEnum("business_type", ["mechanical_workshop"]);
export const orderStatusEnum = pgEnum("order_status", [
  "Pendiente inspección",
  "Esperando repuesto",
  "En proceso",
  "Completado",
  "Entregado",
  "Garantía",
]);

export const workshops = pgTable("workshops", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  businessType: businessTypeEnum("business_type").notNull().default("mechanical_workshop"),
  // Backs atomic FT-#### id generation in createOrder (src/lib/server/orders.functions.ts) —
  // a client-side max-scan would be racy against a shared DB.
  nextOrderSeq: integer("next_order_seq").notNull().default(0),
  // System admin can deactivate a workshop (e.g. non-payment, offboarding) without
  // deleting its data. login/getSession must refuse admin/worker sessions here.
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    // Null only for role = system_admin — every admin/worker belongs to exactly
    // one workshop. Server functions must treat a null workshopId as "not a
    // workshop member" (authMiddleware's own check), never as "sees everything".
    workshopId: uuid("workshop_id").references(() => workshops.id),
    email: text("email").notNull().unique(),
    passwordHash: text("password_hash").notNull(),
    name: text("name").notNull(),
    title: text("title").notNull(),
    role: roleEnum("role").notNull(),
    canChangeOrderStatus: boolean("can_change_order_status").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("users_workshop_id_idx").on(table.workshopId)],
);

export const sessions = pgTable(
  "sessions",
  {
    // Opaque random token (see src/lib/server/session.server.ts) — the cookie
    // value itself, not a separate secret.
    id: text("id").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  },
  (table) => [index("sessions_user_id_idx").on(table.userId)],
);

export const customers = pgTable(
  "customers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workshopId: uuid("workshop_id")
      .notNull()
      .references(() => workshops.id),
    name: text("name").notNull(),
    phone: text("phone").notNull(),
    email: text("email"),
    notes: text("notes"),
  },
  (table) => [index("customers_workshop_id_idx").on(table.workshopId)],
);

export const vehicles = pgTable(
  "vehicles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workshopId: uuid("workshop_id")
      .notNull()
      .references(() => workshops.id),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => customers.id),
    vin: text("vin"),
    plate: text("plate"),
    make: text("make").notNull(),
    model: text("model").notNull(),
    year: integer("year").notNull(),
    color: text("color"),
    notes: text("notes"),
  },
  (table) => [
    index("vehicles_workshop_id_idx").on(table.workshopId),
    index("vehicles_customer_id_idx").on(table.customerId),
  ],
);

export const partsCatalog = pgTable(
  "parts_catalog",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workshopId: uuid("workshop_id")
      .notNull()
      .references(() => workshops.id),
    sku: text("sku"),
    name: text("name").notNull(),
    workshopCost: numeric("workshop_cost", {
      precision: 10,
      scale: 2,
    }).notNull(),
    customerPrice: numeric("customer_price", {
      precision: 10,
      scale: 2,
    }).notNull(),
    warranty: boolean("warranty").notNull().default(false),
  },
  (table) => [index("parts_catalog_workshop_id_idx").on(table.workshopId)],
);

export const workOrders = pgTable(
  "work_orders",
  {
    // Display-format id (FT-####), not a uuid — see nextOrderSeq above.
    id: text("id").primaryKey(),
    workshopId: uuid("workshop_id")
      .notNull()
      .references(() => workshops.id),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => customers.id),
    vehicleId: uuid("vehicle_id")
      .notNull()
      .references(() => vehicles.id),
    createdAt: text("created_at").notNull(), // ISO date (YYYY-MM-DD), matches WorkOrder.createdAt
    reason: text("reason").notNull(),
    warningLights: text("warning_lights")
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    complaint: text("complaint"),
    status: orderStatusEnum("status").notNull(),
    diagnosisFee: numeric("diagnosis_fee", { precision: 10, scale: 2 }).notNull().default("0"),
    diagnosisWaived: boolean("diagnosis_waived").notNull().default(false),
    applyMaterialsFee: boolean("apply_materials_fee").notNull().default(false),
    // Self-reference: the original order a "Garantía" visit is covering.
    warrantyOf: text("warranty_of").references((): AnyPgColumn => workOrders.id),
  },
  (table) => [
    index("work_orders_workshop_id_idx").on(table.workshopId),
    index("work_orders_customer_id_idx").on(table.customerId),
    index("work_orders_vehicle_id_idx").on(table.vehicleId),
  ],
);

export const laborItems = pgTable(
  "labor_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workOrderId: text("work_order_id")
      .notNull()
      .references(() => workOrders.id, { onDelete: "cascade" }),
    description: text("description").notNull(),
    price: numeric("price", { precision: 10, scale: 2 }).notNull(),
  },
  (table) => [index("labor_items_work_order_id_idx").on(table.workOrderId)],
);

export const partLines = pgTable(
  "part_lines",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workOrderId: text("work_order_id")
      .notNull()
      .references(() => workOrders.id, { onDelete: "cascade" }),
    // Set when the line was added from the catalog — same nullable relationship
    // as PartLine.partId in taller-data.ts.
    partId: uuid("part_id").references(() => partsCatalog.id),
    name: text("name").notNull(),
    workshopCost: numeric("workshop_cost", {
      precision: 10,
      scale: 2,
    }).notNull(),
    customerPrice: numeric("customer_price", {
      precision: 10,
      scale: 2,
    }).notNull(),
    warranty: boolean("warranty").notNull().default(false),
    qty: integer("qty").notNull().default(1),
  },
  (table) => [index("part_lines_work_order_id_idx").on(table.workOrderId)],
);

export const workshopsRelations = relations(workshops, ({ many }) => ({
  users: many(users),
  customers: many(customers),
  vehicles: many(vehicles),
  partsCatalog: many(partsCatalog),
  workOrders: many(workOrders),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  workshop: one(workshops, {
    fields: [users.workshopId],
    references: [workshops.id],
  }),
  sessions: many(sessions),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, { fields: [sessions.userId], references: [users.id] }),
}));

export const customersRelations = relations(customers, ({ one, many }) => ({
  workshop: one(workshops, {
    fields: [customers.workshopId],
    references: [workshops.id],
  }),
  vehicles: many(vehicles),
  orders: many(workOrders),
}));

export const vehiclesRelations = relations(vehicles, ({ one, many }) => ({
  workshop: one(workshops, {
    fields: [vehicles.workshopId],
    references: [workshops.id],
  }),
  customer: one(customers, {
    fields: [vehicles.customerId],
    references: [customers.id],
  }),
  orders: many(workOrders),
}));

export const partsCatalogRelations = relations(partsCatalog, ({ one }) => ({
  workshop: one(workshops, {
    fields: [partsCatalog.workshopId],
    references: [workshops.id],
  }),
}));

export const workOrdersRelations = relations(workOrders, ({ one, many }) => ({
  workshop: one(workshops, {
    fields: [workOrders.workshopId],
    references: [workshops.id],
  }),
  customer: one(customers, {
    fields: [workOrders.customerId],
    references: [customers.id],
  }),
  vehicle: one(vehicles, {
    fields: [workOrders.vehicleId],
    references: [vehicles.id],
  }),
  labor: many(laborItems),
  parts: many(partLines),
}));

export const laborItemsRelations = relations(laborItems, ({ one }) => ({
  workOrder: one(workOrders, {
    fields: [laborItems.workOrderId],
    references: [workOrders.id],
  }),
}));

export const partLinesRelations = relations(partLines, ({ one }) => ({
  workOrder: one(workOrders, {
    fields: [partLines.workOrderId],
    references: [workOrders.id],
  }),
  part: one(partsCatalog, {
    fields: [partLines.partId],
    references: [partsCatalog.id],
  }),
}));
