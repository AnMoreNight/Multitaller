import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { LogIn, ShieldCheck, Wrench } from "lucide-react";
import { useEffect } from "react";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { demoWorkshop } from "@/lib/taller-data";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Iniciar sesión | Ferro Taller" },
      {
        name: "description",
        content: "Acceso al panel operativo de Ferro Taller.",
      },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const { user, users, ready, login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (ready && user) navigate({ to: "/" });
  }, [ready, user, navigate]);

  function enterAs(userId: string) {
    login(userId);
    navigate({ to: "/" });
  }

  return (
    <div className="grid min-h-screen place-items-center bg-background px-4 text-foreground workshop-grid">
      <div className="w-full max-w-sm rounded-lg border border-border bg-card/90 p-6 shadow-2xl">
        <div className="flex items-center gap-3">
          <div className="grid size-11 place-items-center rounded-md bg-primary/10 font-display text-xl font-bold text-primary ring-1 ring-primary/30">
            F
          </div>
          <div className="leading-tight">
            <p className="font-display text-xl font-semibold uppercase">{demoWorkshop.name}</p>
            <p className="font-mono text-[9px] uppercase text-muted-foreground">Acceso al panel</p>
          </div>
        </div>

        <p className="mt-6 text-sm text-muted-foreground">
          Esta es una demo sin servidor todavía: elige una cuenta para entrar. Cuando se habilite la
          base de datos, esto se sustituye por inicio de sesión real.
        </p>

        <div className="mt-5 space-y-2">
          {users.map((demoUser) => (
            <button
              key={demoUser.id}
              type="button"
              onClick={() => enterAs(demoUser.id)}
              className="flex w-full items-center gap-3 rounded-md border border-border bg-background/60 p-3 text-left transition-colors hover:border-primary/50 hover:bg-accent/60"
            >
              <div className="grid size-9 shrink-0 place-items-center rounded-md bg-accent text-primary">
                {demoUser.role === "admin" ? (
                  <ShieldCheck className="size-4" />
                ) : (
                  <Wrench className="size-4" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{demoUser.name}</p>
                <p className="text-xs text-muted-foreground">{demoUser.title}</p>
              </div>
              <LogIn className="size-4 text-muted-foreground" />
            </button>
          ))}
        </div>

        <Button className="mt-5 w-full" variant="secondary" disabled>
          Registro de nuevos talleres (próximamente)
        </Button>
      </div>
    </div>
  );
}
