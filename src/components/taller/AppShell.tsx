import { Link, useNavigate } from "@tanstack/react-router";
import {
  BarChart3,
  CarFront,
  Check,
  CircleDollarSign,
  ClipboardList,
  LogOut,
  Menu,
  Package,
  Pencil,
  UserCog,
  Users,
  X,
} from "lucide-react";
import { useEffect, useState, type ComponentType, type ReactNode } from "react";

import { ProfileDialog } from "@/components/taller/ProfileDialog";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { useData } from "@/lib/store";
import { formatMoney, type Role } from "@/lib/taller-data";
import { cn } from "@/lib/utils";
import { daysRemainingInMonth, monthToDateRevenue } from "@/lib/work-order";

type NavItem = {
  label: string;
  to: string;
  icon: ComponentType<{ className?: string }>;
};

const adminNavigation: NavItem[] = [
  { label: "Panel principal", to: "/", icon: BarChart3 },
  { label: "Órdenes de trabajo", to: "/ordenes", icon: ClipboardList },
  { label: "Vehículos", to: "/vehiculos", icon: CarFront },
  { label: "Clientes", to: "/clientes", icon: Users },
  { label: "Repuestos", to: "/repuestos", icon: Package },
  { label: "Reportes", to: "/reportes", icon: CircleDollarSign },
  { label: "Equipo", to: "/equipo", icon: UserCog },
];

const workerNavigation: NavItem[] = [
  { label: "Panel principal", to: "/", icon: BarChart3 },
  { label: "Órdenes de trabajo", to: "/ordenes", icon: ClipboardList },
  { label: "Vehículos", to: "/vehiculos", icon: CarFront },
];

function navigationFor(role: Role): NavItem[] {
  return role === "admin" ? adminNavigation : workerNavigation;
}

function MonthlyGoalWidget() {
  const { orders, monthlyGoal, setMonthlyGoal } = useData();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(monthlyGoal));

  const revenue = monthToDateRevenue(orders);
  const pct = monthlyGoal > 0 ? Math.min(100, Math.round((revenue / monthlyGoal) * 100)) : 0;
  const daysLeft = daysRemainingInMonth();

  function startEditing() {
    setDraft(String(monthlyGoal));
    setEditing(true);
  }

  function save() {
    const amount = Number(draft);
    if (Number.isFinite(amount) && amount > 0) setMonthlyGoal(amount);
    setEditing(false);
  }

  return (
    <div className="m-3 rounded-lg border border-border bg-card p-3">
      <div className="flex items-center justify-between">
        <p className="font-mono text-[9px] uppercase text-muted-foreground">Meta mensual</p>
        {editing ? (
          <button
            type="button"
            onClick={save}
            aria-label="Guardar meta"
            className="text-primary hover:text-primary/80"
          >
            <Check className="size-3.5" />
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs text-primary">{pct}%</span>
            <button
              type="button"
              onClick={startEditing}
              aria-label="Editar meta mensual"
              className="text-muted-foreground hover:text-foreground"
            >
              <Pencil className="size-3" />
            </button>
          </div>
        )}
      </div>
      {editing ? (
        <input
          type="number"
          min="1"
          step="1"
          autoFocus
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => event.key === "Enter" && save()}
          className="mt-1 h-8 w-full rounded-md border border-border bg-background px-2 font-mono text-sm outline-none focus:border-primary"
        />
      ) : (
        <p className="mt-1 font-mono text-lg font-semibold">
          {formatMoney(revenue)}{" "}
          <span className="text-sm text-muted-foreground">/ {formatMoney(monthlyGoal)}</span>
        </p>
      )}
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
      </div>
      <p className="mt-1.5 font-mono text-[10px] text-muted-foreground">
        {daysLeft} {daysLeft === 1 ? "día restante" : "días restantes"}
      </p>
    </div>
  );
}

