import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, CarFront, Plus, ShieldCheck, Trash2, User as UserIcon } from "lucide-react";

import { AppShell } from "@/components/taller/AppShell";
import { CheckboxRow, Field, StatusBadge, StatusSelect } from "@/components/taller/ui";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useRequireAuth } from "@/lib/auth";
import { useData } from "@/lib/store";
import { cn } from "@/lib/utils";
import { formatMoney, type LaborItem, type PartLine, type WorkOrder } from "@/lib/taller-data";
import {
  formatDate,
  getCustomer,
  getVehicle,
  laborTotal,
  materialsFee,
  nextOrderId,
  ordersForVehicle,
  orderTotal,
  partsCostTotal,
  partsCustomerTotal,
  subtotal,
  todayISO,
  vehicleLabel,
} from "@/lib/work-order";

export const Route = createFileRoute("/ordenes_/$orderId")({
  component: OrderDetailPage,
});

function OrderDetailPage() {
  const { user } = useRequireAuth();
  const { orderId } = Route.useParams();
  const navigate = useNavigate();
  const { customers, vehicles, orders, updateOrder, addOrder, partsCatalog } = useData();

  if (!user) return null;

  const order = orders.find((candidate) => candidate.id === orderId);
  if (!order) {
    return (
      <AppShell title="Orden no encontrada" subtitle="">
        <div className="rounded-lg border border-border bg-card/90 p-10 text-center text-sm text-muted-foreground">
          Esta orden ya no existe.{" "}
          <Link to="/ordenes" className="text-primary hover:underline">
            Volver al listado
          </Link>
        </div>
      </AppShell>
    );
  }

  const customer = getCustomer(customers, order.customerId);
  const vehicle = getVehicle(vehicles, order.vehicleId);
  const originalOrder = order.warrantyOf
    ? orders.find((candidate) => candidate.id === order.warrantyOf)
    : undefined;
  const history = vehicle
    ? ordersForVehicle(orders, vehicle.id).filter((candidate) => candidate.id !== order.id)
    : [];

  const canSeeCosts = user.role === "admin";
  const canEdit = user.role === "admin";
  const canEditStatus = canEdit || user.canChangeOrderStatus;

  function patch(updater: (draft: WorkOrder) => WorkOrder) {
    updateOrder(order!.id, updater);
  }

  function addLabor() {
    patch((draft) => ({
      ...draft,
      labor: [...draft.labor, { id: crypto.randomUUID(), description: "", price: 0 }],
    }));
  }
  function updateLaborItem(id: string, changes: Partial<LaborItem>) {
    patch((draft) => ({
      ...draft,
      labor: draft.labor.map((item) => (item.id === id ? { ...item, ...changes } : item)),
    }));
  }
  function removeLabor(id: string) {
    patch((draft) => ({
      ...draft,
      labor: draft.labor.filter((item) => item.id !== id),
    }));
  }

  function addPartLine() {
    patch((draft) => ({
      ...draft,
      parts: [
        ...draft.parts,
        {
          id: crypto.randomUUID(),
          name: "",
          workshopCost: 0,
          customerPrice: 0,
          warranty: false,
          qty: 1,
        },
      ],
    }));
  }
  function addPartFromCatalog(catalogId: string) {
    const catalogPart = partsCatalog.find((part) => part.id === catalogId);
    if (!catalogPart) return;
    patch((draft) => ({
      ...draft,
      parts: [
        ...draft.parts,
        {
          id: crypto.randomUUID(),
          partId: catalogPart.id,
          name: catalogPart.name,
          workshopCost: catalogPart.workshopCost,
          customerPrice: catalogPart.customerPrice,
          warranty: catalogPart.warranty,
          qty: 1,
        },
      ],
    }));
  }
  function updatePartLine(id: string, changes: Partial<PartLine>) {
    patch((draft) => ({
      ...draft,
      parts: draft.parts.map((item) => (item.id === id ? { ...item, ...changes } : item)),
    }));
  }
  function removePartLine(id: string) {
    patch((draft) => ({
      ...draft,
      parts: draft.parts.filter((item) => item.id !== id),
    }));
  }

  function createWarrantyVisit() {
    const newId = nextOrderId(orders);
    addOrder({
      id: newId,
      customerId: order!.customerId,
      vehicleId: order!.vehicleId,
      createdAt: todayISO(),
      reason: `Retorno por garantía de ${order!.id}`,
      warningLights: [],
      status: "Garantía",
      warrantyOf: order!.id,
      diagnosis: { fee: 0, waived: true },
      labor: [],
      parts: [],
      applyMaterialsFee: false,
    });
    navigate({ to: "/ordenes/$orderId", params: { orderId: newId } });
  }

  const canOfferWarranty = order.status === "Completado" || order.status === "Entregado";

  return (
    <AppShell title={order.id} subtitle={formatDate(order.createdAt)}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          to="/ordenes"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Volver a órdenes
        </Link>
        {canEdit && canOfferWarranty && (
          <Button variant="secondary" onClick={createWarrantyVisit}>
            <ShieldCheck className="size-4" />
            Crear visita de garantía
          </Button>
        )}
      </div>

      {originalOrder && (
        <div className="rounded-lg border border-status-warranty/40 bg-status-warranty/10 p-4 text-sm">
          Esta orden es una <strong className="text-status-warranty">visita de garantía</strong> de{" "}
          <Link
            to="/ordenes/$orderId"
            params={{ orderId: originalOrder.id }}
            className="font-mono text-status-warranty hover:underline"
          >
            {originalOrder.id}
          </Link>
          .
        </div>
      )}

      <section className="grid gap-3 lg:grid-cols-3">
        <article className="rounded-lg border border-border bg-card/90 p-4">
          <p className="font-mono text-[9px] uppercase text-muted-foreground">Estado</p>
          <div className="mt-2">
            {canEditStatus ? (
              <StatusSelect
                status={order.status}
                onChange={(status) => patch((draft) => ({ ...draft, status }))}
              />
            ) : (
              <StatusBadge status={order.status} />
            )}
          </div>
        </article>

        <article className="rounded-lg border border-border bg-card/90 p-4">
          <p className="font-mono text-[9px] uppercase text-muted-foreground">Cliente</p>
          {customer ? (
            <Link
              to="/clientes/$customerId"
              params={{ customerId: customer.id }}
              className="mt-2 flex items-center gap-2 hover:text-primary"
            >
              <UserIcon className="size-4" />
              <span className="font-semibold">{customer.name}</span>
            </Link>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">—</p>
          )}
        </article>

        <article className="rounded-lg border border-border bg-card/90 p-4">
          <p className="font-mono text-[9px] uppercase text-muted-foreground">Vehículo</p>
          {vehicle ? (
            <Link
              to="/vehiculos/$vehicleId"
              params={{ vehicleId: vehicle.id }}
              className="mt-2 flex items-center gap-2 hover:text-primary"
            >
              <CarFront className="size-4" />
              <span className="font-semibold">{vehicleLabel(vehicle)}</span>
            </Link>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">—</p>
          )}
        </article>
      </section>

      <section className="rounded-lg border border-border bg-card/90 p-4 sm:p-5">
        <h2 className="mb-3 font-display text-2xl font-semibold">Ingreso</h2>
        <dl className="grid gap-3 sm:grid-cols-2">
          <div>
            <dt className="text-xs text-muted-foreground">Motivo</dt>
            <dd className="mt-0.5">{order.reason}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Luces de tablero</dt>
            <dd className="mt-1 flex flex-wrap gap-1.5">
              {order.warningLights.length > 0 ? (
                order.warningLights.map((light) => (
                  <span
                    key={light}
                    className="rounded-full bg-status-waiting/10 px-2 py-0.5 font-mono text-[10px] text-status-waiting ring-1 ring-status-waiting/30"
                  >
                    {light}
                  </span>
                ))
              ) : (
                <span className="text-sm text-muted-foreground">Ninguna reportada</span>
              )}
            </dd>
          </div>
        </dl>
        {order.complaint && (
          <p className="mt-3 rounded-md border border-border bg-background p-3 text-sm text-muted-foreground">
            {order.complaint}
          </p>
        )}
      </section>

      {canSeeCosts && (
        <>
          <section className="rounded-lg border border-border bg-card/90 p-4 sm:p-5">
            <h2 className="mb-3 font-display text-2xl font-semibold">Diagnóstico</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field
                label="Tarifa de diagnóstico"
                name="diagnosisFee"
                type="number"
                min="0"
                step="0.01"
                value={order.diagnosis.fee}
                onChange={(event) =>
                  patch((draft) => ({
                    ...draft,
                    diagnosis: {
                      ...draft.diagnosis,
                      fee: Number(event.target.value) || 0,
                    },
                  }))
                }
                disabled={!canEdit}
              />
              <div className="flex items-end">
                <CheckboxRow
                  label="Exonerar diagnóstico"
                  description="El cliente aprobó la reparación, no se cobra el diagnóstico."
                  checked={order.diagnosis.waived}
                  onChange={(checked) =>
                    patch((draft) => ({
                      ...draft,
                      diagnosis: { ...draft.diagnosis, waived: checked },
                    }))
                  }
                />
              </div>
            </div>
          </section>

          <section className="rounded-lg border border-border bg-card/90 p-4 sm:p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-display text-2xl font-semibold">Mano de obra</h2>
              {canEdit && (
                <Button size="sm" variant="secondary" onClick={addLabor}>
                  <Plus className="size-4" />
                  Agregar
                </Button>
              )}
            </div>
            <div className="space-y-2">
              {order.labor.map((item) => (
                <div key={item.id} className="flex flex-wrap items-center gap-2">
                  <input
                    value={item.description}
                    onChange={(event) =>
                      updateLaborItem(item.id, {
                        description: event.target.value,
                      })
                    }
                    disabled={!canEdit}
                    placeholder="Descripción del trabajo"
                    className="h-10 min-w-0 flex-1 rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary"
                  />
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={item.price}
                    onChange={(event) =>
                      updateLaborItem(item.id, {
                        price: Number(event.target.value) || 0,
                      })
                    }
                    disabled={!canEdit}
                    className="h-10 w-28 rounded-md border border-border bg-background px-3 text-right font-mono text-sm outline-none focus:border-primary"
                  />
                  {canEdit && (
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label="Quitar"
                      onClick={() => removeLabor(item.id)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  )}
                </div>
              ))}
              {order.labor.length === 0 && (
                <p className="text-sm text-muted-foreground">Sin mano de obra registrada.</p>
              )}
            </div>
          </section>

          <section className="rounded-lg border border-border bg-card/90 p-4 sm:p-5">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-display text-2xl font-semibold">Repuestos</h2>
              {canEdit && (
                <div className="flex flex-wrap items-center gap-2">
                  <Select value="" onValueChange={(partId) => addPartFromCatalog(partId)}>
                    <SelectTrigger className="h-9 w-auto min-w-40 bg-background text-sm">
                      <SelectValue placeholder="+ Del catálogo…" />
                    </SelectTrigger>
                    <SelectContent>
                      {partsCatalog.map((part) => (
                        <SelectItem key={part.id} value={part.id}>
                          {part.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button size="sm" variant="secondary" onClick={addPartLine}>
                    <Plus className="size-4" />
                    Repuesto manual
                  </Button>
                </div>
              )}
            </div>
            <div className="space-y-2">
              {order.parts.map((part) => (
                <div
                  key={part.id}
                  className="grid grid-cols-2 gap-2 rounded-md border border-border p-2 sm:grid-cols-[1fr_auto_auto_auto_auto_auto]"
                >
                  <input
                    value={part.name}
                    onChange={(event) => updatePartLine(part.id, { name: event.target.value })}
                    disabled={!canEdit}
                    placeholder="Nombre del repuesto"
                    className="col-span-2 h-10 min-w-0 rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary sm:col-span-1"
                  />
                  <input
                    type="number"
                    min="1"
                    value={part.qty}
                    onChange={(event) =>
                      updatePartLine(part.id, {
                        qty: Number(event.target.value) || 1,
                      })
                    }
                    disabled={!canEdit}
                    title="Cantidad"
                    className="h-10 w-16 rounded-md border border-border bg-background px-2 text-center font-mono text-sm outline-none focus:border-primary"
                  />
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={part.workshopCost}
                    onChange={(event) =>
                      updatePartLine(part.id, {
                        workshopCost: Number(event.target.value) || 0,
                      })
                    }
                    disabled={!canEdit}
                    title="Costo taller"
                    className="h-10 w-24 rounded-md border border-border bg-background px-2 text-right font-mono text-sm outline-none focus:border-primary"
                  />
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={part.customerPrice}
                    onChange={(event) =>
                      updatePartLine(part.id, {
                        customerPrice: Number(event.target.value) || 0,
                      })
                    }
                    disabled={!canEdit}
                    title="Precio cliente"
                    className="h-10 w-24 rounded-md border border-border bg-background px-2 text-right font-mono text-sm outline-none focus:border-primary"
                  />
                  <label className="flex items-center gap-1.5 px-1 text-xs text-muted-foreground">
                    <input
                      type="checkbox"
                      checked={part.warranty}
                      onChange={(event) =>
                        updatePartLine(part.id, {
                          warranty: event.target.checked,
                        })
                      }
                      disabled={!canEdit}
                      className="size-4 accent-primary"
                    />
                    Garantía
                  </label>
                  {canEdit && (
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label="Quitar"
                      onClick={() => removePartLine(part.id)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  )}
                </div>
              ))}
              {order.parts.length === 0 && (
                <p className="text-sm text-muted-foreground">Sin repuestos registrados.</p>
              )}
            </div>
            <p className="mt-2 text-[11px] text-muted-foreground">
              Costo taller / Precio cliente por unidad.
            </p>
          </section>

          <section className="rounded-lg border border-border bg-card/90 p-4 sm:p-5">
            <CheckboxRow
              label="Aplicar tarifa de materiales (3.5%)"
              description="Solo si se usaron líquidos u otros insumos. Se calcula sobre mano de obra + repuestos + diagnóstico."
              checked={order.applyMaterialsFee}
              onChange={(checked) =>
                canEdit && patch((draft) => ({ ...draft, applyMaterialsFee: checked }))
              }
            />
          </section>

          <section className="rounded-lg border border-border bg-card/90 p-4 sm:p-5">
            <h2 className="mb-3 font-display text-2xl font-semibold">Total</h2>
            <dl className="space-y-1.5 text-sm">
              <Row label="Mano de obra" value={formatMoney(laborTotal(order))} />
              <Row label="Repuestos" value={formatMoney(partsCustomerTotal(order))} />
              <Row
                label="Diagnóstico"
                value={formatMoney(order.diagnosis.fee)}
                strike={order.diagnosis.waived}
              />
              {order.diagnosis.waived && (
                <Row
                  label="Diagnóstico exonerado"
                  value={`-${formatMoney(order.diagnosis.fee)}`}
                  muted
                />
              )}
              <div className="my-2 h-px bg-border" />
              <Row label="Subtotal" value={formatMoney(subtotal(order))} />
              {order.applyMaterialsFee && (
                <Row label="Tarifa de materiales (3.5%)" value={formatMoney(materialsFee(order))} />
              )}
              <div className="my-2 h-px bg-border" />
              <Row label="TOTAL" value={formatMoney(orderTotal(order))} bold />
            </dl>

            <div className="mt-4 rounded-md border border-border bg-background p-3">
              <p className="font-mono text-[9px] uppercase text-muted-foreground">
                Solo para el taller — no se muestra al cliente
              </p>
              <div className="mt-1.5 flex justify-between text-sm">
                <span className="text-muted-foreground">Costo de repuestos</span>
                <span className="font-mono">{formatMoney(partsCostTotal(order))}</span>
              </div>
              <div className="mt-1 flex justify-between text-sm">
                <span className="text-muted-foreground">Margen de repuestos</span>
                <span className="font-mono text-status-success">
                  {formatMoney(partsCustomerTotal(order) - partsCostTotal(order))}
                </span>
              </div>
            </div>
          </section>
        </>
      )}

      {vehicle && (
        <section className="rounded-lg border border-border bg-card/90 p-4 sm:p-5">
          <h2 className="mb-4 font-display text-2xl font-semibold">Historial de este vehículo</h2>
          <div className="space-y-2">
            {history.map((entry) => (
              <Link
                key={entry.id}
                to="/ordenes/$orderId"
                params={{ orderId: entry.id }}
                className="flex items-center justify-between gap-3 rounded-md border border-border bg-background/60 p-3 transition-colors hover:border-primary/50"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">
                    {formatDate(entry.createdAt)} — {entry.reason}
                  </p>
                  <p className="font-mono text-[10px] text-muted-foreground">{entry.id}</p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  {canSeeCosts && (
                    <span className="font-mono text-sm">{formatMoney(orderTotal(entry))}</span>
                  )}
                  <StatusBadge status={entry.status} />
                </div>
              </Link>
            ))}
            {history.length === 0 && (
              <p className="py-4 text-center text-sm text-muted-foreground">
                Sin visitas anteriores.
              </p>
            )}
          </div>
        </section>
      )}
    </AppShell>
  );
}

function Row({
  label,
  value,
  bold,
  muted,
  strike,
}: {
  label: string;
  value: string;
  bold?: boolean;
  muted?: boolean;
  strike?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between",
        bold && "text-base font-semibold",
        muted && "text-muted-foreground",
      )}
    >
      <dt>{label}</dt>
      <dd className={cn("font-mono", strike && "text-muted-foreground line-through")}>{value}</dd>
    </div>
  );
}
