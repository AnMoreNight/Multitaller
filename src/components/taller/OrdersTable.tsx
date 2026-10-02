import { Link } from "@tanstack/react-router";

import { StatusBadge, StatusSelect } from "@/components/taller/ui";
import {
  formatMoney,
  type Customer,
  type OrderStatus,
  type Vehicle,
  type WorkOrder,
} from "@/lib/taller-data";
import { getCustomer, getVehicle, orderTotal, vehicleLabel } from "@/lib/work-order";

export function OrdersTable({
  orders,
  customers,
  vehicles,
  showTotals = true,
  canEditStatus = false,
  onStatusChange,
  emptyMessage = "No hay órdenes que coincidan con la búsqueda.",
}: {
  orders: WorkOrder[];
  customers: Customer[];
  vehicles: Vehicle[];
  showTotals?: boolean;
  canEditStatus?: boolean;
  onStatusChange?: (orderId: string, status: OrderStatus) => void;
  emptyMessage?: string;
}) {
  if (orders.length === 0) {
    return <div className="py-10 text-center text-sm text-muted-foreground">{emptyMessage}</div>;
  }

  return (
    <div>
      {/* Card layout below sm: a wide table forces horizontal scrolling on a
          phone, which is easy to miss entirely — stacked cards show every
          field without scrolling sideways. */}
      <div className="grid gap-2 sm:hidden">
        {orders.map((order) => {
          const customer = getCustomer(customers, order.customerId);
          const vehicle = getVehicle(vehicles, order.vehicleId);
          return (
            <article key={order.id} className="rounded-lg border border-border bg-card/90 p-3">
              <div className="flex items-start justify-between gap-2">
                <Link
                  to="/ordenes/$orderId"
                  params={{ orderId: order.id }}
                  className="font-mono text-sm font-semibold hover:text-primary"
                >
                  {order.id}
                </Link>
                {canEditStatus && onStatusChange ? (
                  <StatusSelect
                    status={order.status}
                    onChange={(status) => onStatusChange(order.id, status)}
                  />
                ) : (
                  <StatusBadge status={order.status} />
                )}
              </div>
              <p className="mt-2 text-sm font-medium">{vehicle ? vehicleLabel(vehicle) : "—"}</p>
              <p className="font-mono text-[10px] text-muted-foreground">
                {vehicle?.plate ?? vehicle?.vin ?? ""}
              </p>
              <p className="mt-1.5 text-xs text-muted-foreground">{order.reason}</p>
              <div className="mt-2 flex items-center justify-between border-t border-border pt-2 text-xs">
                <span className="text-muted-foreground">{customer?.name ?? "—"}</span>
                {showTotals && (
                  <span className="font-mono font-semibold">{formatMoney(orderTotal(order))}</span>
                )}
              </div>
            </article>
          );
        })}
      </div>

      <div className="hidden overflow-x-auto sm:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border font-mono text-[9px] uppercase text-muted-foreground">
              <th className="py-2 pr-3 text-left font-medium">Orden</th>
              <th className="py-2 pr-3 text-left font-medium">Vehículo</th>
              <th className="py-2 pr-3 text-left font-medium">Cliente</th>
              <th className="py-2 pr-3 text-left font-medium">Motivo</th>
              <th className="py-2 pr-3 text-left font-medium">Estado</th>
              {showTotals && <th className="py-2 text-right font-medium">Total</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {orders.map((order) => {
              const customer = getCustomer(customers, order.customerId);
              const vehicle = getVehicle(vehicles, order.vehicleId);
              return (
                <tr key={order.id} className="transition-colors hover:bg-accent/60">
                  <td className="py-3 pr-3 font-mono">
                    <Link
                      to="/ordenes/$orderId"
                      params={{ orderId: order.id }}
                      className="hover:text-primary"
                    >
                      {order.id}
                    </Link>
                  </td>
                  <td className="py-3 pr-3">
                    <p>{vehicle ? vehicleLabel(vehicle) : "—"}</p>
                    <p className="font-mono text-[10px] text-muted-foreground">
                      {vehicle?.plate ?? vehicle?.vin ?? ""}
                    </p>
                  </td>
                  <td className="py-3 pr-3 text-muted-foreground">{customer?.name ?? "—"}</td>
                  <td className="py-3 pr-3 text-muted-foreground">{order.reason}</td>
                  <td className="py-3 pr-3">
                    {canEditStatus && onStatusChange ? (
                      <StatusSelect
                        status={order.status}
                        onChange={(status) => onStatusChange(order.id, status)}
                      />
                    ) : (
                      <StatusBadge status={order.status} />
                    )}
                  </td>
                  {showTotals && (
                    <td className="py-3 text-right font-mono">{formatMoney(orderTotal(order))}</td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
