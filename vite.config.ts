import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import tailwindcss from "@tailwindcss/vite";
import viteReact from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import tsConfigPaths from "vite-tsconfig-paths";

// Plain TanStack Start + Vite config, deploying as a standard Node.js server
// (see DEPLOY.md) — this replaced @lovable.dev/vite-tanstack-config, which
// used to wire up the same underlying plugins but defaulted the Nitro build to
// Cloudflare Workers and added Lovable-editor-only dev-server behavior that
// doesn't apply once the project isn't going through Lovable.
export default defineConfig(async ({ command }) => ({
  plugins: [
    tsConfigPaths({ projects: ["./tsconfig.json"] }),
    tailwindcss(),
    tanstackStart({
      server: { entry: "server" },
      importProtection: {
        behavior: "error",
        client: { files: ["**/server/**"], specifiers: ["server-only"] },
      },
    }),
    // Nitro's build-time bundling only matters for `vite build`, not `vite dev`.
    ...(command === "build" ? [(await import("nitro/vite")).nitro({ preset: "node-server" })] : []),
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
