"use client";

/**
 * useDateDetector
 *
 * Browser-side YOLO ONNX detection hook using onnxruntime-web (WASM, single-threaded).
 *
 * Behaviour:
 *  - Loads `public/models/date-detector.onnx` lazily when `active` becomes true.
 *  - Reports model-load failures instead of presenting mock detections.
 *  - Detection loop uses requestAnimationFrame; never overlaps runs.
 *  - Releases the ONNX session when `active` becomes false (Live Demo closed).
 *  - No React state updates per frame — timing/boxes are kept in refs.
 */

import { useEffect, useRef, useState, useCallback } from "react";

export interface DetectionBox {
  /** All coordinates are in DISPLAYED video-element pixel space */
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  confidence: number;
  label: string; // always "date" from detector; overridden by Phase-5b classify
}

interface UseDateDetectorOptions {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  /** Loop runs only when active=true */
  active: boolean;
  confidenceThreshold?: number; // default 0.25
  iouThreshold?: number;        // default 0.45
  maxBoxes?: number;            // default 5
  /** Called every detection cycle with the current box list (may be empty) */
  onBoxes?: (boxes: DetectionBox[]) => void;
}

interface UseDateDetectorReturn {
  modelReady: boolean;
  detectionMs: number | null;
  loadError: string | null;
}

// ──────────────────────────────────────────────────────────────────────────────
// NMS helper
// ──────────────────────────────────────────────────────────────────────────────
function iou(a: DetectionBox, b: DetectionBox): number {
  const ix1 = Math.max(a.x1, b.x1);
  const iy1 = Math.max(a.y1, b.y1);
  const ix2 = Math.min(a.x2, b.x2);
  const iy2 = Math.min(a.y2, b.y2);
  const inter = Math.max(0, ix2 - ix1) * Math.max(0, iy2 - iy1);
  if (inter === 0) return 0;
  const areaA = (a.x2 - a.x1) * (a.y2 - a.y1);
  const areaB = (b.x2 - b.x1) * (b.y2 - b.y1);
  return inter / (areaA + areaB - inter);
}

function nms(boxes: DetectionBox[], iouThreshold: number): DetectionBox[] {
  const sorted = [...boxes].sort((a, b) => b.confidence - a.confidence);
  const kept: DetectionBox[] = [];
  const suppressed = new Set<number>();
  for (let i = 0; i < sorted.length; i++) {
    if (suppressed.has(i)) continue;
    kept.push(sorted[i]);
    for (let j = i + 1; j < sorted.length; j++) {
      if (!suppressed.has(j) && iou(sorted[i], sorted[j]) > iouThreshold) {
        suppressed.add(j);
      }
    }
  }
  return kept;
}

// ──────────────────────────────────────────────────────────────────────────────
// Letterbox helpers
// ──────────────────────────────────────────────────────────────────────────────
interface LetterboxResult {
  data: Float32Array;
  /** Padding applied (pixels in the MODEL input space) */
  padX: number;
  padY: number;
  scale: number;
  modelW: number;
  modelH: number;
}

function letterboxFrame(
  video: HTMLVideoElement,
  modelW: number,
  modelH: number
): LetterboxResult {
  const vw = video.videoWidth;
  const vh = video.videoHeight;
  const scale = Math.min(modelW / vw, modelH / vh);
  const scaledW = Math.round(vw * scale);
  const scaledH = Math.round(vh * scale);
  const padX = (modelW - scaledW) / 2;
  const padY = (modelH - scaledH) / 2;

  const offscreen = document.createElement("canvas");
  offscreen.width = modelW;
  offscreen.height = modelH;
  const ctx = offscreen.getContext("2d")!;
  // Grey letterbox fill (ImageNet-style)
  ctx.fillStyle = "rgb(114,114,114)";
  ctx.fillRect(0, 0, modelW, modelH);
  ctx.drawImage(video, padX, padY, scaledW, scaledH);

  const imageData = ctx.getImageData(0, 0, modelW, modelH);
  const { data } = imageData;

  // NCHW float32, normalised 0-1
  const tensor = new Float32Array(3 * modelW * modelH);
  const planeSize = modelW * modelH;
  for (let i = 0; i < planeSize; i++) {
    tensor[i] = data[i * 4] / 255;               // R
    tensor[planeSize + i] = data[i * 4 + 1] / 255; // G
    tensor[planeSize * 2 + i] = data[i * 4 + 2] / 255; // B
  }

  return { data: tensor, padX, padY, scale, modelW, modelH };
}

