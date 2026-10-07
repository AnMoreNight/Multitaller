import { createFileRoute } from "@tanstack/react-router";
import { Package, Plus, Search, ShieldCheck } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { AppShell, RestrictedAccess } from "@/components/taller/AppShell";
import { Dialog, Field, StatCard } from "@/components/taller/ui";
import { Button } from "@/components/ui/button";
import { useRequireAuth } from "@/lib/auth";
import { useData } from "@/lib/store";
import { formatMoney } from "@/lib/taller-data";
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

function PartsPage() {
  const { user } = useRequireAuth();
  const { partsCatalog, addPart } = useData();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({
    sku: "",
    name: "",
    workshopCost: "",
    customerPrice: "",
    warranty: false,
  });

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

  function resetForm() {
    setForm({
      sku: "",
      name: "",
      workshopCost: "",
      customerPrice: "",
      warranty: false,
    });
  }

  async function submitPart() {
    try {
      await addPart({
        ...optional("sku", form.sku),
        name: form.name,
        workshopCost: Number(form.workshopCost) || 0,
        customerPrice: Number(form.customerPrice) || 0,
        warranty: form.warranty,
      });
      setDialogOpen(false);
      resetForm();
      toast.success("Repuesto agregado.");
    } catch (err) {
      toast.error(errorMessage(err, "No se pudo agregar el repuesto. Intenta de nuevo."));
    }
  }

  return (
    <AppShell
      title="Repuestos"
      subtitle="Catálogo de precios para las órdenes de trabajo"
      actions={
        <Button onClick={() => setDialogOpen(true)}>
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
                  {part.warranty ? <ShieldCheck className="size-4 shrink-0 text-primary" /> : null}
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
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </>
      )}

      <Dialog
        title="Nuevo repuesto"
        open={dialogOpen}
        onClose={() => {
          setDialogOpen(false);
          resetForm();
        }}
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
            <Button type="button" onClick={submitPart} disabled={!form.name}>
              <Plus className="size-4" />
              Guardar repuesto
            </Button>
          </div>
        </div>
      </Dialog>
    </AppShell>
  );
}
