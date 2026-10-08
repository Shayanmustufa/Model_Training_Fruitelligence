import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/profile
 * Proxies to the Python backend GET /profile endpoint.
 * Returns the saved user health profile, or { exists: false } if none saved yet.
 */

export const dynamic = "force-dynamic";

const backendBase = () =>
  (process.env.CLASSIFY_API_URL ?? "http://localhost:8000").replace(/\/$/, "");

export async function GET() {
  try {
    const res = await fetch(`${backendBase()}/profile`, { cache: "no-store" });
    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ exists: false }, { status: 200 });
  }
}

/**
 * POST /api/profile
 * Proxies to the Python backend POST /profile endpoint.
 * Body: UserProfile JSON object.
 */
export async function POST(req: NextRequest) {
  // Persistence disabled as requested — do not save disease data to backend server
  /*
  try {
    const body = await req.json();
    const res = await fetch(`${backendBase()}/profile`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json(
      { error: "Could not reach inference backend." },
      { status: 503 }
    );
  }
  */
  return NextResponse.json({ status: "ok", message: "Persistence disabled" });
}
