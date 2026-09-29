import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";

import { AppShell, RestrictedAccess } from "@/components/taller/AppShell";
import { RevenueCalendar } from "@/components/taller/RevenueCalendar";
import { useRequireAuth } from "@/lib/auth";
import { useData } from "@/lib/store";
import { cn } from "@/lib/utils";
import { formatMoney } from "@/lib/taller-data";
import {
  currentWeekDates,
  laborTotal,
  orderPartsMargin,
  partsCostTotal,
  orderTotal,
} from "@/lib/work-order";

export const Route = createFileRoute("/reportes")({
  head: () => ({
    meta: [
      { title: "Reportes | Ferro Taller" },
      {
        name: "description",
        content:
          "Facturación semanal, órdenes completadas y servicios más rentables de Ferro Taller.",
      },
      { property: "og:title", content: "Reportes | Ferro Taller" },
      {
        property: "og:description",
        content: "Resultados económicos del taller.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ReportsPage,
});

function ReportsPage() {
  const { user } = useRequireAuth();
  const { orders, vehicles, customers } = useData();

  const stats = useMemo(() => {
    const weekDates = currentWeekDates();
    const billedStatuses = new Set(["Completado", "Entregado"]);
    const billedOrders = orders.filter((order) => billedStatuses.has(order.status));

    const weekTotal = orders
      .filter((order) => weekDates.includes(order.createdAt))
      .reduce((sum, order) => sum + orderTotal(order), 0);
    const completedRevenue = billedOrders.reduce((sum, order) => sum + orderTotal(order), 0);
    const partsCost = billedOrders.reduce((sum, order) => sum + partsCostTotal(order), 0);
    const grossProfit = billedOrders.reduce(
      (sum, order) => sum + orderPartsMargin(order) + laborTotal(order),
      0,
    );
    const averageOrder = billedOrders.length ? completedRevenue / billedOrders.length : 0;

    const laborByService = new Map<string, number>();
    orders.forEach((order) =>
      order.labor.forEach((item) =>
        laborByService.set(
          item.description,
          (laborByService.get(item.description) ?? 0) + item.price,
        ),
      ),
    );
    const topServices = [...laborByService.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4);

    return {
      weekTotal,
      completedRevenue,
      partsCost,
      grossProfit,
      averageOrder,
      completedCount: billedOrders.length,
      topServices,
    };
  }, [orders]);

  if (!user) return null;
  if (user.role !== "admin") {
    return (
      <AppShell title="Reportes" subtitle="Acceso restringido">
        <RestrictedAccess />
      </AppShell>
    );
  }

  const maxService = Math.max(...stats.topServices.map(([, amount]) => amount), 1);

  return (
    <AppShell title="Reportes" subtitle="Facturación y rendimiento básico del taller">
      <section className="grid grid-cols-2 gap-3 xl:grid-cols-3" aria-label="Indicadores">
        {[
          [
            "Facturado esta semana",
            formatMoney(stats.weekTotal),
            "labor + repuestos + diagnóstico + tarifa",
            "text-foreground",
          ],
          [
            "Cobrado en órdenes completadas",
            formatMoney(stats.completedRevenue),
            `${stats.completedCount} órdenes completadas o entregadas`,
            "text-status-success",
          ],
          [
            "Ticket medio",
            formatMoney(stats.averageOrder),
            "por orden completada o entregada",
            "text-foreground",
          ],
          [
            "Costo en repuestos",
            formatMoney(stats.partsCost),
            "precio de compra al taller",
            "text-foreground",
          ],
          [
            "Margen bruto estimado",
            formatMoney(stats.grossProfit),
            "mano de obra + margen de repuestos",
            "text-status-success",
          ],
        ].map(([label, value, note, color]) => (
          <article key={label} className="rounded-lg border border-border bg-card/90 p-4">
            <p className="font-mono text-[9px] uppercase text-muted-foreground">{label}</p>
            <p className={cn("mt-1 font-mono text-2xl font-semibold sm:text-3xl", color)}>
              {value}
            </p>
            <p className="mt-1 truncate text-xs text-muted-foreground">{note}</p>
          </article>
        ))}
      </section>

      <p className="text-xs text-muted-foreground">
        No incluye gastos generales del taller (renta, salarios, servicios) — solo lo que se puede
        calcular a partir de las órdenes de trabajo.
      </p>

      <RevenueCalendar orders={orders} vehicles={vehicles} customers={customers} />

      <section className="rounded-lg border border-border bg-card/90 p-4 sm:p-5">
        <h2 className="mb-4 font-display text-2xl font-semibold">
          Servicios de mano de obra más facturados
        </h2>
        <div className="space-y-3">
          {stats.topServices.map(([service, amount]) => (
            <div key={service}>
              <div className="mb-1 flex justify-between text-sm">
                <span>{service}</span>
                <span className="font-mono">{formatMoney(amount)}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${(amount / maxService) * 100}%` }}
                />
              </div>
            </div>
          ))}
          {stats.topServices.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Todavía no hay mano de obra registrada en ninguna orden.
            </p>
          )}
        </div>
      </section>
    </AppShell>
  );
}
