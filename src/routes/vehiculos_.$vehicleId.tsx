import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, CarFront } from "lucide-react";
import { useId } from "react";

import { AppShell } from "@/components/taller/AppShell";
import { StatusBadge } from "@/components/taller/ui";
import { useRequireAuth } from "@/lib/auth";
import { useData } from "@/lib/store";
import { formatMoney } from "@/lib/taller-data";
import {
  formatDate,
  getCustomer,
  getVehicle,
  ordersForVehicle,
  orderTotal,
  vehicleLabel,
} from "@/lib/work-order";

export const Route = createFileRoute("/vehiculos_/$vehicleId")({
  component: VehicleDetailPage,
});

function VehicleDetailPage() {
  const { user } = useRequireAuth();
  const { vehicleId } = Route.useParams();
  const { customers, vehicles, orders, isLoading } = useData();
  const vinLabelId = useId();
  const colorLabelId = useId();
  const yearLabelId = useId();

  if (!user) return null;

  const vehicle = getVehicle(vehicles, vehicleId);
  if (!vehicle) {
    if (isLoading) {
      return (
        <div className="grid min-h-screen place-items-center bg-background text-sm text-muted-foreground">
          Cargando…
        </div>
      );
    }
    return (
      <AppShell title="Vehículo no encontrado" subtitle="">
        <div className="rounded-lg border border-border bg-card/90 p-10 text-center text-sm text-muted-foreground">
          Este vehículo ya no existe.{" "}
          <Link to="/vehiculos" className="text-primary hover:underline">
            Volver al listado
          </Link>
        </div>
      </AppShell>
    );
  }

  const customer = getCustomer(customers, vehicle.customerId);
  const history = ordersForVehicle(orders, vehicle.id);

  return (
    <AppShell
      title={vehicleLabel(vehicle)}
      subtitle={vehicle.plate ?? vehicle.vin ?? "Sin matrícula"}
    >
      <Link
        to="/vehiculos"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Volver a vehículos
      </Link>

      <section className="grid gap-3 lg:grid-cols-3">
        <article className="rounded-lg border border-border bg-card/90 p-4 lg:col-span-2">
          <div className="flex items-center gap-3">
            <div className="grid size-11 place-items-center rounded-md bg-primary/10 text-primary ring-1 ring-primary/30">
              <CarFront className="size-5" />
            </div>
            <div>
              <p className="font-display text-xl font-semibold">{vehicleLabel(vehicle)}</p>
              <p className="font-mono text-xs text-muted-foreground">
                {vehicle.plate ?? "Sin matrícula"}
              </p>
            </div>
          </div>
          <dl className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
            <div>
              <dt id={vinLabelId} className="text-xs text-muted-foreground">
                VIN
              </dt>
              <dd aria-labelledby={vinLabelId} className="font-mono">
                {vehicle.vin ?? "—"}
              </dd>
            </div>
            <div>
              <dt id={colorLabelId} className="text-xs text-muted-foreground">
                Color
              </dt>
              <dd aria-labelledby={colorLabelId}>{vehicle.color ?? "—"}</dd>
            </div>
            <div>
              <dt id={yearLabelId} className="text-xs text-muted-foreground">
                Año
              </dt>
              <dd aria-labelledby={yearLabelId}>{`${vehicle.year}`}</dd>
            </div>
          </dl>
          {vehicle.notes && (
            <p className="mt-4 rounded-md border border-border bg-background p-3 text-sm text-muted-foreground">
              {vehicle.notes}
            </p>
          )}
        </article>

        <article className="rounded-lg border border-border bg-card/90 p-4">
          <p className="font-mono text-[9px] uppercase text-muted-foreground">Propietario</p>
          {customer ? (
            <>
              <Link
                to="/clientes/$customerId"
                params={{ customerId: customer.id }}
                className="mt-1 block font-semibold hover:text-primary"
              >
                {customer.name}
              </Link>
              <p className="mt-1 text-sm text-muted-foreground">{customer.phone}</p>
            </>
          ) : (
            <p className="mt-1 text-sm text-muted-foreground">Sin propietario registrado</p>
          )}
        </article>
      </section>

      <section className="rounded-lg border border-border bg-card/90 p-4 sm:p-5">
        <h2 className="mb-4 font-display text-2xl font-semibold">Historial de reparaciones</h2>
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
                {user.role === "admin" && (
                  <span className="font-mono text-sm">{formatMoney(orderTotal(order))}</span>
                )}
                <StatusBadge status={order.status} />
              </div>
            </Link>
          ))}
          {history.length === 0 && (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Este vehículo aún no tiene órdenes registradas.
            </p>
          )}
        </div>
      </section>
    </AppShell>
  );
}
