import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/classify
 *
 * Proxy that forwards the uploaded image to the Python FastAPI inference
 * server (running on Render in production, or localhost:8000 locally).
 *
 * Environment variables:
 *   CLASSIFY_API_URL — full URL of the inference backend
 *                      e.g. https://agrovisoon-classifier-api.onrender.com
 *                      Defaults to http://localhost:8000 for local dev.
 */

export const dynamic = "force-dynamic";
export const maxDuration = 60; // Allow up to 60s for Render cold starts

export async function POST(req: NextRequest) {
  // ── Forward the multipart form-data straight through ───────────────────
  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json(
      { error: "Invalid request — expected multipart/form-data with an 'image' field." },
      { status: 400 }
    );
  }

  const imageEntry = formData.get("image");
  if (!imageEntry || !(imageEntry instanceof Blob)) {
    return NextResponse.json(
      { error: "No image field found in the request." },
      { status: 400 }
    );
  }

  const classifyApiUrl =
    process.env.CLASSIFY_API_URL?.replace(/\/$/, "") ?? "http://localhost:8000";

  // ── Call Python backend ────────────────────────────────────────────────
  try {
    const backendResponse = await fetch(`${classifyApiUrl}/classify`, {
      method: "POST",
      body: formData,
      signal: AbortSignal.timeout(55_000),
    });

    if (!backendResponse.ok) {
      const raw = await backendResponse.text();
      console.error("[/api/classify] Backend error:", backendResponse.status, raw);

      // FastAPI errors look like {"detail": "..."}; surface only the message
      let detail = raw;
      try {
        const parsed = JSON.parse(raw);
        if (typeof parsed?.detail === "string") detail = parsed.detail;
      } catch {
        // Not JSON (e.g. an HTML error page from Render) — keep a short excerpt
        detail = raw.slice(0, 200);
      }

      return NextResponse.json(
        { error: detail || `Inference server error (${backendResponse.status}).` },
        { status: backendResponse.status }
      );
    }

    let data: unknown;
    try {
      data = await backendResponse.json();
    } catch {
      console.error("[/api/classify] Backend returned invalid JSON.");
      return NextResponse.json(
        { error: "The classifier returned an invalid response." },
        { status: 502 }
      );
    }

    if (
      !data ||
      typeof data !== "object" ||
      Array.isArray(data) ||
      !("is_date" in data) ||
      typeof data.is_date !== "boolean" ||
      !("variety" in data) ||
      (data.variety !== null && typeof data.variety !== "string") ||
      !("confidence" in data) ||
      typeof data.confidence !== "number" ||
      !Number.isFinite(data.confidence)
    ) {
      console.error("[/api/classify] Backend returned an invalid classification payload.");
      return NextResponse.json(
        { error: "The classifier returned an invalid response." },
        { status: 502 }
      );
    }

    return NextResponse.json(data);
  } catch (err) {
    if (err instanceof Error && err.name === "TimeoutError") {
      console.error("[/api/classify] Backend request timed out.");
      return NextResponse.json(
        { error: "The classification request timed out. Please try again." },
        { status: 504 }
      );
    }

    // Network error — backend is unreachable
    console.error("[/api/classify] Backend unreachable:", err);
    return NextResponse.json(
      {
        error:
          "The AI classifier backend is currently offline. " +
          "Please ensure the inference server is running and try again.",
      },
      { status: 503 }
    );
  }
}
