import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { TanStackRouterVite } from "@tanstack/router-plugin/vite";
import tailwindcss from "@tailwindcss/vite";
import tsconfigPaths from "vite-tsconfig-paths";
import { cloudflare } from "@cloudflare/vite-plugin";

export default defineConfig(({ command }) => ({
  base: command === "build" ? "/health-flow-sim/" : "/",
  plugins: [
    tsconfigPaths(),
    TanStackRouterVite({
      target: "react",
      autoCodeSplitting: true,
      routesDirectory: "./src/routes",
      generatedRouteTree: "./src/routeTree.gen.ts",
    }),
    react(),
    tailwindcss(),
    // Only enable the Cloudflare Worker integration for dev/preview (Lovable sandbox runs on workerd).
    // For production builds (GitHub Pages) we want a pure static SPA in dist/.
    ...(command === "build" ? [] : [cloudflare()]),
  ],
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
}));
