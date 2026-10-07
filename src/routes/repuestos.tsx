import { createFileRoute } from "@tanstack/react-router";
import { Package, Pencil, Plus, Search, ShieldCheck, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { AppShell, RestrictedAccess } from "@/components/taller/AppShell";
import { Dialog, Field, StatCard } from "@/components/taller/ui";
import { Button } from "@/components/ui/button";
import { useRequireAuth } from "@/lib/auth";
import { useData } from "@/lib/store";
import { formatMoney, type PartCatalogItem } from "@/lib/taller-data";
import { errorMessage, optional } from "@/lib/utils";

export const Route = createFileRoute("/repuestos")({
  head: () => ({
    meta: [
      { title: "Repuestos | Ferro Taller" },
      {
        name: "description",
        content:
          "Catálogo de precios de repuestos de Ferro Taller: costo de taller, precio al cliente y garantía.",
      },
      { property: "og:title", content: "Repuestos | Ferro Taller" },
      {
        property: "og:description",
        content: "Catálogo de precios de repuestos del taller.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PartsPage,
});

function emptyForm() {
  return { sku: "", name: "", workshopCost: "", customerPrice: "", warranty: false };
}

function PartsPage() {
  const { user } = useRequireAuth();
  const { partsCatalog, addPart, editPart, removePart } = useData();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPartId, setEditingPartId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm());

  const filtered = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("es");
    if (!query) return partsCatalog;
    return partsCatalog.filter((part) =>
      [part.sku, part.name].join(" ").toLocaleLowerCase("es").includes(query),
    );
  }, [partsCatalog, search]);

  if (!user) return null;
  if (user.role !== "admin") {
    return (
      <AppShell title="Repuestos" subtitle="Acceso restringido">
        <RestrictedAccess />
      </AppShell>
    );
  }

  const averageMargin = partsCatalog.length
    ? partsCatalog.reduce((sum, part) => sum + (part.customerPrice - part.workshopCost), 0) /
      partsCatalog.length
    : 0;
  const withWarranty = partsCatalog.filter((part) => part.warranty).length;

  function closeDialog() {
    setDialogOpen(false);
    setEditingPartId(null);
    setForm(emptyForm());
  }

  function openCreate() {
    setEditingPartId(null);
    setForm(emptyForm());
    setDialogOpen(true);
  }

  function openEdit(part: PartCatalogItem) {
    setEditingPartId(part.id);
    setForm({
      sku: part.sku ?? "",
      name: part.name,
      workshopCost: String(part.workshopCost),
      customerPrice: String(part.customerPrice),
      warranty: part.warranty,
    });
    setDialogOpen(true);
  }

  async function submitPart() {
    try {
      if (editingPartId) {
        await editPart(editingPartId, {
          ...optional("sku", form.sku),
          name: form.name,
          workshopCost: Number(form.workshopCost) || 0,
          customerPrice: Number(form.customerPrice) || 0,
          warranty: form.warranty,
        });
        toast.success("Repuesto actualizado.");
      } else {
        await addPart({
          ...optional("sku", form.sku),
          name: form.name,
          workshopCost: Number(form.workshopCost) || 0,
          customerPrice: Number(form.customerPrice) || 0,
          warranty: form.warranty,
        });
        toast.success("Repuesto agregado.");
      }
      closeDialog();
    } catch (err) {
      toast.error(
        errorMessage(
          err,
          editingPartId
            ? "No se pudo actualizar el repuesto. Intenta de nuevo."
            : "No se pudo agregar el repuesto. Intenta de nuevo.",
        ),
      );
    }
  }

  async function handleDeletePart(part: PartCatalogItem) {
    try {
      await removePart(part.id);
      toast.success("Repuesto eliminado.");
    } catch (err) {
      toast.error(errorMessage(err, "No se pudo eliminar el repuesto. Intenta de nuevo."));
    }
  }

  return (
    <AppShell
      title="Repuestos"
      subtitle="Catálogo de precios para las órdenes de trabajo"
      actions={
        <Button onClick={openCreate}>
          <Plus className="size-4" />
          <span className="hidden sm:inline">Nuevo repuesto</span>
        </Button>
      }
    >
      <section className="grid grid-cols-2 gap-3 xl:grid-cols-3" aria-label="Resumen del catálogo">
        <StatCard label="Referencias" value={partsCatalog.length} description="en catálogo" />
        <StatCard
          label="Margen promedio"
          value={formatMoney(averageMargin)}
          description="por repuesto vendido"
          valueClassName="text-status-success"
        />
        <StatCard
          label="Con garantía"
          value={withWarranty}
          description={`de ${partsCatalog.length} referencias`}
        />
      </section>

      <div className="relative w-full sm:max-w-xs">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Buscar por SKU o nombre"
          className="h-9 w-full rounded-md border border-border bg-card pl-9 pr-3 text-sm outline-none focus:border-primary"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-lg border border-border bg-card/90 py-10 text-center text-sm text-muted-foreground">
          No hay repuestos que coincidan con la búsqueda.
        </div>
      ) : (
        <>
          {/* Card layout below sm: a wide table forces horizontal scrolling
              on a phone, which is easy to miss entirely — stacked cards show
              every field without scrolling sideways. */}
          <div className="grid gap-2 sm:hidden">
            {filtered.map((part) => (
              <article key={part.id} className="rounded-lg border border-border bg-card/90 p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Package className="size-4 shrink-0 text-muted-foreground" />
                    <p className="font-semibold">{part.name}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    {part.warranty ? <ShieldCheck className="size-4 text-primary" /> : null}
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-7"
                      onClick={() => openEdit(part)}
                      aria-label={`Editar ${part.name}`}
                    >
                      <Pencil className="size-3.5" />
                    </Button>
                    <PartDeleteDialog part={part} onConfirm={() => handleDeletePart(part)} />
                  </div>
                </div>
                <p className="mt-1 font-mono text-[10px] text-muted-foreground">
                  {part.sku ?? "Sin SKU"}
                </p>
                <div className="mt-2 grid grid-cols-3 gap-2 border-t border-border pt-2 text-xs">
                  <div>
                    <p className="text-[9px] uppercase text-muted-foreground">Costo</p>
                    <p className="font-mono text-muted-foreground">
                      {formatMoney(part.workshopCost)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[9px] uppercase text-muted-foreground">Precio</p>
                    <p className="font-mono">{formatMoney(part.customerPrice)}</p>
                  </div>
                  <div>
                    <p className="text-[9px] uppercase text-muted-foreground">Margen</p>
                    <p className="font-mono text-status-success">
                      {formatMoney(part.customerPrice - part.workshopCost)}
                    </p>
                  </div>
                </div>
              </article>
            ))}
          </div>

          <section
            className="hidden overflow-x-auto rounded-lg border border-border bg-card/90 sm:block"
            aria-label="Catálogo de repuestos"
          >
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border font-mono text-[9px] uppercase text-muted-foreground">
                  <th className="px-4 py-3 text-left font-medium">SKU</th>
                  <th className="px-4 py-3 text-left font-medium">Repuesto</th>
                  <th className="px-4 py-3 text-right font-medium">Costo taller</th>
                  <th className="px-4 py-3 text-right font-medium">Precio cliente</th>
                  <th className="px-4 py-3 text-right font-medium">Margen</th>
                  <th className="px-4 py-3 text-center font-medium">Garantía</th>
                  <th className="px-4 py-3 text-right font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((part) => (
                  <tr key={part.id} className="transition-colors hover:bg-accent/60">
                    <td className="px-4 py-3 font-mono">{part.sku ?? "—"}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Package className="size-4 text-muted-foreground" />
                        {part.name}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-muted-foreground">
                      {formatMoney(part.workshopCost)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono">
                      {formatMoney(part.customerPrice)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-status-success">
                      {formatMoney(part.customerPrice - part.workshopCost)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {part.warranty ? (
                        <ShieldCheck className="mx-auto size-4 text-primary" />
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="size-8"
                          onClick={() => openEdit(part)}
                          aria-label={`Editar ${part.name}`}
                        >
                          <Pencil className="size-4" />
                        </Button>
                        <PartDeleteDialog part={part} onConfirm={() => handleDeletePart(part)} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </>
      )}

      <Dialog
        title={editingPartId ? "Editar repuesto" : "Nuevo repuesto"}
        open={dialogOpen}
        onClose={closeDialog}
      >
        <div className="grid gap-4 p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="SKU (opcional)"
              name="sku"
              placeholder="FR-0000"
              value={form.sku}
              onChange={(event) => setForm({ ...form, sku: event.target.value })}
            />
            <Field
              label="Nombre"
              name="name"
              placeholder="Descripción del repuesto"
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
              required
            />
            <Field
              label="Costo de taller"
              name="workshopCost"
              type="number"
              min="0"
              step="0.01"
              placeholder="0"
              value={form.workshopCost}
              onChange={(event) => setForm({ ...form, workshopCost: event.target.value })}
              required
            />
            <Field
              label="Precio al cliente"
              name="customerPrice"
              type="number"
              min="0"
              step="0.01"
              placeholder="0"
              value={form.customerPrice}
              onChange={(event) => setForm({ ...form, customerPrice: event.target.value })}
              required
            />
          </div>
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.warranty}
              onChange={(event) => setForm({ ...form, warranty: event.target.checked })}
              className="size-4 accent-primary"
            />
            Incluye garantía
          </label>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={closeDialog}>
              Cancelar
            </Button>
            <Button type="button" onClick={submitPart} disabled={!form.name}>
              <Plus className="size-4" />
              {editingPartId ? "Guardar cambios" : "Guardar repuesto"}
            </Button>
          </div>
        </div>
      </Dialog>
    </AppShell>
  );
}

function PartDeleteDialog({ part, onConfirm }: { part: PartCatalogItem; onConfirm: () => void }) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-8 text-destructive hover:text-destructive"
          aria-label={`Eliminar ${part.name}`}
        >
          <Trash2 className="size-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Eliminar {part.name}?</AlertDialogTitle>
          <AlertDialogDescription>
            Esta acción no se puede deshacer. Las órdenes que ya usaron este repuesto conservan su
            propio registro y no se verán afectadas.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>Eliminar</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
