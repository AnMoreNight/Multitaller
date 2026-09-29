import { useNavigate } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight, Receipt } from "lucide-react";
import { useMemo, useState } from "react";

import { cn } from "@/lib/utils";
import {
  formatMoney,
  type Customer,
  type OrderStatus,
  type Vehicle,
  type WorkOrder,
} from "@/lib/taller-data";
import {
  addMonths,
  formatMonthLabel,
  formatWeekdayDate,
  getCustomer,
  getVehicle,
  monthGrid,
  orderTotal,
  todayISO,
  vehicleLabel,
} from "@/lib/work-order";

const weekdayLetters = ["L", "M", "M", "J", "V", "S", "D"];
const billedStatuses = new Set<OrderStatus>(["Completado", "Entregado"]);

export function RevenueCalendar({
  orders,
  vehicles,
  customers,
}: {
  orders: WorkOrder[];
  vehicles: Vehicle[];
  customers: Customer[];
}) {
  const navigate = useNavigate();
  const todayIso = todayISO();
  const [viewMonth, setViewMonth] = useState(() => new Date());
  const [selectedIso, setSelectedIso] = useState(todayIso);

  const billedByDay = useMemo(() => {
    const map = new Map<string, WorkOrder[]>();
    for (const order of orders) {
      if (!billedStatuses.has(order.status)) continue;
      const list = map.get(order.createdAt);
      if (list) list.push(order);
      else map.set(order.createdAt, [order]);
    }
    return map;
  }, [orders]);

  const grid = useMemo(() => monthGrid(viewMonth), [viewMonth]);
  const dayOrders = billedByDay.get(selectedIso) ?? [];
  const dayRevenue = dayOrders.reduce((sum, order) => sum + orderTotal(order), 0);

  return (
    <section className="rounded-lg border border-border bg-card/90 p-4 sm:p-5">
      <div className="mb-4">
        <h2 className="font-display text-2xl font-semibold">Calendario de facturación</h2>
        <p className="text-xs text-muted-foreground">Selecciona un día para ver qué se facturó</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[272px_1fr]">
        <div className="rounded-lg border border-border bg-background/40 p-3">
          <div className="mb-3 flex items-center justify-between">
            <button
              type="button"
              aria-label="Mes anterior"
              onClick={() => setViewMonth((month) => addMonths(month, -1))}
              className="grid size-7 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <ChevronLeft className="size-4" />
            </button>
            <p className="font-display text-sm font-semibold">{formatMonthLabel(viewMonth)}</p>
            <button
              type="button"
              aria-label="Mes siguiente"
              onClick={() => setViewMonth((month) => addMonths(month, 1))}
              className="grid size-7 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-y-1 text-center">
            {weekdayLetters.map((letter, index) => (
              <span
                key={`${letter}-${index}`}
                className="font-mono text-[9px] text-muted-foreground"
              >
                {letter}
              </span>
            ))}
            {grid.map((day) => {
              const isSelected = day.iso === selectedIso;
              const isToday = day.iso === todayIso;
              const hasRevenue = billedByDay.has(day.iso);
              return (
                <button
                  key={day.iso}
                  type="button"
                  onClick={() => setSelectedIso(day.iso)}
                  className={cn(
                    "relative mx-auto grid size-8 place-items-center rounded-full text-xs transition-colors",
                    !day.inCurrentMonth && "text-muted-foreground/30",
                    day.inCurrentMonth && !isSelected && "text-foreground hover:bg-accent",
                    isSelected && "bg-primary font-semibold text-primary-foreground",
                    isToday && !isSelected && "text-primary ring-1 ring-primary/40",
                  )}
                >
                  {day.dayNumber}
                  {hasRevenue && !isSelected && (
                    <span className="absolute bottom-1 size-1 rounded-full bg-status-success" />
                  )}
                </button>
              );
            })}
          </div>

          <div className="mt-4 border-t border-border pt-3">
            <p className="mb-2 font-mono text-[9px] uppercase text-muted-foreground">
              Resumen del día
            </p>
            <p className="font-mono text-xl font-semibold text-status-success">
              {formatMoney(dayRevenue)}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {dayOrders.length === 1
                ? "1 orden completada o entregada"
                : `${dayOrders.length} órdenes completadas o entregadas`}
            </p>
          </div>
        </div>

        <div>
          <p className="mb-3 font-display text-lg font-semibold">
            {formatWeekdayDate(selectedIso)}
          </p>
          <div className="space-y-2">
            {dayOrders.map((order) => {
              const vehicle = getVehicle(vehicles, order.vehicleId);
              const customer = getCustomer(customers, order.customerId);
              return (
                <button
                  key={order.id}
                  type="button"
                  onClick={() =>
                    navigate({
                      to: "/ordenes/$orderId",
                      params: { orderId: order.id },
                    })
                  }
                  className="flex w-full items-center gap-3 rounded-md border-l-2 border-l-status-success bg-background/60 p-3 text-left transition-all hover:-translate-y-0.5 hover:bg-accent/60 hover:shadow-md"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-mono text-[10px] text-muted-foreground">{order.id}</p>
                    <p className="truncate text-sm font-medium">
                      {vehicle ? vehicleLabel(vehicle) : "Vehículo"} · {customer?.name ?? "Cliente"}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">{order.reason}</p>
                  </div>
                  <p className="shrink-0 font-mono text-sm font-semibold">
                    {formatMoney(orderTotal(order))}
                  </p>
                </button>
              );
            })}
            {dayOrders.length === 0 && (
              <div className="flex flex-col items-center justify-center gap-2 rounded-md border border-dashed border-border py-12 text-muted-foreground/70">
                <Receipt className="size-5" />
                <p className="text-sm">Nada facturado este día.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
