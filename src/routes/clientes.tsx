import { createFileRoute, Link } from "@tanstack/react-router";
import { Mail, Phone, Plus, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { AppShell, RestrictedAccess } from "@/components/taller/AppShell";
import { Dialog, Field, TextareaField } from "@/components/taller/ui";
import { Button } from "@/components/ui/button";
import { useRequireAuth } from "@/lib/auth";
import { useData } from "@/lib/store";
import { formatMoney } from "@/lib/taller-data";
import { errorMessage, optional } from "@/lib/utils";
import { ordersForCustomer, orderTotal, vehiclesForCustomer } from "@/lib/work-order";

export const Route = createFileRoute("/clientes")({
  head: () => ({
    meta: [
      { title: "Clientes | Ferro Taller" },
      {
        name: "description",
        content:
          "Cartera de clientes de Ferro Taller con contacto, vehículos e historial de gasto.",
      },
      { property: "og:title", content: "Clientes | Ferro Taller" },
      {
        property: "og:description",
        content: "Gestión de clientes del taller.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CustomersPage,
});

function CustomersPage() {
  const { user } = useRequireAuth();
  const { customers, vehicles, orders, addCustomer } = useData();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    notes: "",
  });

  const filtered = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("es");
    if (!query) return customers;
    return customers.filter((customer) =>
      [customer.name, customer.phone, customer.email]
        .join(" ")
        .toLocaleLowerCase("es")
        .includes(query),
    );
  }, [customers, search]);

  if (!user) return null;
  if (user.role !== "admin") {
    return (
      <AppShell title="Clientes" subtitle="Acceso restringido">
        <RestrictedAccess />
      </AppShell>
    );
  }

  function resetForm() {
    setForm({ name: "", phone: "", email: "", notes: "" });
  }

  async function addCustomerSubmit() {
    try {
      await addCustomer({
        name: form.name,
        phone: form.phone,
        ...optional("email", form.email),
        ...optional("notes", form.notes),
      });
      setDialogOpen(false);
      resetForm();
      toast.success("Cliente agregado.");
    } catch (err) {
      toast.error(errorMessage(err, "No se pudo agregar el cliente. Intenta de nuevo."));
    }
  }

  return (
    <AppShell
      title="Clientes"
      subtitle={`${customers.length} clientes en cartera`}
      actions={
        <Button variant="secondary" onClick={() => setDialogOpen(true)}>
          <Plus className="size-4" />
          <span className="hidden sm:inline">Alta cliente</span>
        </Button>
      }
    >
      <div className="relative w-full sm:max-w-xs">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Buscar cliente"
          className="h-9 w-full rounded-md border border-border bg-card pl-9 pr-3 text-sm outline-none focus:border-primary"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-lg border border-border bg-card/90 py-10 text-center text-sm text-muted-foreground">
          No hay clientes que coincidan con la búsqueda.
        </div>
      ) : (
        <>
          {/* Card layout below sm: a wide table forces horizontal scrolling
              on a phone, which is easy to miss entirely — stacked cards show
              every field without scrolling sideways. */}
          <div className="grid gap-2 sm:hidden">
            {filtered.map((customer) => {
              const customerOrders = ordersForCustomer(orders, customer.id);
              const spent = customerOrders.reduce((sum, order) => sum + orderTotal(order), 0);
              return (
                <article
                  key={customer.id}
                  className="rounded-lg border border-border bg-card/90 p-3"
                >
                  <Link
                    to="/clientes/$customerId"
                    params={{ customerId: customer.id }}
                    className="flex items-center gap-3"
                  >
                    <div className="grid size-9 shrink-0 place-items-center rounded-md bg-accent font-mono text-xs">
                      {customer.name
                        .split(" ")
                        .map((part) => part[0])
                        .slice(0, 2)
                        .join("")}
                    </div>
                    <p className="font-semibold hover:text-primary">{customer.name}</p>
                  </Link>
                  <div className="mt-2 space-y-0.5 text-xs text-muted-foreground">
                    <p className="flex items-center gap-1.5">
                      <Phone className="size-3.5" />
                      {customer.phone}
                    </p>
                    {customer.email && (
                      <p className="flex items-center gap-1.5">
                        <Mail className="size-3.5" />
                        {customer.email}
                      </p>
                    )}
                  </div>
                  <div className="mt-2 flex items-center justify-between border-t border-border pt-2 text-xs">
                    <span className="text-muted-foreground">
                      {`${vehiclesForCustomer(vehicles, customer.id).length} vehículos · ${customerOrders.length} órdenes`}
                    </span>
                    <span className="font-mono font-semibold">{formatMoney(spent)}</span>
                  </div>
                </article>
              );
            })}
          </div>

          <section
            className="hidden overflow-x-auto rounded-lg border border-border bg-card/90 sm:block"
            aria-label="Listado de clientes"
          >
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border font-mono text-[9px] uppercase text-muted-foreground">
                  <th className="px-4 py-3 text-left font-medium">Cliente</th>
                  <th className="px-4 py-3 text-left font-medium">Contacto</th>
                  <th className="px-4 py-3 text-center font-medium">Vehículos</th>
                  <th className="px-4 py-3 text-center font-medium">Órdenes</th>
                  <th className="px-4 py-3 text-right font-medium">Total facturado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((customer) => {
                  const customerOrders = ordersForCustomer(orders, customer.id);
                  const spent = customerOrders.reduce((sum, order) => sum + orderTotal(order), 0);
                  return (
                    <tr key={customer.id} className="transition-colors hover:bg-accent/60">
                      <td className="px-4 py-3">
                        <Link
                          to="/clientes/$customerId"
                          params={{ customerId: customer.id }}
                          className="flex items-center gap-3"
                        >
                          <div className="grid size-9 place-items-center rounded-md bg-accent font-mono text-xs">
                            {customer.name
                              .split(" ")
                              .map((part) => part[0])
                              .slice(0, 2)
                              .join("")}
                          </div>
                          <p className="font-semibold hover:text-primary">{customer.name}</p>
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        <p className="flex items-center gap-1.5">
                          <Phone className="size-3.5" />
                          {customer.phone}
                        </p>
                        {customer.email && (
                          <p className="mt-0.5 flex items-center gap-1.5">
                            <Mail className="size-3.5" />
                            {customer.email}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center font-mono">
                        {vehiclesForCustomer(vehicles, customer.id).length}
                      </td>
                      <td className="px-4 py-3 text-center font-mono">{customerOrders.length}</td>
                      <td className="px-4 py-3 text-right font-mono">{formatMoney(spent)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </section>
        </>
      )}

      <Dialog
        title="Alta de cliente"
        open={dialogOpen}
        onClose={() => {
          setDialogOpen(false);
          resetForm();
        }}
      >
        <div className="grid gap-4 p-5">
          <Field
            label="Nombre completo"
            name="name"
            placeholder="Nombre del cliente"
            value={form.name}
            onChange={(event) => setForm({ ...form, name: event.target.value })}
            required
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Teléfono"
              name="phone"
              placeholder="+34 600 000 000"
              value={form.phone}
              onChange={(event) => setForm({ ...form, phone: event.target.value })}
              required
            />
            <Field
              label="Correo (opcional)"
              name="email"
              type="email"
              placeholder="cliente@correo.es"
              value={form.email}
              onChange={(event) => setForm({ ...form, email: event.target.value })}
            />
          </div>
          <TextareaField
            label="Notas (opcional)"
            name="notes"
            placeholder="Preferencias, observaciones…"
            value={form.notes}
            onChange={(event) => setForm({ ...form, notes: event.target.value })}
          />
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setDialogOpen(false);
                resetForm();
              }}
            >
              Cancelar
            </Button>
            <Button type="button" onClick={addCustomerSubmit} disabled={!form.name || !form.phone}>
              <Plus className="size-4" />
              Guardar cliente
            </Button>
          </div>
        </div>
      </Dialog>
    </AppShell>
  );
}
