import { useNavigate } from "@tanstack/react-router";
import { CalendarOff, CarFront, ChevronLeft, ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";

import { StatusBadge } from "@/components/taller/ui";
import { cn } from "@/lib/utils";
import {
  orderStatusFlow,
  statusAccent,
  statusDot,
  type OrderStatus,
  type Vehicle,
  type WorkOrder,
} from "@/lib/taller-data";
import {
  addMonths,
  formatMonthLabel,
  formatWeekdayDate,
  monthGrid,
  todayISO,
  vehicleLabel,
} from "@/lib/work-order";

const weekdayLetters = ["L", "M", "M", "J", "V", "S", "D"];
const summaryStatuses: OrderStatus[] = [...orderStatusFlow, "Garantía"];

export function AgendaCalendar({ orders, vehicles }: { orders: WorkOrder[]; vehicles: Vehicle[] }) {
  const navigate = useNavigate();
  const todayIso = todayISO();
  const [viewMonth, setViewMonth] = useState(() => new Date());
  const [selectedIso, setSelectedIso] = useState(todayIso);

  const ordersByDay = useMemo(() => {
    const map = new Map<string, WorkOrder[]>();
    for (const order of orders) {
      const list = map.get(order.createdAt);
      if (list) list.push(order);
      else map.set(order.createdAt, [order]);
    }
    return map;
  }, [orders]);

  const grid = useMemo(() => monthGrid(viewMonth), [viewMonth]);
  const dayOrders = ordersByDay.get(selectedIso) ?? [];
  const summary = summaryStatuses
    .map((status) => ({
      status,
      count: dayOrders.filter((order) => order.status === status).length,
    }))
    .filter((row) => row.count > 0);

  return (
    <section className="rounded-lg border border-border bg-card/90 p-4 sm:p-5">
      <div className="mb-4">
        <h2 className="font-display text-2xl font-semibold">Agenda</h2>
        <p className="text-xs text-muted-foreground">Calendario combinado con el resumen del día</p>
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
              const hasOrders = ordersByDay.has(day.iso);
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
                  {hasOrders && !isSelected && (
                    <span className="absolute bottom-1 size-1 rounded-full bg-primary" />
                  )}
                </button>
              );
            })}
          </div>

          <div className="mt-4 border-t border-border pt-3">
            <p className="mb-2 font-mono text-[9px] uppercase text-muted-foreground">
              Resumen del día
            </p>
            <div className="space-y-1.5">
              <p className="flex items-center gap-2 text-xs">
                <span className="size-2 rounded-full bg-foreground/60" />
                <span>
                  <span className="font-semibold">{dayOrders.length}</span>{" "}
                  <span className="text-muted-foreground">
                    {dayOrders.length === 1 ? "orden programada" : "órdenes programadas"}
                  </span>
                </span>
              </p>
              {summary.map((row) => (
                <p key={row.status} className="flex items-center gap-2 text-xs">
                  <span className={cn("size-2 rounded-full", statusDot[row.status])} />
                  <span>
                    <span className="font-semibold">{row.count}</span>{" "}
                    <span className="text-muted-foreground">{row.status}</span>
                  </span>
                </p>
              ))}
            </div>
          </div>
        </div>

        <div>
          <p className="mb-3 font-display text-lg font-semibold">
            {formatWeekdayDate(selectedIso)}
          </p>
          <div className="space-y-2">
            {dayOrders.map((order) => {
              const vehicle = vehicles.find((candidate) => candidate.id === order.vehicleId);
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
                  className={cn(
                    "flex w-full items-center gap-3 rounded-md border-l-2 bg-background/60 p-3 text-left transition-all hover:-translate-y-0.5 hover:bg-accent/60 hover:shadow-md",
                    statusAccent[order.status],
                  )}
                >
                  <div className="grid size-10 shrink-0 place-items-center rounded-md bg-primary/10 text-primary ring-1 ring-primary/30">
                    <CarFront className="size-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-mono text-[10px] text-muted-foreground">{order.id}</p>
                      <StatusBadge status={order.status} />
                    </div>
                    <p className="truncate text-sm font-medium">
                      {vehicle ? vehicleLabel(vehicle) : "Vehículo"}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">{order.reason}</p>
                  </div>
                </button>
              );
            })}
            {dayOrders.length === 0 && (
              <div className="flex flex-col items-center justify-center gap-2 rounded-md border border-dashed border-border py-12 text-muted-foreground/70">
                <CalendarOff className="size-5" />
                <p className="text-sm">Sin órdenes este día.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
