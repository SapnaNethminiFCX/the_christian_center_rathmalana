"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Icon } from "./Icon";

/**
 * Hook that shows a "Saved" badge for `durationMs` milliseconds after
 * `triggerSaved()` is called. Use wherever an API save completes.
 */
export function useSavedBadge(durationMs = 2000) {
  const [saved, setSaved] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const triggerSaved = useCallback(() => {
    setSaved(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setSaved(false), durationMs);
  }, [durationMs]);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  return { saved, triggerSaved };
}

/** Inline "✓ Saved" badge shown after a successful save action. */
export function SavedBadge({ visible }: { visible: boolean }) {
  if (!visible) return null;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        fontFamily: "var(--font-body)",
        fontSize: 13,
        fontWeight: 600,
        color: "var(--color-success, #3DB55F)",
        animation: "fadeIn 150ms ease",
      }}
    >
      <Icon name="check-circle" size={14} />
      Saved
    </span>
  );
}
