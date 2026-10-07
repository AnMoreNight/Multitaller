import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, CarFront, Mail, Phone } from "lucide-react";

import { AppShell, RestrictedAccess } from "@/components/taller/AppShell";
import { StatCard, StatusBadge } from "@/components/taller/ui";
import { useRequireAuth } from "@/lib/auth";
import { useData } from "@/lib/store";
import { formatMoney } from "@/lib/taller-data";
import {
  formatDate,
  getCustomer,
  ordersForCustomer,
  orderTotal,
  vehiclesForCustomer,
} from "@/lib/work-order";

export const Route = createFileRoute("/clientes_/$customerId")({
  component: CustomerDetailPage,
});

function CustomerDetailPage() {
  const { user } = useRequireAuth();
  const { customerId } = Route.useParams();
  const { customers, vehicles, orders, isLoading } = useData();

  if (!user) return null;
  if (user.role !== "admin") {
    return (
      <AppShell title="Cliente" subtitle="Acceso restringido">
        <RestrictedAccess />
      </AppShell>
    );
  }

  const customer = getCustomer(customers, customerId);
  if (!customer) {
    if (isLoading) {
      return (
        <div className="grid min-h-screen place-items-center bg-background text-sm text-muted-foreground">
          Cargando…
        </div>
      );
    }
    return (
      <AppShell title="Cliente no encontrado" subtitle="">
        <div className="rounded-lg border border-border bg-card/90 p-10 text-center text-sm text-muted-foreground">
          Este cliente ya no existe.{" "}
          <Link to="/clientes" className="text-primary hover:underline">
            Volver al listado
          </Link>
        </div>
      </AppShell>
    );
  }

  const customerVehicles = vehiclesForCustomer(vehicles, customer.id);
  const history = ordersForCustomer(orders, customer.id);
  const totalSpent = history.reduce((sum, order) => sum + orderTotal(order), 0);

  return (
    <AppShell title={customer.name} subtitle={customer.phone}>
      <Link
        to="/clientes"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Volver a clientes
      </Link>

      <section className="grid gap-3 lg:grid-cols-3">
        <article className="rounded-lg border border-border bg-card/90 p-4 lg:col-span-2">
          <p className="font-display text-xl font-semibold">{customer.name}</p>
          <div className="mt-3 flex flex-wrap gap-4 text-sm text-muted-foreground">
            <p className="flex items-center gap-1.5">
              <Phone className="size-4" />
              {customer.phone}
            </p>
            {customer.email && (
              <p className="flex items-center gap-1.5">
                <Mail className="size-4" />
                {customer.email}
              </p>
            )}
          </div>
          {customer.notes && (
            <p className="mt-4 rounded-md border border-border bg-background p-3 text-sm text-muted-foreground">
              {customer.notes}
            </p>
          )}
        </article>
        <StatCard
          label="Total facturado"
          value={formatMoney(totalSpent)}
          description={`${history.length} ${history.length === 1 ? "orden" : "órdenes"} en total`}
        />
      </section>

      <section className="rounded-lg border border-border bg-card/90 p-4 sm:p-5">
        <h2 className="mb-4 font-display text-2xl font-semibold">Vehículos</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {customerVehicles.map((vehicle) => (
            <Link
              key={vehicle.id}
              to="/vehiculos/$vehicleId"
              params={{ vehicleId: vehicle.id }}
              className="flex items-center gap-3 rounded-md border border-border bg-background/60 p-3 transition-colors hover:border-primary/50"
            >
              <div className="grid size-9 place-items-center rounded-md bg-primary/10 text-primary ring-1 ring-primary/30">
                <CarFront className="size-4" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">
                  {vehicle.make} {vehicle.model} {vehicle.year}
                </p>
                <p className="font-mono text-[10px] text-muted-foreground">
                  {vehicle.plate ?? vehicle.vin ?? "Sin matrícula"}
                </p>
              </div>
            </Link>
          ))}
          {customerVehicles.length === 0 && (
            <p className="py-4 text-sm text-muted-foreground">
              Este cliente aún no tiene vehículos registrados.
            </p>
          )}
        </div>
      </section>

      <section className="rounded-lg border border-border bg-card/90 p-4 sm:p-5">
        <h2 className="mb-4 font-display text-2xl font-semibold">Historial de órdenes</h2>
        <div className="space-y-2">
          {history.map((order) => (
            <Link
              key={order.id}
              to="/ordenes/$orderId"
              params={{ orderId: order.id }}
              className="flex items-center justify-between gap-3 rounded-md border border-border bg-background/60 p-3 transition-colors hover:border-primary/50"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">
                  {formatDate(order.createdAt)} — {order.reason}
                </p>
                <p className="font-mono text-[10px] text-muted-foreground">{order.id}</p>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <span className="font-mono text-sm">{formatMoney(orderTotal(order))}</span>
                <StatusBadge status={order.status} />
              </div>
            </Link>
          ))}
          {history.length === 0 && (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Este cliente aún no tiene órdenes registradas.
            </p>
          )}
        </div>
      </section>
    </AppShell>
  );
}
