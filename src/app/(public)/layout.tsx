"use client";

import { useEffect, useLayoutEffect } from "react";
import { useTheme } from "next-themes";

/**
 * Public route group layout — landing, login, register, public catalogue.
 *
 * Forces light mode visually for the entire public surface. Without this,
 * a signed-in user who toggles dark mode and then signs out would see the
 * landing page in dark mode too — next-themes persists the choice in
 * localStorage and re-applies the `dark` class on every page load.
 *
 * We deliberately do NOT call `setTheme("light")` here — that would
 * *overwrite* the user's saved preference and lose their dark choice the
 * moment they signed back in. Instead:
 *
 *   1. `useLayoutEffect` strips `dark` from <html> synchronously, before
 *      the browser paints — no flash of dark mode.
 *   2. The saved preference is stashed on <html> as a data attribute so
 *      the cleanup can restore the exact prior state on unmount.
 *   3. A second `useEffect` re-asserts the class removal whenever the
 *      resolved theme changes during the public-route visit (e.g. another
 *      tab toggles the preference in localStorage and the storage event
 *      fires next-themes' re-apply).
 */

// On the server, `useLayoutEffect` warns; alias to `useEffect` there so the
// SSR pass is silent. The browser still gets the synchronous, pre-paint run.
const useIsoLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

function stripDark(html: HTMLElement) {
  if (html.classList.contains("dark")) html.classList.remove("dark");
  html.style.colorScheme = "light";
}

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  const { resolvedTheme } = useTheme();

  useIsoLayoutEffect(() => {
    if (typeof document === "undefined") return;
    const html = document.documentElement;
    if (!html.hasAttribute("data-prepublic-theme")) {
      const saved = html.classList.contains("dark") ? "dark" : "light";
      html.setAttribute("data-prepublic-theme", saved);
    }
    stripDark(html);

    return () => {
      const restore = html.getAttribute("data-prepublic-theme");
      html.removeAttribute("data-prepublic-theme");
      if (restore === "dark") {
        html.classList.add("dark");
        html.style.colorScheme = "dark";
      } else {
        html.style.colorScheme = "";
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-assert if next-themes flips the class while we're on the public
  // route (storage event from another tab, or a theme toggle from a
  // component that managed to render here). The data attribute keeps
  // tracking the user's actual preference for restore-on-unmount.
  useEffect(() => {
    if (typeof document === "undefined") return;
    const html = document.documentElement;
    if (resolvedTheme) html.setAttribute("data-prepublic-theme", resolvedTheme);
    stripDark(html);
  }, [resolvedTheme]);

  return <>{children}</>;
}