export function AppShell({
  title,
  subtitle,
  actions,
  children,
}: {
  title: string;
  subtitle: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const { user, ready, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileMenu, setMobileMenu] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  useEffect(() => {
    if (ready && !user) navigate({ to: "/login" });
  }, [ready, user, navigate]);

  if (!ready || !user) {
    return (
      <div className="grid min-h-screen place-items-center bg-background text-sm text-muted-foreground">
        Cargando…
      </div>
    );
  }

  const navigation = navigationFor(user.role);

  return (
    <div className="min-h-screen bg-background text-foreground antialiased workshop-grid">
      <div className="relative flex min-h-screen">
        <aside
          className={cn(
            "fixed inset-y-0 left-0 z-40 flex w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar transition-transform md:sticky md:top-0 md:h-screen md:translate-x-0",
            mobileMenu ? "translate-x-0" : "-translate-x-full",
          )}
        >
          <div className="flex items-center gap-3 px-5 py-5">
            <div className="grid size-10 place-items-center rounded-md bg-primary/10 font-display text-xl font-bold text-primary ring-1 ring-primary/30">
              F
            </div>
            <div className="leading-tight">
              <p className="font-display text-xl font-semibold uppercase">{user.workshopName}</p>
              <p className="font-mono text-[9px] uppercase text-muted-foreground">
                Sucursal Centro
              </p>
            </div>
            <Button
              className="ml-auto md:hidden"
              variant="ghost"
              size="icon"
              aria-label="Cerrar menú"
              onClick={() => setMobileMenu(false)}
            >
              <X className="size-4" />
            </Button>
          </div>
          <nav className="mt-2 flex-1 space-y-1 px-3" aria-label="Principal">
            {navigation.map(({ label, to, icon: Icon }) => (
              <Button
                key={label}
                asChild
                variant="ghost"
                className="w-full justify-start font-medium"
              >
                <Link
                  to={to}
                  onClick={() => setMobileMenu(false)}
                  activeProps={{
                    className:
                      "bg-primary/10 text-primary ring-1 ring-primary/25 hover:bg-primary/10 hover:text-primary",
                  }}
                  activeOptions={{ exact: to === "/" }}
                >
                  <Icon className="size-4" />
                  {label}
                </Link>
              </Button>
            ))}
          </nav>
          {user.role === "admin" && <MonthlyGoalWidget />}
          <div className="flex items-center gap-3 border-t border-sidebar-border p-4">
            <button
              type="button"
              onClick={() => setProfileOpen(true)}
              className="flex min-w-0 flex-1 items-center gap-3 rounded-md text-left outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
            >
              <div className="grid size-9 shrink-0 place-items-center rounded-md bg-accent font-mono text-xs">
                {user.name
                  .split(" ")
                  .map((part) => part[0])
                  .slice(0, 2)
                  .join("")}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{user.name}</p>
                <p className="truncate text-xs text-muted-foreground">{user.title}</p>
              </div>
            </button>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Cerrar sesión"
              onClick={async () => {
                await logout();
                navigate({ to: "/login" });
              }}
            >
              <LogOut className="size-4" />
            </Button>
          </div>
        </aside>

        <ProfileDialog open={profileOpen} onClose={() => setProfileOpen(false)} />

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 flex min-h-16 items-center gap-3 border-b border-border bg-background/90 px-4 backdrop-blur-xl sm:px-6">
            <Button
              className="md:hidden"
              variant="outline"
              size="icon"
              aria-label="Abrir menú"
              onClick={() => setMobileMenu(true)}
            >
              <Menu className="size-4" />
            </Button>
            <div className="min-w-0">
              <h1 className="truncate font-display text-2xl font-semibold">{title}</h1>
              <p className="hidden font-mono text-[10px] text-muted-foreground sm:block">
                {subtitle}
              </p>
            </div>
            <div className="ml-auto flex items-center gap-2">{actions}</div>
          </header>

          <main className="flex-1 space-y-5 p-4 sm:p-6">{children}</main>
        </div>
      </div>
    </div>
  );
}

export function RestrictedAccess() {
  return (
    <div className="rounded-lg border border-border bg-card/90 p-10 text-center text-sm text-muted-foreground">
      No tienes permiso para ver esta sección. Habla con la administración del taller si necesitas
      acceso.
    </div>
  );
}