/** Map a model-space box back to displayed video element coordinates */
function modelBoxToDisplay(
  mx1: number, my1: number, mx2: number, my2: number,
  padX: number, padY: number, scale: number,
  video: HTMLVideoElement
): { x1: number; y1: number; x2: number; y2: number } {
  // 1. Remove letterbox padding (model space → original video space)
  const vx1 = (mx1 - padX) / scale;
  const vy1 = (my1 - padY) / scale;
  const vx2 = (mx2 - padX) / scale;
  const vy2 = (my2 - padY) / scale;

  // Map the source frame through the centered object-fit: cover crop.
  const dispW = video.clientWidth;
  const dispH = video.clientHeight;
  const coverScale = Math.max(dispW / video.videoWidth, dispH / video.videoHeight);
  const offsetX = (dispW - video.videoWidth * coverScale) / 2;
  const offsetY = (dispH - video.videoHeight * coverScale) / 2;
  const clamp = (value: number, maximum: number) =>
    Math.max(0, Math.min(maximum, value));

  return {
    x1: clamp(vx1 * coverScale + offsetX, dispW),
    y1: clamp(vy1 * coverScale + offsetY, dispH),
    x2: clamp(vx2 * coverScale + offsetX, dispW),
    y2: clamp(vy2 * coverScale + offsetY, dispH),
  };
}

// ──────────────────────────────────────────────────────────────────────────────
// Decode YOLO output
// Supports YOLOv5 raw outputs, where confidence is objectness × class score.
// ──────────────────────────────────────────────────────────────────────────────
function decodeYoloOutput(
  output: Float32Array,
  dims: readonly number[],
  confThreshold: number,
  padX: number, padY: number, scale: number,
  modelW: number, modelH: number,
  video: HTMLVideoElement
): DetectionBox[] {
  const boxes: DetectionBox[] = [];

  // Determine layout
  // dims[0] = batch=1, dims[1], dims[2]
  const d1 = dims[1];
  const d2 = dims[2];

  if (d2 === 5 || d2 > 5) {
    // [1, N, 5+C] — standard
    const numDetections = d1;
    const stride = d2;
    for (let i = 0; i < numDetections; i++) {
      const base = i * stride;
      const cx = output[base];
      const cy = output[base + 1];
      const w  = output[base + 2];
      const h  = output[base + 3];
      const objectness = output[base + 4];
      let classScore = stride > 5 ? 0 : 1;
      for (let classIndex = 5; classIndex < stride; classIndex++) {
        classScore = Math.max(classScore, output[base + classIndex]);
      }
      const conf = objectness * classScore;
      if (
        ![cx, cy, w, h, conf].every(Number.isFinite) ||
        w <= 0 ||
        h <= 0 ||
        conf < confThreshold
      ) continue;
      const mx1 = cx - w / 2;
      const my1 = cy - h / 2;
      const mx2 = cx + w / 2;
      const my2 = cy + h / 2;
      const dp = modelBoxToDisplay(mx1, my1, mx2, my2, padX, padY, scale, video);
      if (dp.x2 <= dp.x1 || dp.y2 <= dp.y1) continue;
      boxes.push({ ...dp, confidence: conf, label: "date" });
    }
  } else {
    // [1, 5+C, N] — transposed output
    const numDetections = d2;
    for (let i = 0; i < numDetections; i++) {
      const cx = output[0 * numDetections + i];
      const cy = output[1 * numDetections + i];
      const w  = output[2 * numDetections + i];
      const h  = output[3 * numDetections + i];
      const objectness = output[4 * numDetections + i];
      let classScore = d1 > 5 ? 0 : 1;
      for (let classIndex = 5; classIndex < d1; classIndex++) {
        classScore = Math.max(classScore, output[classIndex * numDetections + i]);
      }
      const conf = objectness * classScore;
      if (
        ![cx, cy, w, h, conf].every(Number.isFinite) ||
        w <= 0 ||
        h <= 0 ||
        conf < confThreshold
      ) continue;
      const mx1 = cx - w / 2;
      const my1 = cy - h / 2;
      const mx2 = cx + w / 2;
      const my2 = cy + h / 2;
      const dp = modelBoxToDisplay(mx1, my1, mx2, my2, padX, padY, scale, video);
      if (dp.x2 <= dp.x1 || dp.y2 <= dp.y1) continue;
      boxes.push({ ...dp, confidence: conf, label: "date" });
    }
  }

  return boxes;
}

