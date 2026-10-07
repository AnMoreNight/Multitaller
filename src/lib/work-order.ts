import type { Customer, OrderStatus, Vehicle, WorkOrder } from "@/lib/taller-data";

const MATERIALS_FEE_RATE = 0.035;

/** An order only counts toward revenue once it's finished — there's no separate
 * "completed at" timestamp, so this is checked against createdAt like the rest
 * of the reporting in this app. */
export const billedStatuses = new Set<OrderStatus>(["Completado", "Entregado"]);

export function laborTotal(order: WorkOrder): number {
  return order.labor.reduce((sum, item) => sum + item.price, 0);
}

export function partsCustomerTotal(order: WorkOrder): number {
  return order.parts.reduce((sum, item) => sum + item.customerPrice * item.qty, 0);
}

export function partsCostTotal(order: WorkOrder): number {
  return order.parts.reduce((sum, item) => sum + item.workshopCost * item.qty, 0);
}

export function diagnosisCharge(order: WorkOrder): number {
  return order.diagnosis.waived ? 0 : order.diagnosis.fee;
}

/**
 * Labor + customer parts price + diagnosis charge. This is also the base the 3.5%
 * materials fee is calculated against — the client never specified that base, so it's
 * kept here in one place and called out in the order screen's UI copy.
 */
export function subtotal(order: WorkOrder): number {
  return laborTotal(order) + partsCustomerTotal(order) + diagnosisCharge(order);
}

export function materialsFee(order: WorkOrder): number {
  return order.applyMaterialsFee ? subtotal(order) * MATERIALS_FEE_RATE : 0;
}

export function orderTotal(order: WorkOrder): number {
  return subtotal(order) + materialsFee(order);
}

/** Gross margin on parts only (customer price minus workshop cost) — the workshop-facing number. */
export function orderPartsMargin(order: WorkOrder): number {
  return partsCustomerTotal(order) - partsCostTotal(order);
}

export function getCustomer(customers: Customer[], customerId: string): Customer | undefined {
  return customers.find((customer) => customer.id === customerId);
}

export function getVehicle(vehicles: Vehicle[], vehicleId: string): Vehicle | undefined {
  return vehicles.find((vehicle) => vehicle.id === vehicleId);
}

export function vehicleLabel(vehicle: Pick<Vehicle, "make" | "model" | "year">): string {
  return `${vehicle.make} ${vehicle.model} ${vehicle.year}`;
}

export function vehiclesForCustomer(vehicles: Vehicle[], customerId: string): Vehicle[] {
  return vehicles.filter((vehicle) => vehicle.customerId === customerId);
}

export function ordersForVehicle(orders: WorkOrder[], vehicleId: string): WorkOrder[] {
  return orders
    .filter((order) => order.vehicleId === vehicleId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function ordersForCustomer(orders: WorkOrder[], customerId: string): WorkOrder[] {
  return orders
    .filter((order) => order.customerId === customerId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function lastServiceLabel(orders: WorkOrder[], vehicleId: string): string {
  const [latest] = ordersForVehicle(orders, vehicleId);
  if (!latest) return "Sin visitas";
  return new Date(`${latest.createdAt}T00:00:00`).toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatDate(isoDate: string): string {
  return new Date(`${isoDate}T00:00:00`).toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function dateToISO(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

export function todayISO(): string {
  return dateToISO(new Date());
}

/** Sum of billed orders created in the same calendar month as `reference` (defaults to today). */
export function monthToDateRevenue(orders: WorkOrder[], reference: Date = new Date()): number {
  const year = reference.getFullYear();
  const month = reference.getMonth();
  return orders
    .filter((order) => {
      if (!billedStatuses.has(order.status)) return false;
      const [orderYear, orderMonth] = order.createdAt.split("-").map(Number);
      return orderYear === year && orderMonth === month + 1;
    })
    .reduce((sum, order) => sum + orderTotal(order), 0);
}

/** Days left in the calendar month containing `reference` (defaults to today), including today. */
export function daysRemainingInMonth(reference: Date = new Date()): number {
  const lastDay = new Date(reference.getFullYear(), reference.getMonth() + 1, 0).getDate();
  return lastDay - reference.getDate() + 1;
}

/** Mon..Sun ISO dates for the week containing `reference` (defaults to today). */
export function currentWeekDates(reference: Date = new Date()): string[] {
  const start = new Date(reference);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return dateToISO(date);
  });
}

export type MonthGridDay = {
  iso: string;
  dayNumber: number;
  inCurrentMonth: boolean;
};

/**
 * Always 6 full Mon-start weeks (42 days), padded with the surrounding
 * months' days, so the calendar's height never jumps between months.
 */
export function monthGrid(reference: Date): MonthGridDay[] {
  const month = reference.getMonth();
  const firstOfMonth = new Date(reference.getFullYear(), month, 1);
  const start = new Date(firstOfMonth);
  start.setDate(1 - ((firstOfMonth.getDay() + 6) % 7));

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return {
      iso: dateToISO(date),
      dayNumber: date.getDate(),
      inCurrentMonth: date.getMonth() === month,
    };
  });
}

export function addMonths(reference: Date, delta: number): Date {
  return new Date(reference.getFullYear(), reference.getMonth() + delta, 1);
}

/** Spanish month/weekday names lowercase by locale convention — only the first letter is capitalized. */
function capitalizeFirst(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function formatMonthLabel(reference: Date): string {
  return capitalizeFirst(reference.toLocaleDateString("es-ES", { month: "long", year: "numeric" }));
}

export function formatWeekdayDate(isoDate: string): string {
  return capitalizeFirst(
    new Date(`${isoDate}T00:00:00`).toLocaleDateString("es-ES", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    }),
  );
}
