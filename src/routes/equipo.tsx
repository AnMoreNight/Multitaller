import { createFileRoute } from "@tanstack/react-router";
import { KeyRound, Plus, ShieldCheck, Trash2, Wrench } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { AppShell, RestrictedAccess } from "@/components/taller/AppShell";
import { CheckboxRow, Dialog, Field, SelectField } from "@/components/taller/ui";
import { Button } from "@/components/ui/button";
import { useRequireAuth, type WorkshopRole } from "@/lib/auth";
import type { AppUser } from "@/lib/taller-data";
import { errorMessage } from "@/lib/utils";

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
  const { user, users, addUser, updateUser, removeUser, resetTeammatePassword } = useRequireAuth();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: "",
    title: "",
    email: "",
    password: "",
    role: "worker" as WorkshopRole,
    canChangeOrderStatus: true,
  });

  const [resetTarget, setResetTarget] = useState<AppUser | null>(null);
  const [resetPassword, setResetPassword] = useState("");
  const [resetConfirm, setResetConfirm] = useState("");
  const [resetSubmitting, setResetSubmitting] = useState(false);

  if (!user) return null;
  if (user.role !== "admin") {
    return (
      <AppShell title="Equipo" subtitle="Acceso restringido">
        <RestrictedAccess />
      </AppShell>
    );
  }

  const team = users;
  const adminCount = team.filter((member) => member.role === "admin").length;

  function resetForm() {
    setForm({
      name: "",
      title: "",
      email: "",
      password: "",
      role: "worker",
      canChangeOrderStatus: true,
    });
  }

  async function submit() {
    setSubmitting(true);
    try {
      await addUser({
        name: form.name,
        title: form.title,
        email: form.email.trim(),
        password: form.password,
        role: form.role,
        canChangeOrderStatus: form.canChangeOrderStatus,
      });
      setDialogOpen(false);
      resetForm();
    } catch {
      toast.error("No se pudo crear la cuenta. Verifica el correo y vuelve a intentar.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleUpdate(memberId: string, changes: Parameters<typeof updateUser>[1]) {
    try {
      await updateUser(memberId, changes);
    } catch {
      toast.error("No se pudo actualizar el miembro del equipo.");
    }
  }

  async function handleRemove(memberId: string) {
    try {
      await removeUser(memberId);
    } catch {
      toast.error("No se pudo quitar al miembro del equipo.");
    }
  }

  function closeResetDialog() {
    setResetTarget(null);
    setResetPassword("");
    setResetConfirm("");
  }

  async function submitPasswordReset() {
    if (!resetTarget) return;
    if (resetPassword !== resetConfirm) {
      toast.error("Las contraseñas no coinciden.");
      return;
    }
    setResetSubmitting(true);
    try {
      await resetTeammatePassword(resetTarget.id, resetPassword);
      toast.success(`Contraseña de ${resetTarget.name} actualizada.`);
      closeResetDialog();
    } catch (err) {
      toast.error(errorMessage(err, "No se pudo restablecer la contraseña. Intenta de nuevo."));
    } finally {
      setResetSubmitting(false);
    }
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
        El administrador ve todo y puede editar; un trabajador solo ve vehículos y estados, y solo
        puede cambiar el estado de una orden si tiene ese permiso activado abajo.
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
                  onChange={(role) => handleUpdate(member.id, { role: role as WorkshopRole })}
                  options={roleOptions}
                  disabled={isSelf || isLastAdmin}
                />
              </div>

              <div className="w-64">
                <CheckboxRow
                  label="Puede cambiar estado"
                  description="Permite avanzar el estado de una orden sin ser administrador."
                  checked={member.canChangeOrderStatus}
                  onChange={(checked) => handleUpdate(member.id, { canChangeOrderStatus: checked })}
                />
              </div>

              <Button
                variant="ghost"
                size="icon"
                aria-label={`Restablecer contraseña de ${member.name}`}
                disabled={isSelf}
                onClick={() => setResetTarget(member)}
              >
                <KeyRound className="size-4" />
              </Button>

              <Button
                variant="ghost"
                size="icon"
                aria-label={`Quitar a ${member.name}`}
                disabled={isSelf || isLastAdmin}
                onClick={() => handleRemove(member.id)}
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
          <Field
            label="Correo"
            name="email"
            type="email"
            placeholder="correo@taller.com"
            value={form.email}
            onChange={(event) => setForm({ ...form, email: event.target.value })}
            required
          />
          <Field
            label="Contraseña"
            name="password"
            type="password"
            placeholder="Mínimo 8 caracteres"
            value={form.password}
            onChange={(event) => setForm({ ...form, password: event.target.value })}
            required
          />
          <SelectField
            label="Rol"
            value={form.role}
            onChange={(role) => setForm({ ...form, role: role as WorkshopRole })}
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
            <Button
              type="button"
              onClick={submit}
              disabled={
                !form.name || !form.title || !form.email || form.password.length < 8 || submitting
              }
            >
              <Plus className="size-4" />
              {submitting ? "Guardando…" : "Guardar miembro"}
            </Button>
          </div>
        </div>
      </Dialog>

      <Dialog
        title={
          resetTarget ? `Restablecer contraseña de ${resetTarget.name}` : "Restablecer contraseña"
        }
        open={resetTarget !== null}
        onClose={closeResetDialog}
      >
        <div className="grid gap-4 p-5">
          <p className="text-xs text-muted-foreground">
            Úsalo si {resetTarget?.name ?? "el usuario"} olvidó su contraseña y no puede recuperarla
            por su cuenta. Se cerrarán todas sus sesiones activas y deberá iniciar sesión con la
            contraseña nueva.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Contraseña nueva"
              name="resetPassword"
              type="password"
              placeholder="Mínimo 8 caracteres"
              value={resetPassword}
              onChange={(event) => setResetPassword(event.target.value)}
              required
            />
            <Field
              label="Confirmar contraseña"
              name="resetConfirm"
              type="password"
              value={resetConfirm}
              onChange={(event) => setResetConfirm(event.target.value)}
              required
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={closeResetDialog}>
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={submitPasswordReset}
              disabled={resetPassword.length < 8 || !resetConfirm || resetSubmitting}
            >
              <KeyRound className="size-4" />
              {resetSubmitting ? "Guardando…" : "Restablecer contraseña"}
            </Button>
          </div>
        </div>
      </Dialog>
    </AppShell>
  );
}
