"use client";

import { useEffect, useRef } from "react";

/**
 * YouTube IFrame API global declarations.
 * The API script (`https://www.youtube.com/iframe_api`) calls
 * `window.onYouTubeIframeAPIReady` once `window.YT.Player` becomes available.
 */
declare global {
  interface Window {
    YT?: {
      Player: new (elementId: string | HTMLElement, config: YTPlayerConfig) => YTPlayer;
      PlayerState: { PLAYING: number; PAUSED: number; ENDED: number };
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

interface YTPlayer {
  destroy: () => void;
  getCurrentTime: () => number;
  getDuration: () => number;
  getPlayerState: () => number;
}

interface YTPlayerConfig {
  videoId: string;
  playerVars?: Record<string, string | number>;
  events?: {
    onReady?: (event: { target: YTPlayer }) => void;
    onStateChange?: (event: { target: YTPlayer; data: number }) => void;
  };
}

let scriptPromise: Promise<void> | null = null;

/** Load the YouTube IFrame API script exactly once per page. */
function loadYouTubeApi(): Promise<void> {
  if (typeof window === "undefined") return Promise.reject(new Error("SSR"));
  if (window.YT?.Player) return Promise.resolve();
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise<void>((resolve) => {
    const existing = document.querySelector<HTMLScriptElement>('script[src="https://www.youtube.com/iframe_api"]');
    if (!existing) {
      const script = document.createElement("script");
      script.src = "https://www.youtube.com/iframe_api";
      script.async = true;
      document.head.appendChild(script);
    }
    const previousCallback = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      if (previousCallback) previousCallback();
      resolve();
    };
  });
  return scriptPromise;
}

interface YouTubePlayerProps {
  /** Raw 11-character YouTube video ID. */
  videoId: string;
  /** Iframe accessible title. */
  title: string;
  /**
   * Fires every second during playback with the latest currentTime / duration.
   * Use this to trigger auto-complete at 90% etc.
   */
  onProgress?: (currentTime: number, duration: number) => void;
  /** Fires once when the video plays through to the end. */
  onEnded?: () => void;
}

export function YouTubePlayer({ videoId, title, onProgress, onEnded }: YouTubePlayerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const playerRef = useRef<YTPlayer | null>(null);
  const pollRef = useRef<number | null>(null);
  const onProgressRef = useRef(onProgress);
  onProgressRef.current = onProgress;
  const onEndedRef = useRef(onEnded);
  onEndedRef.current = onEnded;

  useEffect(() => {
    let cancelled = false;
    let player: YTPlayer | null = null;

    loadYouTubeApi().then(() => {
      if (cancelled || !containerRef.current || !window.YT?.Player) return;
      // Clear any previous instance before mounting a new one.
      if (playerRef.current) {
        try { playerRef.current.destroy(); } catch { /* ignore */ }
        playerRef.current = null;
      }
      player = new window.YT.Player(containerRef.current, {
        videoId,
        playerVars: { rel: 0, modestbranding: 1 },
        events: {
          onStateChange: (event) => {
            const PLAYING = window.YT?.PlayerState.PLAYING;
            const ENDED = window.YT?.PlayerState.ENDED;
            if (event.data === PLAYING) startPolling();
            else stopPolling();
            if (event.data === ENDED) onEndedRef.current?.();
          },
        },
      });
      playerRef.current = player;
    });

    function startPolling() {
      stopPolling();
      pollRef.current = window.setInterval(() => {
        try {
          if (!playerRef.current) return;
          const cur = playerRef.current.getCurrentTime();
          const dur = playerRef.current.getDuration();
          if (cur && dur) onProgressRef.current?.(cur, dur);
        } catch { /* ignore */ }
      }, 1000);
    }
    function stopPolling() {
      if (pollRef.current != null) {
        window.clearInterval(pollRef.current);
        pollRef.current = null;
      }
    }

    return () => {
      cancelled = true;
      stopPolling();
      try { player?.destroy(); } catch { /* ignore */ }
      playerRef.current = null;
    };
  }, [videoId]);

  return (
    <div className="player" style={{ padding: 0, background: "#000", position: "relative", paddingBottom: "56.25%", height: 0, overflow: "hidden" }}>
      <div
        ref={containerRef}
        title={title}
        style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", border: 0 }}
      />
    </div>
  );
}
