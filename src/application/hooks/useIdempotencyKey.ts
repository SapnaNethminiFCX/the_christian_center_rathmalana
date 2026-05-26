"use client";

import { useCallback, useRef } from "react";

/**
 * Generates a fresh UUID v4 per submit attempt (not per mount).
 * Same key on retry → server returns existing report (200 OK) instead of
 * creating a duplicate (FR-CR-015 / NFR-AVA-004).
 */
export function useIdempotencyKey() {
  const keyRef = useRef<string | null>(null);

  /** Call once per submit to get a stable key for that attempt. */
  const getKey = useCallback((): string => {
    if (!keyRef.current) {
      keyRef.current = crypto.randomUUID();
    }
    return keyRef.current;
  }, []);

  /** Call after a successful submit so the next submit gets a fresh key. */
  const resetKey = useCallback(() => {
    keyRef.current = null;
  }, []);

  return { getKey, resetKey };
}
