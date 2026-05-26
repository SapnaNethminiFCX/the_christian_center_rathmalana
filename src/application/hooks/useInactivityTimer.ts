"use client";

import { useEffect, useRef } from "react";

interface Options {
  /** Idle window in minutes before `onTimeout` fires. */
  minutes: number;
  /** Whether the timer is currently armed. Pass `false` to disable (e.g. on
   *  the public site / when the user is signed out). */
  enabled?: boolean;
  /** Called when the idle window elapses with no activity. */
  onTimeout: () => void;
}

const ACTIVITY_EVENTS: Array<keyof DocumentEventMap> = [
  "mousemove",
  "mousedown",
  "keydown",
  "scroll",
  "touchstart",
];

/**
 * Sign the user out after `minutes` of no user-input activity (FR-A-008,
 * NFR-SEC-002 — V2 spec mandates 30-min web inactivity timeout).
 *
 * Activity = any of: mousemove / mousedown / keydown / scroll / touchstart,
 * plus a long-running `<video>` `timeupdate` so course-video playback keeps
 * the session alive even if the user isn't moving the mouse.
 *
 * The timer is debounced — every fresh activity event resets the deadline.
 * One `setTimeout` is alive at a time; on cleanup it's cleared.
 */
export function useInactivityTimer({ minutes, enabled = true, onTimeout }: Options) {
  // Keep `onTimeout` stable across renders so the timer can read the latest
  // closure without re-arming.
  const onTimeoutRef = useRef(onTimeout);
  useEffect(() => {
    onTimeoutRef.current = onTimeout;
  }, [onTimeout]);

  useEffect(() => {
    if (!enabled) return;
    if (typeof window === "undefined") return;

    const idleMs = Math.max(60_000, minutes * 60_000);
    let timer: ReturnType<typeof setTimeout>;

    const reset = () => {
      clearTimeout(timer);
      timer = setTimeout(() => onTimeoutRef.current(), idleMs);
    };

    // Throttle: only reset at most once every 5 seconds so a flood of
    // mousemove events doesn't thrash the timer.
    let lastReset = Date.now();
    const handler = () => {
      const now = Date.now();
      if (now - lastReset < 5000) return;
      lastReset = now;
      reset();
    };

    ACTIVITY_EVENTS.forEach((ev) => document.addEventListener(ev, handler, { passive: true }));
    // Video playback also counts as activity — find all videos and listen.
    const videoHandler = () => {
      const now = Date.now();
      if (now - lastReset < 5000) return;
      lastReset = now;
      reset();
    };
    document.addEventListener("timeupdate", videoHandler, { capture: true, passive: true });

    // Arm initial timer.
    reset();

    return () => {
      clearTimeout(timer);
      ACTIVITY_EVENTS.forEach((ev) => document.removeEventListener(ev, handler));
      document.removeEventListener("timeupdate", videoHandler, { capture: true });
    };
  }, [enabled, minutes]);
}
