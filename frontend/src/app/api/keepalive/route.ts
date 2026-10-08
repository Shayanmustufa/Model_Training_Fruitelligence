import { NextResponse } from "next/server";

/**
 * GET /api/keepalive
 *
 * Server-side proxy that pings the Render inference backend's /health
 * endpoint to prevent it from sleeping (Render free tier sleeps after
 * 15 minutes of inactivity).
 *
 * Called by the client-side useServerKeepAlive hook every 14 minutes.
 *
 * Environment variables:
 *   CLASSIFY_API_URL — base URL of the inference backend
 *                      e.g. https://agrovisoon-classifier-api.onrender.com
 */

export const dynamic = "force-dynamic";

export async function GET() {
  const backendBase =
    process.env.CLASSIFY_API_URL?.replace(/\/$/, "") ?? "http://localhost:8000";

  const healthUrl = `${backendBase}/health`;

  try {
    const response = await fetch(healthUrl, {
      method: "GET",
      // Use a 10-second timeout so the route doesn't hang if Render is cold-booting
      signal: AbortSignal.timeout(10_000),
      cache: "no-store",
    });

    if (response.ok) {
      const data = await response.json().catch(() => ({}));
      return NextResponse.json(
        { status: "ok", backend: "alive", detail: data },
        { status: 200 }
      );
    }

    return NextResponse.json(
      { status: "degraded", backend: "error", httpStatus: response.status },
      { status: 200 } // still 200 so client doesn't treat it as a failure
    );
  } catch (err) {
    // Backend unreachable / timeout — log but don't crash
    console.warn("[/api/keepalive] Backend ping failed:", err);
    return NextResponse.json(
      { status: "unreachable", backend: "offline" },
      { status: 200 }
    );
  }
}
