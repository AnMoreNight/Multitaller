import { useNavigate } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, Plus, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { CustomerPicker, type CustomerSelection } from "@/components/taller/CustomerPicker";
import { CheckboxRow, Dialog, Field, SelectField, TextareaField } from "@/components/taller/ui";
import { Button } from "@/components/ui/button";
import { useData } from "@/lib/store";
import { warningLightOptions, type WarningLight } from "@/lib/taller-data";
import { optional } from "@/lib/utils";
import { nextOrderId, todayISO, vehiclesForCustomer } from "@/lib/work-order";

type VehicleSelection =
  | { mode: "existing"; vehicleId: string }
  | {
      mode: "new";
      make: string;
      model: string;
      year: string;
      plate: string;
      vin: string;
      color: string;
    };

function emptyNewVehicle(): VehicleSelection {
  return {
    mode: "new",
    make: "",
    model: "",
    year: "",
    plate: "",
    vin: "",
    color: "",
  };
}

export function NewOrderWizard({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  const { customers, vehicles, orders, addCustomer, addVehicle, addOrder } = useData();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [customerSel, setCustomerSel] = useState<CustomerSelection>({
    mode: "existing",
    customerId: customers[0]?.id ?? "",
  });
  const [vehicleSel, setVehicleSel] = useState<VehicleSelection>(emptyNewVehicle());
  const [reason, setReason] = useState("");
  const [lights, setLights] = useState<WarningLight[]>([]);
  const [complaint, setComplaint] = useState("");

  const customerVehicles =
    customerSel.mode === "existing" ? vehiclesForCustomer(vehicles, customerSel.customerId) : [];

  function reset() {
    setStep(1);
    setCustomerSel({ mode: "existing", customerId: customers[0]?.id ?? "" });
    setVehicleSel(emptyNewVehicle());
    setReason("");
    setLights([]);
    setComplaint("");
  }

  function close() {
    onClose();
    reset();
  }

  function toggleLight(light: WarningLight, checked: boolean) {
    setLights((current) =>
      checked ? [...current, light] : current.filter((item) => item !== light),
    );
  }

  function submitOrder() {
    let customerId: string;
    if (customerSel.mode === "existing") {
      customerId = customerSel.customerId;
    } else {
      const created = {
        id: crypto.randomUUID(),
        name: customerSel.name,
        phone: customerSel.phone,
        ...optional("email", customerSel.email),
      };
      addCustomer(created);
      customerId = created.id;
    }

    let vehicleId: string;
    if (vehicleSel.mode === "existing") {
      vehicleId = vehicleSel.vehicleId;
    } else {
      const created = {
        id: crypto.randomUUID(),
        customerId,
        make: vehicleSel.make,
        model: vehicleSel.model,
        year: Number(vehicleSel.year) || new Date().getFullYear(),
        ...optional("plate", vehicleSel.plate),
        ...optional("vin", vehicleSel.vin),
        ...optional("color", vehicleSel.color),
      };
      addVehicle(created);
      vehicleId = created.id;
    }

    const orderId = nextOrderId(orders);
    addOrder({
      id: orderId,
      customerId,
      vehicleId,
      createdAt: todayISO(),
      reason,
      warningLights: lights,
      ...optional("complaint", complaint),
      status: "Pendiente inspección",
      diagnosis: { fee: 0, waived: false },
      labor: [],
      parts: [],
      applyMaterialsFee: false,
    });

    close();
    toast.success(`Orden ${orderId} creada.`);
    navigate({ to: "/ordenes/$orderId", params: { orderId } });
  }

  return (
    <Dialog title={`Nueva orden de trabajo — Paso ${step} de 3`} open={open} onClose={close}>
      <div className="grid gap-4 p-5">
        {step === 1 && (
          <CustomerPicker
            customers={customers}
            value={customerSel}
            onChange={(next) => {
              const customerChanged =
                next.mode !== customerSel.mode ||
                (next.mode === "existing" &&
                  customerSel.mode === "existing" &&
                  next.customerId !== customerSel.customerId);
              setCustomerSel(next);
              if (customerChanged) setVehicleSel(emptyNewVehicle());
            }}
          />
        )}

        {step === 2 && (
          <div className="grid gap-3">
            {customerSel.mode === "existing" && customerVehicles.length > 0 && (
              <div className="flex w-fit rounded-md border border-border bg-background p-1">
                <Button
                  type="button"
                  size="sm"
                  variant={vehicleSel.mode === "existing" ? "secondary" : "ghost"}
                  onClick={() =>
                    setVehicleSel({
                      mode: "existing",
                      vehicleId: customerVehicles[0]!.id,
                    })
                  }
                >
                  Vehículo existente
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={vehicleSel.mode === "new" ? "secondary" : "ghost"}
                  onClick={() => setVehicleSel(emptyNewVehicle())}
                >
                  + Nuevo vehículo
                </Button>
              </div>
            )}

            {vehicleSel.mode === "existing" ? (
              <SelectField
                label="Vehículo"
                value={vehicleSel.vehicleId}
                onChange={(vehicleId) => setVehicleSel({ mode: "existing", vehicleId })}
                options={customerVehicles.map((vehicle) => ({
                  value: vehicle.id,
                  label: `${vehicle.make} ${vehicle.model} ${vehicle.year} · ${vehicle.plate ?? vehicle.vin ?? ""}`,
                }))}
              />
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                <Field
                  label="Marca"
                  name="make"
                  placeholder="Toyota"
                  value={vehicleSel.make}
                  onChange={(event) => setVehicleSel({ ...vehicleSel, make: event.target.value })}
                  required
                />
                <Field
                  label="Modelo"
                  name="model"
                  placeholder="Corolla"
                  value={vehicleSel.model}
                  onChange={(event) => setVehicleSel({ ...vehicleSel, model: event.target.value })}
                  required
                />
                <Field
                  label="Año"
                  name="year"
                  placeholder="2021"
                  value={vehicleSel.year}
                  onChange={(event) => setVehicleSel({ ...vehicleSel, year: event.target.value })}
                  required
                />
                <Field
                  label="Color"
                  name="color"
                  placeholder="Gris"
                  value={vehicleSel.color}
                  onChange={(event) => setVehicleSel({ ...vehicleSel, color: event.target.value })}
                />
                <Field
                  label="Matrícula"
                  name="plate"
                  placeholder="ABC-123"
                  value={vehicleSel.plate}
                  onChange={(event) => setVehicleSel({ ...vehicleSel, plate: event.target.value })}
                />
                <Field
                  label="VIN (opcional)"
                  name="vin"
                  placeholder="Número de chasis"
                  value={vehicleSel.vin}
                  onChange={(event) => setVehicleSel({ ...vehicleSel, vin: event.target.value })}
                />
              </div>
            )}
          </div>
        )}

        {step === 3 && (
          <div className="grid gap-4">
            <Field
              label="Motivo de ingreso"
              name="reason"
              placeholder="Inspección, frenos, cambio de aceite…"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              required
            />
            <div>
              <p className="mb-2 text-sm text-muted-foreground">Luces de tablero encendidas</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {warningLightOptions.map((light) => (
                  <CheckboxRow
                    key={light}
                    label={light}
                    checked={lights.includes(light)}
                    onChange={(checked) => toggleLight(light, checked)}
                  />
                ))}
              </div>
            </div>
            <TextareaField
              label="Queja o notas del cliente"
              name="complaint"
              placeholder="Qué reporta el cliente…"
              value={complaint}
              onChange={(event) => setComplaint(event.target.value)}
            />
            <div className="rounded-md border border-border bg-background p-3 text-xs text-muted-foreground">
              <ShieldCheck className="mr-2 inline size-4 text-primary" />
              La orden iniciará como{" "}
              <strong className="text-foreground">Pendiente de inspección</strong>. El diagnóstico,
              la mano de obra y los repuestos se agregan después, en la orden.
            </div>
          </div>
        )}

        <div className="flex justify-between gap-2">
          <Button
            type="button"
            variant="ghost"
            onClick={() => (step === 1 ? close() : setStep((current) => (current - 1) as 1 | 2))}
          >
            {step === 1 ? (
              "Cancelar"
            ) : (
              <>
                <ArrowLeft className="size-4" />
                Atrás
              </>
            )}
          </Button>
          {step < 3 ? (
            <Button
              type="button"
              onClick={() => {
                if (step === 1 && customerSel.mode === "existing") {
                  const ownedVehicles = vehiclesForCustomer(vehicles, customerSel.customerId);
                  setVehicleSel(
                    ownedVehicles.length > 0
                      ? { mode: "existing", vehicleId: ownedVehicles[0]!.id }
                      : emptyNewVehicle(),
                  );
                }
                setStep((current) => (current + 1) as 2 | 3);
              }}
              disabled={
                (step === 1 && customerSel.mode === "existing" && !customerSel.customerId) ||
                (step === 2 && vehicleSel.mode === "new" && (!vehicleSel.make || !vehicleSel.model))
              }
            >
              Siguiente
              <ArrowRight className="size-4" />
            </Button>
          ) : (
            <Button type="button" onClick={submitOrder} disabled={!reason.trim()}>
              <Plus className="size-4" />
              Crear orden
            </Button>
          )}
        </div>
      </div>
    </Dialog>
  );
}
