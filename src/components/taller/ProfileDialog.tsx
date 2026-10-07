import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Dialog, Field, SelectField } from "@/components/taller/ui";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import type { AppUser } from "@/lib/taller-data";
import { errorMessage } from "@/lib/utils";

const TITLE_PRESETS = [
  "Administrador/a",
  "Gerente",
  "Mecánico jefe",
  "Mecánico",
  "Asesor de servicio",
  "Recepción",
] as const;
const CUSTOM_TITLE = "__custom__";

export function ProfileDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { user, updateUser, changePassword } = useAuth();
  const [name, setName] = useState("");
  const [titleOption, setTitleOption] = useState<string>(TITLE_PRESETS[0]);
  const [customTitle, setCustomTitle] = useState("");
  const [saving, setSaving] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);

  // Re-seed the form from the current user each time the dialog opens, so it
  // doesn't show stale values from a previous open (or from another account,
  // if someone switches sessions without a full reload).
  useEffect(() => {
    if (open && user) {
      setName(user.name);
      if ((TITLE_PRESETS as readonly string[]).includes(user.title)) {
        setTitleOption(user.title);
        setCustomTitle("");
      } else {
        setTitleOption(CUSTOM_TITLE);
        setCustomTitle(user.title);
      }
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    }
  }, [open, user]);

  if (!user) return null;

  const resolvedTitle = titleOption === CUSTOM_TITLE ? customTitle.trim() : titleOption;

  async function save(target: AppUser) {
    setSaving(true);
    try {
      await updateUser(target.id, { name: name.trim(), title: resolvedTitle });
      onClose();
    } catch (err) {
      toast.error(errorMessage(err, "No se pudo guardar el perfil. Intenta de nuevo."));
    } finally {
      setSaving(false);
    }
  }

  async function submitPasswordChange() {
    if (newPassword !== confirmPassword) {
      toast.error("Las contraseñas nuevas no coinciden.");
      return;
    }
    setPasswordSaving(true);
    try {
      await changePassword(currentPassword, newPassword);
      toast.success("Contraseña actualizada. Vuelve a iniciar sesión.");
      onClose();
    } catch (err) {
      toast.error(errorMessage(err, "No se pudo cambiar la contraseña. Intenta de nuevo."));
    } finally {
      setPasswordSaving(false);
    }
  }

  return (
    <Dialog title="Mi perfil" open={open} onClose={onClose}>
      <form
        className="grid gap-4 p-5"
        onSubmit={(event) => {
          event.preventDefault();
          save(user);
        }}
      >
        <Field
          label="Nombre completo"
          name="name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          required
        />
        <SelectField
          label="Puesto"
          value={titleOption}
          onChange={setTitleOption}
          options={[
            ...TITLE_PRESETS.map((preset) => ({ value: preset, label: preset })),
            { value: CUSTOM_TITLE, label: "Otro…" },
          ]}
        />
        {titleOption === CUSTOM_TITLE && (
          <Field
            label="Especifica el puesto"
            name="customTitle"
            placeholder="Ej. Encargado de almacén"
            value={customTitle}
            onChange={(event) => setCustomTitle(event.target.value)}
            required
          />
        )}
        <p className="text-xs text-muted-foreground">
          El rol y los permisos los administra{" "}
          {user.role === "admin" ? "el equipo" : "la administración del taller"} desde Equipo.
        </p>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={!name.trim() || !resolvedTitle || saving}>
            {saving ? "Guardando…" : "Guardar cambios"}
          </Button>
        </div>
      </form>

      <div className="border-t border-border p-5 pt-4">
        <form
          className="grid gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            submitPasswordChange();
          }}
        >
          <p className="text-sm font-semibold">Cambiar contraseña</p>
          <Field
            label="Contraseña actual"
            name="currentPassword"
            type="password"
            value={currentPassword}
            onChange={(event) => setCurrentPassword(event.target.value)}
            autoComplete="current-password"
            required
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Nueva contraseña"
              name="newPassword"
              type="password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              autoComplete="new-password"
              minLength={8}
              required
            />
            <Field
              label="Confirmar nueva contraseña"
              name="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              autoComplete="new-password"
              minLength={8}
              required
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Al cambiarla, cerraremos todas tus sesiones activas y deberás iniciar sesión de nuevo.
          </p>
          <div className="flex justify-end">
            <Button
              type="submit"
              variant="secondary"
              disabled={
                !currentPassword || newPassword.length < 8 || !confirmPassword || passwordSaving
              }
            >
              {passwordSaving ? "Actualizando…" : "Actualizar contraseña"}
            </Button>
          </div>
        </form>
      </div>
    </Dialog>
  );
}
