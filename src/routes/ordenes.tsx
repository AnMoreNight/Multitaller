import { createFileRoute } from "@tanstack/react-router";
import { Plus, Search } from "lucide-react";
import { useMemo, useState } from "react";

import { AppShell } from "@/components/taller/AppShell";
import { NewOrderWizard } from "@/components/taller/NewOrderWizard";
import { OrdersTable } from "@/components/taller/OrdersTable";
import { StatusBadge } from "@/components/taller/ui";
import { Button } from "@/components/ui/button";
import { useRequireAuth } from "@/lib/auth";
import { useData } from "@/lib/store";
import { getCustomer, getVehicle } from "@/lib/work-order";
import { orderStatusFlow, type OrderStatus } from "@/lib/taller-data";

export const Route = createFileRoute("/ordenes")({
  head: () => ({
    meta: [
      { title: "Órdenes de trabajo | Ferro Taller" },
      {
        name: "description",
        content: "Listado completo de órdenes de trabajo, estados y totales de Ferro Taller.",
      },
      { property: "og:title", content: "Órdenes de trabajo | Ferro Taller" },
      {
        property: "og:description",
        content: "Gestión de órdenes de trabajo del taller.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: OrdersPage,
});

const statusFilters = ["Todos", ...orderStatusFlow, "Garantía"] as const;

function OrdersPage() {
  const { user } = useRequireAuth();
  const { customers, vehicles, orders, updateOrder } = useData();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<(typeof statusFilters)[number]>("Todos");
  const [dialogOpen, setDialogOpen] = useState(false);

  const filteredOrders = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("es");
    return orders.filter((order) => {
      const matchesStatus = statusFilter === "Todos" || order.status === statusFilter;
      if (!matchesStatus) return false;
      if (!query) return true;
      const customer = getCustomer(customers, order.customerId);
      const vehicle = getVehicle(vehicles, order.vehicleId);
      const haystack = [
        order.id,
        order.reason,
        customer?.name,
        vehicle?.plate,
        vehicle?.vin,
        vehicle?.make,
        vehicle?.model,
      ]
        .join(" ")
        .toLocaleLowerCase("es");
      return haystack.includes(query);
    });
  }, [orders, customers, vehicles, search, statusFilter]);

  if (!user) return null;

  const totals = new Map<OrderStatus, number>();
  orders.forEach((order) => totals.set(order.status, (totals.get(order.status) ?? 0) + 1));

  return (
    <AppShell
      title="Órdenes de trabajo"
      subtitle="Seguimiento completo de cada ingreso"
      actions={
        user.role === "admin" ? (
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="size-4" />
            <span className="hidden sm:inline">Nueva orden</span>
          </Button>
        ) : null
      }
    >
      <section className="grid grid-cols-2 gap-3 xl:grid-cols-5" aria-label="Resumen por estado">
        {orderStatusFlow.map((status) => (
          <article key={status} className="rounded-lg border border-border bg-card/90 p-4">
            <StatusBadge status={status} />
            <p className="mt-2 font-mono text-2xl font-semibold sm:text-3xl">
              {totals.get(status) ?? 0}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">órdenes en este estado</p>
          </article>
        ))}
      </section>

      <section className="rounded-lg border border-border bg-card/90 p-4 sm:p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar orden, cliente o matrícula"
              className="h-9 w-full rounded-md border border-border bg-background pl-9 pr-3 text-sm outline-none focus:border-primary"
            />
          </div>
          <div className="flex flex-wrap gap-1 rounded-md border border-border bg-background p-1">
            {statusFilters.map((filter) => (
              <Button
                key={filter}
                size="sm"
                variant={statusFilter === filter ? "secondary" : "ghost"}
                onClick={() => setStatusFilter(filter)}
              >
                {filter}
              </Button>
            ))}
          </div>
        </div>
        <OrdersTable
          orders={filteredOrders}
          customers={customers}
          vehicles={vehicles}
          showTotals={user.role === "admin"}
          canEditStatus={user.canChangeOrderStatus}
          onStatusChange={(orderId, status) =>
            updateOrder(orderId, (order) => ({ ...order, status }))
          }
          emptyMessage="No hay órdenes que coincidan con los filtros."
        />
      </section>

      <NewOrderWizard open={dialogOpen} onClose={() => setDialogOpen(false)} />
    </AppShell>
  );
}
