import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { KeyRound, LogOut, Pencil, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Dialog, Field } from "@/components/taller/ui";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useAuth, useRequireSystemAdmin } from "@/lib/auth";
import type { Workshop } from "@/lib/taller-data";
import {
  createWorkshop,
  deleteWorkshop,
  listWorkshops,
  updateWorkshop,
} from "@/lib/server/workshops.functions";

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
  const { user, ready, logout } = useRequireSystemAdmin();
  const queryClient = useQueryClient();
  const [form, setForm] = useState(emptyForm);
  const [editingWorkshop, setEditingWorkshop] = useState<Workshop | null>(null);
  const [deletingWorkshop, setDeletingWorkshop] = useState<Workshop | null>(null);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);

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
      updateWorkshop({
        data: { workshopId: input.workshopId, changes: { isActive: input.isActive } },
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["system", "workshops"] }),
    onError: () => toast.error("No se pudo actualizar el taller."),
  });

  const renameMutation = useMutation({
    mutationFn: (input: { workshopId: string; name: string }) =>
      updateWorkshop({ data: { workshopId: input.workshopId, changes: { name: input.name } } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["system", "workshops"] });
      setEditingWorkshop(null);
      toast.success("Taller actualizado.");
    },
    onError: () => toast.error("No se pudo renombrar el taller."),
  });

  const deleteMutation = useMutation({
    mutationFn: (workshopId: string) => deleteWorkshop({ data: { workshopId } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["system", "workshops"] });
      setDeletingWorkshop(null);
      toast.success("Taller eliminado.");
    },
    onError: () => toast.error("No se pudo eliminar el taller."),
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
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              aria-label="Cambiar mi contraseña"
              onClick={() => setPasswordDialogOpen(true)}
            >
              <KeyRound className="size-4" />
            </Button>
            <Button variant="ghost" size="icon" aria-label="Cerrar sesión" onClick={() => logout()}>
              <LogOut className="size-4" />
            </Button>
          </div>
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
                  className="flex items-center justify-between gap-3 rounded-md border border-border bg-background/60 p-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{workshop.name}</p>
                    <p className="font-mono text-[10px] uppercase text-muted-foreground">
                      {workshop.isActive ? "Activo" : "Inactivo"}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Editar ${workshop.name}`}
                      onClick={() => setEditingWorkshop(workshop)}
                    >
                      <Pencil className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Eliminar ${workshop.name}`}
                      onClick={() => setDeletingWorkshop(workshop)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                    <Switch
                      checked={workshop.isActive}
                      onCheckedChange={(checked) =>
                        toggleMutation.mutate({ workshopId: workshop.id, isActive: checked })
                      }
                      aria-label={`Activar o desactivar ${workshop.name}`}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      <EditWorkshopDialog
        workshop={editingWorkshop}
        onClose={() => setEditingWorkshop(null)}
        onSave={(name) =>
          editingWorkshop && renameMutation.mutate({ workshopId: editingWorkshop.id, name })
        }
        saving={renameMutation.isPending}
      />

      <DeleteWorkshopDialog
        workshop={deletingWorkshop}
        onClose={() => setDeletingWorkshop(null)}
        onConfirm={() => deletingWorkshop && deleteMutation.mutate(deletingWorkshop.id)}
        deleting={deleteMutation.isPending}
      />

      <ChangePasswordDialog
        open={passwordDialogOpen}
        onClose={() => setPasswordDialogOpen(false)}
      />
    </div>
  );
}

function EditWorkshopDialog({
  workshop,
  onClose,
  onSave,
  saving,
}: {
  workshop: Workshop | null;
  onClose: () => void;
  onSave: (name: string) => void;
  saving: boolean;
}) {
  const [name, setName] = useState("");

  useEffect(() => {
    if (workshop) setName(workshop.name);
  }, [workshop]);

  if (!workshop) return null;

  return (
    <Dialog title="Editar taller" open={Boolean(workshop)} onClose={onClose}>
      <form
        className="grid gap-4 p-5"
        onSubmit={(event) => {
          event.preventDefault();
          onSave(name.trim());
        }}
      >
        <Field
          label="Nombre del taller"
          name="editName"
          value={name}
          onChange={(event) => setName(event.target.value)}
          required
        />
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={!name.trim() || saving}>
            {saving ? "Guardando…" : "Guardar"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

function DeleteWorkshopDialog({
  workshop,
  onClose,
  onConfirm,
  deleting,
}: {
  workshop: Workshop | null;
  onClose: () => void;
  onConfirm: () => void;
  deleting: boolean;
}) {
  const [confirmText, setConfirmText] = useState("");

  useEffect(() => {
    setConfirmText("");
  }, [workshop]);

  if (!workshop) return null;
  const matches = confirmText.trim() === workshop.name;

  return (
    <Dialog title="Eliminar taller" open={Boolean(workshop)} onClose={onClose}>
      <div className="grid gap-4 p-5">
        <p className="text-sm text-muted-foreground">
          Esto elimina permanentemente <strong className="text-foreground">{workshop.name}</strong>{" "}
          junto con todos sus clientes, vehículos, órdenes de trabajo, repuestos y cuentas de
          usuario. No se puede deshacer.
        </p>
        <Field
          label={`Escribe "${workshop.name}" para confirmar`}
          name="confirmName"
          value={confirmText}
          onChange={(event) => setConfirmText(event.target.value)}
          autoComplete="off"
        />
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={!matches || deleting}
            onClick={onConfirm}
          >
            {deleting ? "Eliminando…" : "Eliminar definitivamente"}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}

function ChangePasswordDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { changePassword } = useAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    }
  }, [open]);

  const mismatch = confirmPassword.length > 0 && newPassword !== confirmPassword;

  async function submit() {
    setSubmitting(true);
    try {
      await changePassword(currentPassword, newPassword);
      toast.success("Contraseña actualizada. Vuelve a iniciar sesión.");
      // changePassword() already signs the user out everywhere; useRequireSystemAdmin
      // picks up the now-null session and redirects to /login on its own.
    } catch (err) {
      const message =
        err instanceof Error && err.message ? err.message : "No se pudo cambiar la contraseña.";
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog title="Cambiar mi contraseña" open={open} onClose={onClose}>
      <form
        className="grid gap-4 p-5"
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
      >
        <Field
          label="Contraseña actual"
          name="currentPassword"
          type="password"
          autoComplete="current-password"
          value={currentPassword}
          onChange={(event) => setCurrentPassword(event.target.value)}
          required
        />
        <Field
          label="Nueva contraseña"
          name="newPassword"
          type="password"
          autoComplete="new-password"
          placeholder="Mínimo 8 caracteres"
          value={newPassword}
          onChange={(event) => setNewPassword(event.target.value)}
          required
        />
        <Field
          label="Confirmar nueva contraseña"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          required
        />
        {mismatch ? (
          <p className="text-sm text-destructive">Las contraseñas no coinciden.</p>
        ) : null}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={
              submitting ||
              !currentPassword ||
              newPassword.length < 8 ||
              newPassword !== confirmPassword
            }
          >
            {submitting ? "Guardando…" : "Cambiar contraseña"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