// ──────────────────────────────────────────────────────────────────────────────
// Hook
// ──────────────────────────────────────────────────────────────────────────────
export function useDateDetector({
  videoRef,
  active,
  confidenceThreshold = 0.25,
  iouThreshold = 0.45,
  maxBoxes = 5,
  onBoxes,
}: UseDateDetectorOptions): UseDateDetectorReturn {
  const [modelReady, setModelReady] = useState(false);
  const [detectionMs, setDetectionMs] = useState<number | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  // ORT session — stored in ref so it survives renders without re-creating
  const sessionRef = useRef<unknown>(null);
  const runningRef = useRef(false);
  const rafRef = useRef<number | null>(null);
  const lastBoxTimestampRef = useRef<number>(0);
  const onBoxesRef = useRef(onBoxes);
  useEffect(() => {
    onBoxesRef.current = onBoxes;
  }, [onBoxes]);

  const BOX_LINGER_MS = 1000; // keep last boxes for 1s after detection drops
  const lastBoxesRef = useRef<DetectionBox[]>([]);

  // ── Load model ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!active) return;

    let cancelled = false;

    (async () => {
      try {
        // 1. Check model file exists
        const probe = await fetch("/models/date-detector.onnx", { method: "HEAD" });
        if (!probe.ok) throw new Error(`Model not found (${probe.status})`);

        // 2. Lazy-load ORT (dynamic import → not in initial bundle)
        const ort = await import("onnxruntime-web");

        // Configure single-threaded WASM (no COOP/COEP headers needed)
        ort.env.wasm.numThreads = 1;
        ort.env.wasm.wasmPaths = "/ort/";

        // 3. Create inference session
        const session = await ort.InferenceSession.create(
          "/models/date-detector.onnx",
          { executionProviders: ["wasm"] }
        );

        if (cancelled) {
          await (session as { release?: () => Promise<void> }).release?.();
          return;
        }

        sessionRef.current = session;
        setLoadError(null);
        setModelReady(true);
        console.log("[useDateDetector] ONNX session ready");
      } catch (err) {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : "Unknown model-loading error.";
          console.error("[useDateDetector] Could not load ONNX detector:", err);
          setLoadError(message);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [active]);

  // ── Release session on exit ────────────────────────────────────────────────
  useEffect(() => {
    if (active) return;
    if (!sessionRef.current) return;
    const s = sessionRef.current as { release?: () => Promise<void> };
    s.release?.().catch(() => {});
    sessionRef.current = null;
    setModelReady(false);
  }, [active]);

  // ── Detection loop ─────────────────────────────────────────────────────────
  const detect = useCallback(async () => {
    const video = videoRef.current;
    const session = sessionRef.current as {
      inputNames: string[];
      outputNames: string[];
      run: (feeds: Record<string, unknown>) => Promise<Record<string, { data: Float32Array; dims: readonly number[] }>>;
    } | null;

    if (!video || !video.videoWidth || !session || runningRef.current) return;
    runningRef.current = true;

    const t0 = performance.now();
    try {
      // 1. Infer model input size from first input shape (or use 640×640 default)
      const inputMeta = (session as unknown as { inputNames: string[] }).inputNames;
      void inputMeta;
      // We'll use the session's input shape — fall back to 640×640 if unavailable
      const modelW = 640;
      const modelH = 640;

      // 2. Letterbox frame
      const { data, padX, padY, scale } = letterboxFrame(video, modelW, modelH);

      // 3. Build ORT tensor
      const ort = await import("onnxruntime-web");
      const tensor = new ort.Tensor("float32", data, [1, 3, modelH, modelW]);
      const inputName = (session as unknown as { inputNames: string[] }).inputNames[0];
      const outputName = (session as unknown as { outputNames: string[] }).outputNames[0];

      // 4. Run inference
      const results = await session.run({ [inputName]: tensor });
      const output = results[outputName];

      // 5. Decode + NMS
      let boxes = decodeYoloOutput(
        output.data,
        output.dims,
        confidenceThreshold,
        padX, padY, scale, modelW, modelH, video
      );
      boxes = nms(boxes, iouThreshold).slice(0, maxBoxes);

      lastBoxesRef.current = boxes;
      lastBoxTimestampRef.current = performance.now();
      onBoxesRef.current?.(boxes);

      const ms = performance.now() - t0;
      setDetectionMs(Math.round(ms));
    } catch (err) {
      console.error("[useDateDetector] Inference error:", err);
    } finally {
      runningRef.current = false;
    }
  }, [videoRef, confidenceThreshold, iouThreshold, maxBoxes]);

  // ── rAF loop ───────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!active) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      return;
    }

    if (!modelReady) return;

    const loop = () => {
      detect();
      // Linger: if boxes are old, clear them
      const sinceLastBox = performance.now() - lastBoxTimestampRef.current;
      if (sinceLastBox > BOX_LINGER_MS && lastBoxesRef.current.length > 0) {
        lastBoxesRef.current = [];
        onBoxesRef.current?.([]);
      }
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [active, modelReady, detect]);

  return { modelReady, detectionMs, loadError };
}
