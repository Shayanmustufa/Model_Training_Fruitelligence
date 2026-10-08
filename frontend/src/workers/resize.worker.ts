/**
 * resize.worker.ts
 *
 * Off-main-thread image resize to 224×224 JPEG using OffscreenCanvas.
 * Keeps the main thread free for React state updates and animations
 * while the canvas draw + JPEG encode happens in a dedicated worker.
 *
 * Message IN:  { bitmap: ImageBitmap }   (bitmap is transferred, not copied)
 * Message OUT: { blob: Blob }            (JPEG at quality 0.95)
 *              { error: string }         (if OffscreenCanvas is unavailable)
 */

const INFERENCE_SIZE = 224;
const JPEG_QUALITY = 0.95;

self.onmessage = async (e: MessageEvent<{ bitmap: ImageBitmap }>) => {
  const { bitmap } = e.data;
  try {
    const canvas = new OffscreenCanvas(INFERENCE_SIZE, INFERENCE_SIZE);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("OffscreenCanvas 2d context unavailable");

    // Stretch-resize — matches training Resize((224, 224))
    ctx.drawImage(bitmap, 0, 0, INFERENCE_SIZE, INFERENCE_SIZE);
    bitmap.close(); // free GPU memory immediately

    const blob = await canvas.convertToBlob({
      type: "image/jpeg",
      quality: JPEG_QUALITY,
    });

    (self as unknown as Worker).postMessage({ blob });
  } catch (err) {
    bitmap.close();
    (self as unknown as Worker).postMessage({
      error: err instanceof Error ? err.message : "Worker resize failed",
    });
  }
};
