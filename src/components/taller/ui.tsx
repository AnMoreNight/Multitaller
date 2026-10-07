import * as SelectPrimitive from "@radix-ui/react-select";
import { ChevronDown, X } from "lucide-react";
import {
  useId,
  type InputHTMLAttributes,
  type ReactNode,
  type TextareaHTMLAttributes,
} from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { orderStatusFlow, statusStyles, type OrderStatus } from "@/lib/taller-data";

export function StatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 font-mono text-[10px] font-medium ring-1",
        statusStyles[status],
      )}
    >
      <span className="size-1.5 rounded-full bg-current" />
      {status}
    </span>
  );
}

/**
 * Label / big number / description, stacked on three lines inside a card —
 * the pattern repeated across the dashboard, Órdenes, Repuestos and Reportes.
 * Each line used to be its own sibling <p>, which looks fine visually but
 * gives screen readers (and anything else that reads the computed accessible
 * name) no separator between them — adjacent text nodes get their edge
 * whitespace trimmed before concatenating, so "8" next to " vehículos en
 * proceso" is announced as "8vehículos en proceso". The explicit `aria-label`
 * here is a single string with no node boundaries to trim, so it reads
 * correctly regardless of how the visible lines are split up.
 */
export function StatCard({
  label,
  srLabel,
  value,
  description,
  valueClassName,
  descriptionClassName,
}: {
  label: ReactNode;
  /** Plain-text accessible name when `label` isn't a plain string (e.g. a StatusBadge). */
  srLabel?: string;
  value: ReactNode;
  description: string;
  valueClassName?: string;
  descriptionClassName?: string;
}) {
  const accessibleLabel = srLabel ?? (typeof label === "string" ? label : undefined);
  return (
    <article
      className="rounded-lg border border-border bg-card/90 p-4"
      {...(accessibleLabel ? { "aria-label": `${accessibleLabel}: ${value} ${description}` } : {})}
    >
      <div className="font-mono text-[9px] uppercase text-muted-foreground">{label}</div>
      <p className={cn("mt-1 font-mono text-2xl font-semibold sm:text-3xl", valueClassName)}>
        {value}
      </p>
      <p className={cn("mt-1 text-xs text-muted-foreground", descriptionClassName)}>
        {description}
      </p>
    </article>
  );
}

const allOrderStatuses: OrderStatus[] = [...orderStatusFlow, "Garantía"];

/**
 * A StatusBadge that opens a themed dropdown to change status. Built on the
 * bare Radix primitives (not the shadcn <Select> wrapper) because the trigger
 * needs to look exactly like a StatusBadge pill, not a bordered form control —
 * a native <select> here previously used an `opacity-0` overlay trick, but
 * Chromium renders a native select's open popup using that same opacity, so
 * the dropdown itself appeared washed out and half-invisible against the dark
 * theme.
 */
export function StatusSelect({
  status,
  onChange,
}: {
  status: OrderStatus;
  onChange: (status: OrderStatus) => void;
}) {
  // This applies the instant it's picked -- a confirmation dialog would slow
  // down the common case (a mechanic moving an order along as work happens),
  // but a wrong click with no way back is a real risk. A toast with an undo
  // action covers both: no friction for the normal case, one click to
  // recover from an accidental change.
  function handleChange(next: OrderStatus) {
    if (next === status) return;
    const previous = status;
    onChange(next);
    toast(`Estado cambiado a "${next}"`, {
      action: { label: "Deshacer", onClick: () => onChange(previous) },
    });
  }

  return (
    <SelectPrimitive.Root
      value={status}
      onValueChange={(value) => handleChange(value as OrderStatus)}
    >
      <SelectPrimitive.Trigger
        aria-label="Cambiar estado"
        className="group inline-flex items-center gap-1 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
      >
        <StatusBadge status={status} />
        <ChevronDown className="size-3 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
      </SelectPrimitive.Trigger>
      <SelectPrimitive.Portal>
        <SelectPrimitive.Content
          className="z-50 overflow-hidden rounded-md border border-border bg-popover text-popover-foreground shadow-2xl animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=top]:slide-in-from-bottom-2 origin-(--radix-select-content-transform-origin)"
          position="popper"
          sideOffset={6}
        >
          <SelectPrimitive.Viewport className="p-1">
            {allOrderStatuses.map((option) => (
              <SelectPrimitive.Item
                key={option}
                value={option}
                className="cursor-pointer select-none rounded-sm px-1 py-1 outline-none data-[highlighted]:bg-accent"
              >
                <SelectPrimitive.ItemText>
                  <StatusBadge status={option} />
                </SelectPrimitive.ItemText>
              </SelectPrimitive.Item>
            ))}
          </SelectPrimitive.Viewport>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  );
}

