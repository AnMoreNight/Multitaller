import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Loader2, LogIn } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth";

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
  const { user, ready, login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  // The submit button is present in the server-rendered HTML before React
  // hydrates, so it's clickable (and Enter-submittable) a moment before its
  // handler is actually attached — a fast click, or a password manager's
  // auto-submit, silently does nothing in that window. Keeping it disabled
  // until this effect runs (hydration complete) closes that gap.
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (ready && user) navigate({ to: "/" });
  }, [ready, user, navigate]);

  useEffect(() => {
    setHydrated(true);
  }, []);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email.trim(), password);
      navigate({ to: "/" });
    } catch (err) {
      // The server only ever throws user-facing Spanish messages here (wrong
      // credentials, deactivated workshop) — show them as-is instead of a
      // single hardcoded string, so a deactivated workshop isn't mistaken for
      // a wrong password. Anything else (e.g. a network failure) falls back
      // to a generic message rather than showing a raw error like "Failed to fetch".
      const message =
        err instanceof Error && err.message
          ? err.message
          : "No se pudo iniciar sesión. Intenta de nuevo.";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="grid min-h-screen place-items-center bg-background px-4 text-foreground workshop-grid">
      <div className="w-full max-w-sm rounded-lg border border-border bg-card/90 p-6 shadow-2xl">
        <div className="flex items-center gap-3">
          <div className="grid size-11 place-items-center rounded-md bg-primary/10 font-display text-xl font-bold text-primary ring-1 ring-primary/30">
            F
          </div>
          <div className="leading-tight">
            <p className="font-display text-xl font-semibold uppercase">Ferro Taller</p>
            <p className="font-mono text-[9px] uppercase text-muted-foreground">Acceso al panel</p>
          </div>
        </div>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-1.5">
            <Label htmlFor="email">Correo</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Contraseña</Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </div>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          <Button type="submit" className="w-full" disabled={submitting || !hydrated}>
            {submitting ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <>
                <LogIn className="size-4" />
                Iniciar sesión
              </>
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
