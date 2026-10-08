"use client";

/**
 * Gate wrapper for MarketplaceDemo.
 * Hides the section entirely when isLiveDemo=true so the live-demo left panel
 * stays free of dense content. Snaps back to visible on exit.
 */
import { useLiveDemo } from "../layout/LiveDemoLayout";
import MarketplaceDemo from "./MarketplaceDemo";

export default function MarketplaceDemoGate() {
  const { isLiveDemo } = useLiveDemo();
  if (isLiveDemo) return null;
  return <MarketplaceDemo />;
}
