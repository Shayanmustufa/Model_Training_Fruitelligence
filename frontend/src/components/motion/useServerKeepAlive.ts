"use client";

import { useEffect, useRef } from "react";

/**
 * useServerKeepAlive
 *
 * Silently pings /api/keepalive every INTERVAL_MS milliseconds so that
 * the Render inference backend (free tier) never reaches its 15-minute
 * inactivity sleep threshold.
 *
 * - Runs only in the browser (no SSR execution).
 * - Fires an initial ping immediately on mount so the backend is warm
 *   as soon as the user opens the page.
 * - Subsequent pings happen every 14 minutes (840,000 ms).
 * - Cleans up the interval on unmount.
 */

const INTERVAL_MS = 14 * 60 * 1000; // 14 minutes

export function useServerKeepAlive() {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const ping = async () => {
      try {
        const res = await fetch("/api/keepalive", { cache: "no-store" });
        const data = await res.json();
        console.debug("[KeepAlive] Backend ping →", data.backend ?? "unknown");
      } catch {
        // Silently ignore — not a user-facing error
        console.debug("[KeepAlive] Ping failed (network error)");
      }
    };

    // Fire immediately so the backend is warm on first page load
    ping();

    // Then repeat every 14 minutes
    intervalRef.current = setInterval(ping, INTERVAL_MS);

    return () => {
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
      }
    };
  }, []); // Empty deps — set up once on mount, tear down on unmount
}
