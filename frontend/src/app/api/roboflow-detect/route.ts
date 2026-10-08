import { NextRequest, NextResponse } from "next/server";

const MODEL_ID = "dates-detection-dddyq/2";
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "invalid_image" }, { status: 400 });
  }

  const image = formData.get("image");
  if (!(image instanceof Blob) || !ALLOWED_IMAGE_TYPES.has(image.type) || image.size === 0) {
    return NextResponse.json({ error: "invalid_image" }, { status: 400 });
  }
  if (image.size > MAX_IMAGE_BYTES) {
    return NextResponse.json({ error: "image_too_large" }, { status: 413 });
  }

  const apiKey = process.env.ROBOFLOW_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "roboflow_not_configured" }, { status: 503 });
  }

  try {
    const imageBase64 = Buffer.from(await image.arrayBuffer()).toString("base64");
    const response = await fetch(`https://serverless.roboflow.com/${MODEL_ID}`, {
      method: "POST",
      headers: {
        Authorization: apiKey,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: imageBase64,
      signal: AbortSignal.timeout(50_000),
    });

    if (!response.ok) {
      console.error("[/api/roboflow-detect] Roboflow returned:", response.status);
      return NextResponse.json({ error: "inference_failed" }, { status: 502 });
    }

    const result: unknown = await response.json();
    if (
      !result ||
      typeof result !== "object" ||
      !("predictions" in result) ||
      !Array.isArray(result.predictions)
    ) {
      console.error("[/api/roboflow-detect] Unexpected inference response.");
      return NextResponse.json({ error: "invalid_response" }, { status: 502 });
    }

    return NextResponse.json({ predictions: result.predictions });
  } catch (error) {
    console.error("[/api/roboflow-detect] Inference request failed:", error);
    return NextResponse.json({ error: "inference_unavailable" }, { status: 502 });
  }
}
