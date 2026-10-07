import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

// Only shown once a route takes a noticeable while to resolve (TanStack
// Router's default pendingMs/pendingMinMs), so a normal fast navigation never
// flickers it in. Without this, a slow load -- the first hit against a cold
// Vercel function + a cold Neon database, or any slow network -- showed
// nothing at all until it finished, which looked like the page was broken
// rather than loading.
function RoutePending() {
  return (
    <div className="grid min-h-screen place-items-center bg-background text-sm text-muted-foreground">
      Cargando…
    </div>
  );
}

export const getRouter = () => {
  const queryClient = new QueryClient();

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
    defaultPendingComponent: RoutePending,
  });

  return router;
};
