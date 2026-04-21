import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "@tanstack/react-router";
import { getRouter } from "./router";
import { installChunkRecovery, clearReloadAttempt } from "./lib/chunkRecovery";
import "./styles.css";

installChunkRecovery();

const router = getRouter();

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof getRouter>;
  }
}

const rootEl = document.getElementById("root")!;
createRoot(rootEl).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>
);

// If the app mounted successfully, the previous reload attempt clearly worked.
clearReloadAttempt();

