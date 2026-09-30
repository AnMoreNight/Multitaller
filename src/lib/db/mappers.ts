import type { InferSelectModel } from "drizzle-orm";

import { optional } from "@/lib/utils";
import type { AppUser, Workshop } from "@/lib/taller-data";
import type { users, workshops } from "./schema";

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
