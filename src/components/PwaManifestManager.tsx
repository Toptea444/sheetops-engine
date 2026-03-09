import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const HOME_MANIFEST_PATH = "/manifest.webmanifest";
const ADMIN_MANIFEST_PATH = "/manifest-admin.webmanifest";

export function PwaManifestManager() {
  const location = useLocation();

  useEffect(() => {
    const isAdminRoute =
      location.pathname.startsWith("/tl") ||
      location.pathname.startsWith("/admin");

    const manifestPath = isAdminRoute
      ? ADMIN_MANIFEST_PATH
      : HOME_MANIFEST_PATH;

    let manifestLink = document.querySelector(
      'link[rel="manifest"]',
    ) as HTMLLinkElement | null;

    if (!manifestLink) {
      manifestLink = document.createElement("link");
      manifestLink.rel = "manifest";
      document.head.appendChild(manifestLink);
    }

    if (manifestLink.href !== `${window.location.origin}${manifestPath}`) {
      manifestLink.setAttribute("href", manifestPath);
    }
  }, [location.pathname]);

  return null;
}
