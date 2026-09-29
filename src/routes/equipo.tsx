import { createFileRoute } from "@tanstack/react-router";
import { Plus, ShieldCheck, Trash2, Wrench } from "lucide-react";
import { useState } from "react";

import { AppShell, RestrictedAccess } from "@/components/taller/AppShell";
import { CheckboxRow, Dialog, Field, SelectField } from "@/components/taller/ui";
import { Button } from "@/components/ui/button";
import { useRequireAuth } from "@/lib/auth";
import type { Role } from "@/lib/taller-data";

export const Route = createFileRoute("/equipo")({
  head: () => ({
    meta: [
      { title: "Equipo | Ferro Taller" },
      {
        name: "description",
        content: "Cuentas del taller: roles y permisos de cada miembro.",
      },
    ],
  }),
  component: TeamPage,
});

const roleOptions: { value: string; label: string }[] = [
  { value: "admin", label: "Administrador" },
  { value: "worker", label: "Trabajador" },
];

function TeamPage() {
  const { user, users, addUser, updateUser, removeUser } = useRequireAuth();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    title: "",
    role: "worker" as Role,
    canChangeOrderStatus: true,
  });

  if (!user) return null;
  if (user.role !== "admin") {
    return (
      <AppShell title="Equipo" subtitle="Acceso restringido">
        <RestrictedAccess />
      </AppShell>
    );
  }

  const team = users.filter((member) => member.workshopId === user.workshopId);
  const adminCount = team.filter((member) => member.role === "admin").length;

  function resetForm() {
    setForm({
      name: "",
      title: "",
      role: "worker",
      canChangeOrderStatus: true,
    });
  }

  function submit() {
    addUser({
      id: crypto.randomUUID(),
      name: form.name,
      title: form.title,
      role: form.role,
      canChangeOrderStatus: form.canChangeOrderStatus,
    });
    setDialogOpen(false);
    resetForm();
  }

  return (
    <AppShell
      title="Equipo"
      subtitle={`${team.length} cuentas en este taller`}
      actions={
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="size-4" />
          <span className="hidden sm:inline">Nuevo miembro</span>
        </Button>
      }
    >
      <p className="text-xs text-muted-foreground">
        Esta es una demo sin servidor todavía: las cuentas viven en esta sesión del navegador (ver
        AGENTS.md). El administrador ve todo y puede editar; un trabajador solo ve vehículos y
        estados, y solo puede cambiar el estado de una orden si tiene ese permiso activado abajo.
      </p>

      <section className="grid gap-3">
        {team.map((member) => {
          const isSelf = member.id === user.id;
          const isLastAdmin = member.role === "admin" && adminCount <= 1;
          return (
            <article
              key={member.id}
              className="flex flex-wrap items-center gap-4 rounded-lg border border-border bg-card/90 p-4"
            >
              <div className="grid size-10 shrink-0 place-items-center rounded-md bg-accent text-primary">
                {member.role === "admin" ? (
                  <ShieldCheck className="size-4" />
                ) : (
                  <Wrench className="size-4" />
                )}
              </div>

              <div className="min-w-40 flex-1">
                <p className="font-semibold">
                  {member.name}
                  {isSelf && (
                    <span className="ml-2 font-mono text-[10px] uppercase text-muted-foreground">
                      (tú)
                    </span>
                  )}
                </p>
                <p className="text-xs text-muted-foreground">{member.title}</p>
              </div>

              <div className="w-40">
                <SelectField
                  value={member.role}
                  onChange={(role) => updateUser(member.id, { role: role as Role })}
                  options={roleOptions}
                  disabled={isSelf || isLastAdmin}
                />
              </div>

              <div className="w-64">
                <CheckboxRow
                  label="Puede cambiar estado"
                  description="Permite avanzar el estado de una orden sin ser administrador."
                  checked={member.canChangeOrderStatus}
                  onChange={(checked) => updateUser(member.id, { canChangeOrderStatus: checked })}
                />
              </div>

              <Button
                variant="ghost"
                size="icon"
                aria-label={`Quitar a ${member.name}`}
                disabled={isSelf || isLastAdmin}
                onClick={() => removeUser(member.id)}
              >
                <Trash2 className="size-4" />
              </Button>
            </article>
          );
        })}
      </section>

      <Dialog
        title="Nuevo miembro del equipo"
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
            placeholder="Nombre del empleado"
            value={form.name}
            onChange={(event) => setForm({ ...form, name: event.target.value })}
            required
          />
          <Field
            label="Puesto"
            name="title"
            placeholder="Ej. Mecánico"
            value={form.title}
            onChange={(event) => setForm({ ...form, title: event.target.value })}
            required
          />
          <SelectField
            label="Rol"
            value={form.role}
            onChange={(role) => setForm({ ...form, role: role as Role })}
            options={roleOptions}
          />
          <CheckboxRow
            label="Puede cambiar estado"
            description="Permite avanzar el estado de una orden sin ser administrador."
            checked={form.canChangeOrderStatus}
            onChange={(checked) => setForm({ ...form, canChangeOrderStatus: checked })}
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
            <Button type="button" onClick={submit} disabled={!form.name || !form.title}>
              <Plus className="size-4" />
              Guardar miembro
            </Button>
          </div>
        </div>
      </Dialog>
    </AppShell>
  );
}
