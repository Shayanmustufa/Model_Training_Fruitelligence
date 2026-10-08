"use client";

import { useServerKeepAlive } from "@/components/motion/useServerKeepAlive";

/**
 * ServerKeepAlive
 *
 * A zero-UI client component that activates the keep-alive ping loop.
 * Rendered once inside RootLayout so it persists across all page navigations.
 * Renders nothing visible — it only runs the useServerKeepAlive hook.
 */
export default function ServerKeepAlive() {
  useServerKeepAlive();
  return null;
}
