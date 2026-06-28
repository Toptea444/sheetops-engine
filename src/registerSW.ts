// Manual service-worker registration using the native API.
//
// The app uses vite-plugin-pwa with registerType "autoUpdate" + skipWaiting +
// clientsClaim, so a newly deployed worker activates and takes control of open
// pages on its own. The missing piece was that an OPEN app only checked for a
// new deployment on a cold start, which is why users had to fully quit and
// reopen to see the latest version. Here we:
//   1. register the generated worker,
//   2. poll the server for a new worker while the app stays open, and
//   3. reload the page once the new worker takes control.

const UPDATE_CHECK_INTERVAL = 60 * 1000; // 1 minute

export function setupServiceWorker() {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
    return;
  }

  // vite-plugin-pwa emits the worker at /sw.js by default.
  const SW_URL = "/sw.js";

  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register(SW_URL)
      .then((registration) => {
        const checkForUpdate = () => {
          if (!navigator.onLine) return;
          registration.update().catch(() => {
            /* transient network error – retry on the next tick */
          });
        };

        // Poll for new deployments while the app is open.
        setInterval(checkForUpdate, UPDATE_CHECK_INTERVAL);

        // Also check the moment the app regains focus or reconnects, so simply
        // reopening (without a full quit) immediately surfaces updates.
        window.addEventListener("focus", checkForUpdate);
        document.addEventListener("visibilitychange", () => {
          if (document.visibilityState === "visible") checkForUpdate();
        });
        window.addEventListener("online", checkForUpdate);
      })
      .catch(() => {
        /* registration failed – app still works, just without offline cache */
      });

    // When skipWaiting + clientsClaim hand control to a new worker, reload once
    // so the user is running the freshly deployed assets.
    let refreshing = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    });
  });
}
