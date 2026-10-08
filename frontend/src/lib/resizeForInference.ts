export const INFERENCE_INPUT_SIZE = 224;
const JPEG_QUALITY = 0.95;

// ── Helpers (main-thread fallback path) ──────────────────────────────────────

function canvasToJpegBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("canvas.toBlob returned null"));
      },
      "image/jpeg",
      JPEG_QUALITY
    );
  });
}

function drawStretched(
  source: CanvasImageSource,
  width: number,
  height: number
): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = INFERENCE_INPUT_SIZE;
  canvas.height = INFERENCE_INPUT_SIZE;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not get 2d canvas context");
  ctx.drawImage(source, 0, 0, width, height, 0, 0, INFERENCE_INPUT_SIZE, INFERENCE_INPUT_SIZE);
  return canvas;
}

async function resizeMainThread(file: File): Promise<Blob> {
  try {
    const bitmap = await createImageBitmap(file, {
      resizeWidth: INFERENCE_INPUT_SIZE,
      resizeHeight: INFERENCE_INPUT_SIZE,
      resizeQuality: "high",
      imageOrientation: "from-image",
    });
    try {
      const canvas = drawStretched(bitmap, bitmap.width, bitmap.height);
      return await canvasToJpegBlob(canvas);
    } finally {
      bitmap.close();
    }
  } catch {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const image = new Image();
      image.onload = () => {
        URL.revokeObjectURL(url);
        try {
          const canvas = drawStretched(image, image.naturalWidth, image.naturalHeight);
          canvasToJpegBlob(canvas).then(resolve).catch(reject);
        } catch (err) {
          reject(err);
        }
      };
      image.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error("Failed to decode image for resize"));
      };
      image.src = url;
    });
  }
}

// ── Worker path ───────────────────────────────────────────────────────────────

function resizeViaWorker(file: File): Promise<Blob> {
  return new Promise(async (resolve, reject) => {
    let worker: Worker | null = null;
    try {
      const bitmap = await createImageBitmap(file);
      worker = new Worker(
        new URL("../workers/resize.worker.ts", import.meta.url),
        { type: "module" }
      );
      worker.onmessage = (e: MessageEvent<{ blob?: Blob; error?: string }>) => {
        worker?.terminate();
        if (e.data.error) reject(new Error(e.data.error));
        else if (e.data.blob) resolve(e.data.blob);
        else reject(new Error("Worker returned no blob"));
      };
      worker.onerror = (err) => {
        worker?.terminate();
        reject(err);
      };
      // Transfer bitmap (zero-copy) to worker
      worker.postMessage({ bitmap }, [bitmap as unknown as Transferable]);
    } catch (err) {
      worker?.terminate();
      reject(err);
    }
  });
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Stretch-resize to 224×224 JPEG to match training Resize((224, 224)).
 *
 * Strategy:
 *   1. Try OffscreenCanvas worker (off-main-thread — zero jank)
 *   2. Fall back to main-thread canvas if Worker/OffscreenCanvas unavailable
 *
 * Preview should continue to use the original file.
 */
export async function resizeImageForInference(file: File): Promise<Blob> {
  if (typeof OffscreenCanvas !== "undefined" && typeof Worker !== "undefined") {
    try {
      return await resizeViaWorker(file);
    } catch {
      // Worker failed — fall through to main-thread
    }
  }
  return resizeMainThread(file);
}
