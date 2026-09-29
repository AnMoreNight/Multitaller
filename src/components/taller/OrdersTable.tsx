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
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[760px] text-sm">
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
      {orders.length === 0 && (
        <div className="py-10 text-center text-sm text-muted-foreground">{emptyMessage}</div>
      )}
    </div>
  );
}
