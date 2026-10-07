import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Plus, Users } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { AgendaCalendar } from "@/components/taller/AgendaCalendar";
import { AppShell } from "@/components/taller/AppShell";
import { NewOrderWizard } from "@/components/taller/NewOrderWizard";
import { OrdersTable } from "@/components/taller/OrdersTable";
import { Dialog, Field, StatCard } from "@/components/taller/ui";
import { Button } from "@/components/ui/button";
import { useRequireAuth } from "@/lib/auth";
import { useData } from "@/lib/store";
import { cn, errorMessage, optional } from "@/lib/utils";
import { formatMoney } from "@/lib/taller-data";
import { orderTotal, todayISO } from "@/lib/work-order";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Panel de mando | Ferro Taller" },
      {
        name: "description",
        content: "Agenda semanal, órdenes de trabajo y control operativo de Ferro Taller.",
      },
      { property: "og:title", content: "Panel de mando | Ferro Taller" },
      {
        property: "og:description",
        content: "Control claro del trabajo diario de un taller mecánico.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: WorkshopDashboard,
});

function WorkshopDashboard() {
  const { user } = useRequireAuth();
  const navigate = useNavigate();
  const { customers, vehicles, orders, addCustomer, updateOrder } = useData();

  const [dialog, setDialog] = useState<"order" | "customer" | null>(null);

  if (!user) return null;

  const inProcess = orders.filter((order) => order.status === "En proceso").length;
  const waitingForParts = orders.filter((order) => order.status === "Esperando repuesto").length;
  const readyForPickup = orders.filter((order) => order.status === "Completado").length;
  const activeOrders = orders.filter((order) => order.status !== "Entregado");

  const todayRevenue = orders
    .filter(
      (order) =>
        order.createdAt === todayISO() &&
        (order.status === "Completado" || order.status === "Entregado"),
    )
    .reduce((sum, order) => sum + orderTotal(order), 0);

  async function addCustomerQuick(name: string, phone: string, email: string) {
    try {
      await addCustomer({
        name,
        phone,
        ...optional("email", email),
      });
      setDialog(null);
      toast.success("Cliente agregado.");
    } catch (err) {
      toast.error(errorMessage(err, "No se pudo agregar el cliente. Intenta de nuevo."));
    }
  }

  return (
    <AppShell
      title="Panel principal"
      subtitle={user.role === "admin" ? "Vista de administración" : "Vista de taller"}
      actions={
        user.role === "admin" ? (
          <>
            <Button
              variant="secondary"
              className="hidden sm:inline-flex"
              onClick={() => setDialog("customer")}
            >
              <Users className="size-4" />
              Alta cliente
            </Button>
            <Button onClick={() => setDialog("order")}>
              <Plus className="size-4" />
              <span className="hidden sm:inline">Nueva orden</span>
            </Button>
          </>
        ) : null
      }
    >
      <section
        className={cn(
          "grid grid-cols-2 gap-3",
          user.role === "admin" ? "xl:grid-cols-4" : "xl:grid-cols-3",
        )}
        aria-label="Resumen del taller"
      >
        <StatCard label="En proceso" value={inProcess} description="vehículos en el taller ahora" />
        <StatCard
          label="Esperando repuesto"
          value={waitingForParts}
          description="a la espera de piezas"
          valueClassName="text-status-waiting"
        />
        <StatCard
          label="Listas para entregar"
          value={readyForPickup}
          description="completadas, sin entregar"
          valueClassName="text-status-success"
        />
        {user.role === "admin" && (
          <StatCard
            label="Facturado hoy"
            value={formatMoney(todayRevenue)}
            description="órdenes entregadas hoy"
          />
        )}
      </section>

      <AgendaCalendar orders={orders} vehicles={vehicles} />

      <section className="rounded-lg border border-border bg-card/90 p-4 sm:p-5">
        <div className="mb-4">
          <h2 className="font-display text-2xl font-semibold">Órdenes activas</h2>
          <p className="text-xs text-muted-foreground">
            {`${activeOrders.length} vehículos en proceso o pendientes`}
          </p>
        </div>
        <OrdersTable
          orders={activeOrders}
          customers={customers}
          vehicles={vehicles}
          showTotals={user.role === "admin"}
          canEditStatus={user.canChangeOrderStatus}
          onStatusChange={(orderId, status) =>
            updateOrder(orderId, (order) => ({ ...order, status }))
          }
        />
      </section>

      <NewOrderWizard open={dialog === "order"} onClose={() => setDialog(null)} />

      <Dialog title="Alta de cliente" open={dialog === "customer"} onClose={() => setDialog(null)}>
        <QuickCustomerForm onCancel={() => setDialog(null)} onSubmit={addCustomerQuick} />
      </Dialog>
    </AppShell>
  );
}

function QuickCustomerForm({
  onCancel,
  onSubmit,
}: {
  onCancel: () => void;
  onSubmit: (name: string, phone: string, email: string) => void;
}) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");

  return (
    <form
      className="grid gap-4 p-5"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit(name, phone, email);
      }}
    >
      <Field
        label="Nombre completo"
        name="name"
        placeholder="Nombre del cliente"
        value={name}
        onChange={(event) => setName(event.target.value)}
        required
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Teléfono"
          name="phone"
          placeholder="+34 600 000 000"
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
          required
        />
        <Field
          label="Correo (opcional)"
          name="email"
          type="email"
          placeholder="cliente@correo.es"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit">
          <Plus className="size-4" />
          Guardar cliente
        </Button>
      </div>
    </form>
  );
}
