import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const HOME_MANIFEST_PATH = "/manifest.webmanifest";
const ADMIN_MANIFEST_PATH = "/manifest-admin.webmanifest";
const HOME_APP_TITLE = "Bonus Calc";
const ADMIN_APP_TITLE = "Bonus Admin";

export function PwaManifestManager() {
  const location = useLocation();

  useEffect(() => {
    const isAdminRoute =
      location.pathname.startsWith("/tl") ||
      location.pathname.startsWith("/admin");

    const manifestPath = isAdminRoute
      ? `${ADMIN_MANIFEST_PATH}?v=admin`
      : `${HOME_MANIFEST_PATH}?v=home`;

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

    const appleTitleMeta = document.querySelector(
      'meta[name="apple-mobile-web-app-title"]',
    ) as HTMLMetaElement | null;

    if (appleTitleMeta) {
      appleTitleMeta.setAttribute(
        "content",
        isAdminRoute ? ADMIN_APP_TITLE : HOME_APP_TITLE,
      );
    }
  }, [location.pathname]);

  return null;
}
