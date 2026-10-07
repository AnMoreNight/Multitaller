import { createFileRoute, Link } from "@tanstack/react-router";
import { CarFront, Plus, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/taller/AppShell";
import { CustomerPicker, type CustomerSelection } from "@/components/taller/CustomerPicker";
import { Dialog, Field } from "@/components/taller/ui";
import { Button } from "@/components/ui/button";
import { useRequireAuth } from "@/lib/auth";
import { useData } from "@/lib/store";
import { optional } from "@/lib/utils";
import { getCustomer, lastServiceLabel, vehicleLabel } from "@/lib/work-order";

export const Route = createFileRoute("/vehiculos")({
  head: () => ({
    meta: [
      { title: "Vehículos | Ferro Taller" },
      {
        name: "description",
        content:
          "Parque de vehículos atendidos por Ferro Taller, con historial y datos de contacto.",
      },
      { property: "og:title", content: "Vehículos | Ferro Taller" },
      {
        property: "og:description",
        content: "Registro de vehículos del taller.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: VehiclesPage,
});

function VehiclesPage() {
  const { user } = useRequireAuth();
  const { customers, vehicles, orders, addCustomer, addVehicle } = useData();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [customerSel, setCustomerSel] = useState<CustomerSelection>({
    mode: "existing",
    customerId: customers[0]?.id ?? "",
  });
  const [form, setForm] = useState({
    make: "",
    model: "",
    year: "",
    color: "",
    plate: "",
    vin: "",
  });

  const filtered = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("es");
    if (!query) return vehicles;
    return vehicles.filter((vehicle) => {
      const customer = getCustomer(customers, vehicle.customerId);
      const haystack = [
        vehicle.plate,
        vehicle.vin,
        vehicle.make,
        vehicle.model,
        String(vehicle.year),
        customer?.name,
      ]
        .join(" ")
        .toLocaleLowerCase("es");
      return haystack.includes(query);
    });
  }, [vehicles, customers, search]);

  if (!user) return null;

  function resetForm() {
    setCustomerSel({ mode: "existing", customerId: customers[0]?.id ?? "" });
    setForm({ make: "", model: "", year: "", color: "", plate: "", vin: "" });
  }

  async function submitVehicle() {
    try {
      let customerId: string;
      if (customerSel.mode === "existing") {
        customerId = customerSel.customerId;
      } else {
        const created = await addCustomer({
          name: customerSel.name,
          phone: customerSel.phone,
          ...optional("email", customerSel.email),
        });
        customerId = created.id;
      }

      await addVehicle({
        customerId,
        make: form.make,
        model: form.model,
        year: Number(form.year) || new Date().getFullYear(),
        ...optional("color", form.color),
        ...optional("plate", form.plate),
        ...optional("vin", form.vin),
      });

      setDialogOpen(false);
      resetForm();
      toast.success("Vehículo registrado.");
    } catch {
      toast.error("No se pudo registrar el vehículo. Intenta de nuevo.");
    }
  }

  return (
    <AppShell
      title="Vehículos"
      subtitle={`${vehicles.length} vehículos registrados`}
      actions={
        user.role === "admin" ? (
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="size-4" />
            <span className="hidden sm:inline">Registrar vehículo</span>
          </Button>
        ) : null
      }
    >
      <div className="relative w-full sm:max-w-xs">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Buscar por matrícula, modelo o cliente"
          className="h-9 w-full rounded-md border border-border bg-card pl-9 pr-3 text-sm outline-none focus:border-primary"
        />
      </div>

      <section
        className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3"
        aria-label="Listado de vehículos"
      >
        {filtered.map((vehicle) => {
          const customer = getCustomer(customers, vehicle.customerId);
          return (
            <Link
              key={vehicle.id}
              to="/vehiculos/$vehicleId"
              params={{ vehicleId: vehicle.id }}
              className="block rounded-lg border border-border bg-card/90 p-4 transition-colors hover:border-primary/50"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div className="grid size-10 place-items-center rounded-md bg-primary/10 text-primary ring-1 ring-primary/30">
                    <CarFront className="size-5" />
                  </div>
                  <div>
                    <p className="font-semibold">{vehicleLabel(vehicle)}</p>
                    <p className="font-mono text-[10px] uppercase text-muted-foreground">
                      {vehicle.plate ?? vehicle.vin ?? "Sin matrícula"}
                    </p>
                  </div>
                </div>
              </div>
              <dl className="mt-4 space-y-2 text-sm">
                <div className="flex justify-between gap-2">
                  <dt className="text-muted-foreground">Propietario</dt>
                  <dd className="text-right">{customer?.name ?? "—"}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-muted-foreground">Color</dt>
                  <dd className="text-right">{vehicle.color ?? "—"}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-muted-foreground">Último servicio</dt>
                  <dd className="text-right font-mono text-xs">
                    {lastServiceLabel(orders, vehicle.id)}
                  </dd>
                </div>
              </dl>
            </Link>
          );
        })}
      </section>
      {filtered.length === 0 && (
        <div className="rounded-lg border border-border bg-card/90 py-10 text-center text-sm text-muted-foreground">
          No hay vehículos que coincidan con la búsqueda.
        </div>
      )}

      <Dialog
        title="Registrar vehículo"
        open={dialogOpen}
        onClose={() => {
          setDialogOpen(false);
          resetForm();
        }}
      >
        <div className="grid gap-4 p-5">
          <CustomerPicker customers={customers} value={customerSel} onChange={setCustomerSel} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Marca"
              name="make"
              placeholder="Toyota"
              value={form.make}
              onChange={(event) => setForm({ ...form, make: event.target.value })}
              required
            />
            <Field
              label="Modelo"
              name="model"
              placeholder="Corolla"
              value={form.model}
              onChange={(event) => setForm({ ...form, model: event.target.value })}
              required
            />
            <Field
              label="Año"
              name="year"
              placeholder="2021"
              value={form.year}
              onChange={(event) => setForm({ ...form, year: event.target.value })}
              required
            />
            <Field
              label="Color"
              name="color"
              placeholder="Gris"
              value={form.color}
              onChange={(event) => setForm({ ...form, color: event.target.value })}
            />
            <Field
              label="Matrícula"
              name="plate"
              placeholder="ABC-123"
              value={form.plate}
              onChange={(event) => setForm({ ...form, plate: event.target.value })}
            />
            <Field
              label="VIN (opcional)"
              name="vin"
              placeholder="Número de chasis"
              value={form.vin}
              onChange={(event) => setForm({ ...form, vin: event.target.value })}
            />
          </div>
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
            <Button
              type="button"
              onClick={submitVehicle}
              disabled={
                !form.make ||
                !form.model ||
                (customerSel.mode === "existing" ? !customerSel.customerId : !customerSel.name)
              }
            >
              <Plus className="size-4" />
              Guardar vehículo
            </Button>
          </div>
        </div>
      </Dialog>
    </AppShell>
  );
}
