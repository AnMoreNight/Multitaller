import { Button } from "@/components/ui/button";
import { Field, SelectField } from "@/components/taller/ui";
import type { Customer } from "@/lib/taller-data";

export type CustomerSelection =
  | { mode: "existing"; customerId: string }
  | { mode: "new"; name: string; phone: string; email: string };

export function CustomerPicker({
  customers,
  value,
  onChange,
}: {
  customers: Customer[];
  value: CustomerSelection;
  onChange: (value: CustomerSelection) => void;
}) {
  return (
    <div className="grid gap-3">
      <div className="flex w-fit rounded-md border border-border bg-background p-1">
        <Button
          type="button"
          size="sm"
          variant={value.mode === "existing" ? "secondary" : "ghost"}
          onClick={() => onChange({ mode: "existing", customerId: customers[0]?.id ?? "" })}
        >
          Cliente existente
        </Button>
        <Button
          type="button"
          size="sm"
          variant={value.mode === "new" ? "secondary" : "ghost"}
          onClick={() => onChange({ mode: "new", name: "", phone: "", email: "" })}
        >
          + Nuevo cliente
        </Button>
      </div>

      {value.mode === "existing" ? (
        <SelectField
          label="Cliente"
          value={value.customerId}
          onChange={(customerId) => onChange({ mode: "existing", customerId })}
          placeholder="No hay clientes registrados"
          options={customers.map((customer) => ({
            value: customer.id,
            label: customer.name,
          }))}
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          <Field
            label="Nombre completo"
            name="name"
            placeholder="Nombre del cliente"
            value={value.name}
            onChange={(event) => onChange({ ...value, name: event.target.value })}
            required
          />
          <Field
            label="Teléfono"
            name="phone"
            placeholder="+34 600 000 000"
            value={value.phone}
            onChange={(event) => onChange({ ...value, phone: event.target.value })}
            required
          />
          <Field
            label="Correo (opcional)"
            name="email"
            type="email"
            placeholder="cliente@correo.es"
            value={value.email}
            onChange={(event) => onChange({ ...value, email: event.target.value })}
          />
        </div>
      )}
    </div>
  );
}
