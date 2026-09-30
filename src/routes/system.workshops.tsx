import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { LogOut, Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Field } from "@/components/taller/ui";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useAuth, useRequireSystemAdmin } from "@/lib/auth";
import { createWorkshop, listWorkshops, updateWorkshop } from "@/lib/server/workshops.functions";

export const Route = createFileRoute("/system/workshops")({
  head: () => ({
    meta: [{ title: "Talleres | Ferro Taller" }],
  }),
  component: WorkshopsPage,
});

const emptyForm = {
  name: "",
  adminName: "",
  adminTitle: "",
  adminEmail: "",
  adminPassword: "",
};

function WorkshopsPage() {
  const { user, ready } = useRequireSystemAdmin();
  const { logout } = useAuth();
  const queryClient = useQueryClient();
  const [form, setForm] = useState(emptyForm);

  const workshopsQuery = useQuery({
    queryKey: ["system", "workshops"],
    queryFn: () => listWorkshops(),
    enabled: Boolean(user),
  });
  const workshops = workshopsQuery.data ?? [];

  const createMutation = useMutation({
    mutationFn: (input: typeof emptyForm) => createWorkshop({ data: input }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["system", "workshops"] });
      setForm(emptyForm);
      toast.success("Taller creado.");
    },
    onError: () =>
      toast.error("No se pudo crear el taller. Verifica los datos e intenta de nuevo."),
  });

  const toggleMutation = useMutation({
    mutationFn: (input: { workshopId: string; isActive: boolean }) =>
      updateWorkshop({ data: input }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["system", "workshops"] }),
    onError: () => toast.error("No se pudo actualizar el taller."),
  });

  if (!ready || !user) {
    return (
      <div className="grid min-h-screen place-items-center bg-background text-sm text-muted-foreground">
        Cargando…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background px-4 py-8 text-foreground workshop-grid sm:px-8">
      <div className="mx-auto max-w-3xl space-y-6">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-semibold uppercase">Talleres</h1>
            <p className="font-mono text-[10px] uppercase text-muted-foreground">
              Administración de la plataforma
            </p>
          </div>
          <Button variant="ghost" size="icon" aria-label="Cerrar sesión" onClick={() => logout()}>
            <LogOut className="size-4" />
          </Button>
        </header>

        <section className="rounded-lg border border-border bg-card/90 p-5">
          <h2 className="font-semibold">Nuevo taller</h2>
          <form
            className="mt-4 grid gap-4 sm:grid-cols-2"
            onSubmit={(event) => {
              event.preventDefault();
              createMutation.mutate(form);
            }}
          >
            <Field
              label="Nombre del taller"
              name="name"
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
              required
            />
            <Field
              label="Nombre del administrador"
              name="adminName"
              value={form.adminName}
              onChange={(event) => setForm({ ...form, adminName: event.target.value })}
              required
            />
            <Field
              label="Puesto del administrador"
              name="adminTitle"
              placeholder="Ej. Administrador"
              value={form.adminTitle}
              onChange={(event) => setForm({ ...form, adminTitle: event.target.value })}
              required
            />
            <Field
              label="Correo del administrador"
              name="adminEmail"
              type="email"
              value={form.adminEmail}
              onChange={(event) => setForm({ ...form, adminEmail: event.target.value })}
              required
            />
            <Field
              label="Contraseña del administrador"
              name="adminPassword"
              type="password"
              placeholder="Mínimo 8 caracteres"
              value={form.adminPassword}
              onChange={(event) => setForm({ ...form, adminPassword: event.target.value })}
              required
            />
            <div className="sm:col-span-2 flex justify-end">
              <Button
                type="submit"
                disabled={
                  createMutation.isPending ||
                  !form.name ||
                  !form.adminName ||
                  !form.adminTitle ||
                  !form.adminEmail ||
                  form.adminPassword.length < 8
                }
              >
                <Plus className="size-4" />
                {createMutation.isPending ? "Creando…" : "Crear taller"}
              </Button>
            </div>
          </form>
        </section>

        <section className="rounded-lg border border-border bg-card/90 p-5">
          <h2 className="font-semibold">Talleres existentes</h2>
          <div className="mt-4 space-y-2">
            {workshops.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {workshopsQuery.isPending ? "Cargando…" : "Todavía no hay talleres."}
              </p>
            ) : (
              workshops.map((workshop) => (
                <div
                  key={workshop.id}
                  className="flex items-center justify-between rounded-md border border-border bg-background/60 p-3"
                >
                  <div>
                    <p className="text-sm font-semibold">{workshop.name}</p>
                    <p className="font-mono text-[10px] uppercase text-muted-foreground">
                      {workshop.isActive ? "Activo" : "Inactivo"}
                    </p>
                  </div>
                  <Switch
                    checked={workshop.isActive}
                    onCheckedChange={(checked) =>
                      toggleMutation.mutate({ workshopId: workshop.id, isActive: checked })
                    }
                    aria-label={`Activar o desactivar ${workshop.name}`}
                  />
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
