import { useEffect, useState } from "react";

import { Dialog, Field } from "@/components/taller/ui";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import type { AppUser } from "@/lib/taller-data";

export function ProfileDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { user, updateUser } = useAuth();
  const [name, setName] = useState("");
  const [title, setTitle] = useState("");

  // Re-seed the form from the current user each time the dialog opens, so it
  // doesn't show stale values from a previous open (or from another account,
  // if someone switches sessions without a full reload).
  useEffect(() => {
    if (open && user) {
      setName(user.name);
      setTitle(user.title);
    }
  }, [open, user]);

  if (!user) return null;

  function save(target: AppUser) {
    updateUser(target.id, { name: name.trim(), title: title.trim() });
    onClose();
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
        <Field
          label="Puesto"
          name="title"
          placeholder="Ej. Mecánico jefe"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          required
        />
        <p className="text-xs text-muted-foreground">
          El rol y los permisos los administra{" "}
          {user.role === "admin" ? "el equipo" : "la administración del taller"} desde Equipo.
        </p>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={!name.trim() || !title.trim()}>
            Guardar cambios
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
