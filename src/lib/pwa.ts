/**
 * PWA and Service Worker management utilities.
 */

export function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // @ts-expect-error iOS Safari navigator.standalone property
    window.navigator.standalone === true
  );
}

export function registerServiceWorker(): void {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
    return;
  }

  // Service workers require HTTPS or localhost/127.0.0.1
  const isSecure =
    window.isSecureContext ||
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1";

  if (!isSecure) {
    console.warn(
      "[PWA] Service Workers require a secure context (HTTPS or localhost). Current protocol:",
      window.location.protocol,
    );
    return;
  }

  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .then((registration) => {
        if (import.meta.env.DEV) {
          console.log("[PWA] ServiceWorker registered scope:", registration.scope);
        }
      })
      .catch((error) => {
        console.warn("[PWA] ServiceWorker registration failed:", error);
      });
  });
}
