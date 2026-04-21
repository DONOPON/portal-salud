// Detects "stale bundle" crashes (TSRSplitComponent is not defined,
// ChunkLoadError, "Failed to fetch dynamically imported module", etc.)
// and recovers by performing a single hard reload. If the reload does not
// fix the problem, an overlay is shown so the user knows what to do next.

const STORAGE_KEY = "__chunkRecoveryAttempt";
const RELOAD_WINDOW_MS = 30_000;

const STALE_PATTERNS = [
  /TSRSplitComponent/i,
  /SplitComponent is not defined/i,
  /ChunkLoadError/i,
  /Loading chunk \d+ failed/i,
  /Failed to fetch dynamically imported module/i,
  /Importing a module script failed/i,
  /error loading dynamically imported module/i,
];

function isStaleBundleError(message: string | undefined | null): boolean {
  if (!message) return false;
  return STALE_PATTERNS.some((re) => re.test(message));
}

function recentlyTriedReload(): boolean {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    const ts = Number(raw);
    if (!Number.isFinite(ts)) return false;
    return Date.now() - ts < RELOAD_WINDOW_MS;
  } catch {
    return false;
  }
}

function markReloadAttempt() {
  try {
    sessionStorage.setItem(STORAGE_KEY, String(Date.now()));
  } catch {
    // ignore storage failures
  }
}

export function clearReloadAttempt() {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

function showRecoveryOverlay(message: string) {
  if (typeof document === "undefined") return;
  if (document.getElementById("__chunk_recovery_overlay")) return;

  const overlay = document.createElement("div");
  overlay.id = "__chunk_recovery_overlay";
  overlay.setAttribute("role", "alertdialog");
  overlay.setAttribute("aria-modal", "true");
  overlay.style.cssText = [
    "position:fixed",
    "inset:0",
    "z-index:2147483647",
    "background:rgba(15,23,42,0.85)",
    "display:flex",
    "align-items:center",
    "justify-content:center",
    "padding:16px",
    "font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif",
    "color:#0f172a",
  ].join(";");

  overlay.innerHTML = `
    <div style="background:#fff;max-width:480px;width:100%;border-radius:12px;padding:24px;box-shadow:0 20px 50px rgba(0,0,0,0.35);">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px;">
        <div style="width:36px;height:36px;border-radius:50%;background:#fee2e2;display:flex;align-items:center;justify-content:center;color:#b91c1c;font-weight:700;">!</div>
        <h2 style="margin:0;font-size:18px;font-weight:700;">No se pudo cargar la app</h2>
      </div>
      <p style="margin:0 0 12px;font-size:14px;line-height:1.5;color:#334155;">
        Detectamos un error al cargar uno de los archivos de la aplicación.
        Suele deberse a una versión antigua guardada en tu navegador o en la caché de GitHub Pages.
      </p>
      <ol style="margin:0 0 16px 20px;padding:0;font-size:13px;line-height:1.6;color:#334155;">
        <li>Pulsa <strong>Recargar limpio</strong>.</li>
        <li>Si vuelve a fallar, abre el sitio en una pestaña <strong>incógnito</strong>.</li>
        <li>Como último recurso, en DevTools &gt; Application &gt; Storage, pulsa <em>Clear site data</em>.</li>
      </ol>
      <details style="margin-bottom:16px;font-size:12px;color:#64748b;">
        <summary style="cursor:pointer;">Detalle técnico</summary>
        <pre style="margin:8px 0 0;padding:8px;background:#f1f5f9;border-radius:6px;white-space:pre-wrap;word-break:break-word;font-size:11px;">${message
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")}</pre>
      </details>
      <div style="display:flex;gap:8px;justify-content:flex-end;">
        <button id="__chunk_recovery_dismiss" style="padding:8px 14px;border-radius:8px;border:1px solid #cbd5e1;background:#fff;font-size:13px;cursor:pointer;">Cerrar</button>
        <button id="__chunk_recovery_reload" style="padding:8px 14px;border-radius:8px;border:0;background:#2563eb;color:#fff;font-size:13px;font-weight:600;cursor:pointer;">Recargar limpio</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  const dismiss = overlay.querySelector<HTMLButtonElement>(
    "#__chunk_recovery_dismiss",
  );
  const reload = overlay.querySelector<HTMLButtonElement>(
    "#__chunk_recovery_reload",
  );

  dismiss?.addEventListener("click", () => overlay.remove());
  reload?.addEventListener("click", () => {
    clearReloadAttempt();
    hardReload();
  });
}

function hardReload() {
  // Append a cache-buster so GitHub Pages / the browser fetch a fresh index.
  try {
    const url = new URL(window.location.href);
    url.searchParams.set("_v", Date.now().toString(36));
    window.location.replace(url.toString());
  } catch {
    window.location.reload();
  }
}

function handleStaleError(message: string) {
  if (recentlyTriedReload()) {
    showRecoveryOverlay(message);
    return;
  }
  markReloadAttempt();
  hardReload();
}

export function installChunkRecovery() {
  if (typeof window === "undefined") return;
  if ((window as unknown as { __chunkRecoveryInstalled?: boolean })
    .__chunkRecoveryInstalled) {
    return;
  }
  (window as unknown as { __chunkRecoveryInstalled?: boolean })
    .__chunkRecoveryInstalled = true;

  window.addEventListener("error", (event) => {
    const msg =
      event?.message ||
      (event?.error && (event.error.message || String(event.error))) ||
      "";
    if (isStaleBundleError(msg)) {
      event.preventDefault?.();
      handleStaleError(msg);
    }
  });

  window.addEventListener("unhandledrejection", (event) => {
    const reason = event?.reason;
    const msg =
      (reason && (reason.message || String(reason))) || "";
    if (isStaleBundleError(msg)) {
      event.preventDefault?.();
      handleStaleError(msg);
    }
  });
}
