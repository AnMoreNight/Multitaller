import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import tailwindcss from "@tailwindcss/vite";
import viteReact from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import tsConfigPaths from "vite-tsconfig-paths";

// Plain TanStack Start + Vite config (see DEPLOY.md) — this replaced
// @lovable.dev/vite-tanstack-config, which used to wire up the same underlying
// plugins but defaulted the Nitro build to Cloudflare Workers and added
// Lovable-editor-only dev-server behavior that doesn't apply once the project
// isn't going through Lovable.
//
// Two deploy targets share this one config: Vercel for staging, a plain VPS for
// production. `VERCEL=1` is a system env var Vercel itself sets on every build
// on its platform (never set locally or on the VPS), so the right Nitro preset
// is picked automatically — nothing to configure per environment.
export default defineConfig(async ({ command }) => ({
  plugins: [
    tsConfigPaths({ projects: ["./tsconfig.json"] }),
    tailwindcss(),
    tanstackStart({
      server: { entry: "server" },
      // Only the raw DB connection and cookie/session helpers are blocked here —
      // plain modules with no createServerFn/createMiddleware wrapper, so
      // nothing erases them from a client bundle if something imports them
      // directly. `*.functions.ts` (createServerFn) and auth-middleware.ts
      // (createMiddleware) are deliberately NOT matched: both are factory files
      // the client is meant to import — that's how the RPC-stub mechanism
      // works — and blocking them broke every server function/middleware call.
      importProtection: {
        behavior: "error",
        client: { files: ["**/db/client.ts", "**/session.server.ts"], specifiers: ["server-only"] },
      },
    }),
    // Nitro's build-time bundling only matters for `vite build`, not `vite dev`.
    ...(command === "build"
      ? [
          (await import("nitro/vite")).nitro({
            preset: process.env["VERCEL"] ? "vercel" : "node-server",
          }),
        ]
      : []),
    viteReact(),
  ],
  resolve: {
    // Prevents duplicate React/React Query instances (a common source of
    // "Invalid hook call" errors) if anything in the dependency tree resolves
    // its own copy of these.
    dedupe: [
      "react",
      "react-dom",
      "react/jsx-runtime",
      "react/jsx-dev-runtime",
      "@tanstack/react-query",
      "@tanstack/query-core",
    ],
  },
  optimizeDeps: {
    include: [
      "react",
      "react-dom",
      "react-dom/client",
      "react/jsx-runtime",
      "react/jsx-dev-runtime",
    ],
    ignoreOutdatedRequests: true,
  },
  server: {
    host: "::",
    port: 8080,
    // Avoids double-triggering HMR while a file is still being written.
    watch: { awaitWriteFinish: { stabilityThreshold: 1000, pollInterval: 100 } },
  },
}));