export function Dialog({
  title,
  open,
  onClose,
  children,
}: {
  title: string;
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-background/80 p-4 backdrop-blur-sm"
      role="presentation"
      onMouseDown={onClose}
    >
      <section
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg border border-border bg-popover shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="sticky top-0 flex items-center justify-between border-b border-border bg-popover px-5 py-4">
          <h2 className="font-display text-2xl font-semibold">{title}</h2>
          <Button variant="ghost" size="icon" aria-label="Cerrar" onClick={onClose}>
            <X className="size-4" />
          </Button>
        </header>
        {children}
      </section>
    </div>
  );
}

type FieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, "className"> & {
  label: string;
  name: string;
};

export function Field({ label, name, ...inputProps }: FieldProps) {
  return (
    <label className="grid gap-1.5 text-sm text-muted-foreground">
      {label}
      <input
        id={name}
        name={name}
        className="h-10 rounded-md border border-border bg-background px-3 text-foreground outline-none placeholder:text-muted-foreground/60 focus:border-primary focus:ring-1 focus:ring-primary"
        {...inputProps}
      />
    </label>
  );
}

export function TextareaField({
  label,
  name,
  ...textareaProps
}: { label: string; name: string } & Omit<
  TextareaHTMLAttributes<HTMLTextAreaElement>,
  "className"
>) {
  return (
    <label className="grid gap-1.5 text-sm text-muted-foreground">
      {label}
      <textarea
        id={name}
        name={name}
        rows={3}
        className="rounded-md border border-border bg-background px-3 py-2 text-foreground outline-none placeholder:text-muted-foreground/60 focus:border-primary focus:ring-1 focus:ring-primary"
        {...textareaProps}
      />
    </label>
  );
}

export function SelectField({
  label,
  value,
  onChange,
  options,
  placeholder,
  disabled = false,
}: {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: ReactNode }[];
  placeholder?: string;
  disabled?: boolean;
}) {
  const control = (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger className="h-10 bg-background">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  if (!label) return control;
  return (
    <label className="grid gap-1.5 text-sm text-muted-foreground">
      <span>{label}</span>
      {control}
    </label>
  );
}

export function CheckboxRow({
  label,
  checked,
  onChange,
  description,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  description?: string;
}) {
  // A checkbox implicitly labeled by a wrapping <label> takes its accessible
  // name from ALL of that label's text content — including the longer
  // `description` span below, if it's just sitting there unmarked. That
  // folds a long explanatory sentence into the "name" instead of the
  // "description", and accessible names (unlike descriptions) commonly get
  // truncated by assistive tech since they're meant to be short identifiers.
  // An explicit aria-label keeps the name to just `label`; aria-describedby
  // correctly routes the longer text in as a description instead.
  const descriptionId = useId();
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-md border border-border bg-background px-3 py-2.5 text-sm">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-0.5 size-4 accent-primary"
        aria-label={label}
        {...(description ? { "aria-describedby": descriptionId } : {})}
      />
      <span>
        <span className="block text-foreground">{label}</span>
        {description && (
          <span id={descriptionId} className="mt-0.5 block text-xs text-muted-foreground">
            {description}
          </span>
        )}
      </span>
    </label>
  );
}
