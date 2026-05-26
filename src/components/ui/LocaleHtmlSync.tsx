"use client";

import { useLayoutEffect } from "react";
import { useAppSelector } from "@/application/hooks/useAppSelector";

/**
 * Syncs the Redux locale into the <html> element so CSS selectors like
 * html[lang="si"] and html[lang="ta"] can apply the correct script font.
 * Runs as a layout effect so the attribute is set before browser paint.
 */
export function LocaleHtmlSync() {
  const locale = useAppSelector((s) => s.locale.current);

  useLayoutEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  return null;
}
