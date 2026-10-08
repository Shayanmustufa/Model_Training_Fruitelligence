"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { AlertTriangle, Camera as CameraIcon, RefreshCw, X, Zap } from "lucide-react";
import { useTranslations } from "next-intl";
import { useLiveDemo } from "../layout/LiveDemoLayout";
import type { LiveClassifyResult } from "../layout/LiveDemoLayout";
import CameraFeed from "./CameraFeed";
import { useDateDetector, type DetectionBox } from "@/hooks/useDateDetector";
import { resizeImageForInference } from "@/lib/resizeForInference";

const VERIFICATION_FRAMES = 3;
const COUNTDOWN_MS = 5000;
const FRAME_SAMPLE_MS = 200;
const DETECTION_LOSS_GRACE_MS = 1000;

type PipelineStage = "searching" | "countdown" | "classifying" | "complete" | "error";

interface BestFrame {
  blob: Blob;
  confidence: number;
  area: number;
}

function drawChip(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  text: string,
  bgColor: string
) {
  ctx.font = "bold 12px system-ui, sans-serif";
  const padX = 6;
  const chipW = ctx.measureText(text).width + padX * 2;
  const chipH = 20;
  const chipY = Math.max(0, y - chipH - 2);
  ctx.fillStyle = bgColor;
  ctx.beginPath();
  ctx.roundRect(x, chipY, chipW, chipH, 4);
  ctx.fill();
  ctx.fillStyle = "#fff";
  ctx.fillText(text, x + padX, chipY + chipH - 5);
}

function drawBoxes(
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  videoRef: React.RefObject<HTMLVideoElement | null>,
  boxes: DetectionBox[],
  labelOverrides: Map<number, string>
) {
  const canvas = canvasRef.current;
  const video = videoRef.current;
  if (!canvas || !video) return;
  const width = video.clientWidth;
  const height = video.clientHeight;
  if (!width || !height) return;

  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.clearRect(0, 0, width, height);
  boxes.forEach((box, index) => {
    ctx.strokeStyle = "#22c55e";
    ctx.lineWidth = 2;
    ctx.strokeRect(box.x1, box.y1, box.x2 - box.x1, box.y2 - box.y1);
    drawChip(ctx, box.x1, box.y1, labelOverrides.get(index) ?? "date", "#22c55e");
  });
}

function boxIoU(a: DetectionBox, b: DetectionBox): number {
  const width = Math.max(0, Math.min(a.x2, b.x2) - Math.max(a.x1, b.x1));
  const height = Math.max(0, Math.min(a.y2, b.y2) - Math.max(a.y1, b.y1));
  const intersection = width * height;
  const areaA = (a.x2 - a.x1) * (a.y2 - a.y1);
  const areaB = (b.x2 - b.x1) * (b.y2 - b.y1);
  return intersection > 0 ? intersection / (areaA + areaB - intersection) : 0;
}

function canvasToJpegBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Could not encode the captured camera frame."));
    }, "image/jpeg", quality);
  });
}

async function captureFrame(
  video: HTMLVideoElement,
  box: DetectionBox,
  padding = 0.1
): Promise<Blob | null> {
  const displayWidth = video.clientWidth;
  const displayHeight = video.clientHeight;
  if (
    !video.videoWidth ||
    !video.videoHeight ||
    !displayWidth ||
    !displayHeight ||
    ![box.x1, box.y1, box.x2, box.y2].every(Number.isFinite) ||
    box.x2 <= box.x1 ||
    box.y2 <= box.y1
  ) {
    return null;
  }

  const coverScale = Math.max(
    displayWidth / video.videoWidth,
    displayHeight / video.videoHeight
  );
  const offsetX = (displayWidth - video.videoWidth * coverScale) / 2;
  const offsetY = (displayHeight - video.videoHeight * coverScale) / 2;
  const left = Math.max(0, (box.x1 - offsetX) / coverScale);
  const top = Math.max(0, (box.y1 - offsetY) / coverScale);
  const right = Math.max(0, Math.min(video.videoWidth, (box.x2 - offsetX) / coverScale));
  const bottom = Math.max(0, Math.min(video.videoHeight, (box.y2 - offsetY) / coverScale));
  const width = right - left;
  const height = bottom - top;
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return null;
  }

  const pad = Math.min(width, height) * padding;
  const sx = Math.max(0, left - pad);
  const sy = Math.max(0, top - pad);
  const sw = Math.min(video.videoWidth - sx, width + pad * 2);
  const sh = Math.min(video.videoHeight - sy, height + pad * 2);
  if (![sx, sy, sw, sh].every(Number.isFinite) || sw < 1 || sh < 1) return null;

  const cropCanvas = document.createElement("canvas");
  cropCanvas.width = Math.max(1, Math.round(sw));
  cropCanvas.height = Math.max(1, Math.round(sh));
  const cropContext = cropCanvas.getContext("2d");
  if (!cropContext) return null;
  cropContext.drawImage(video, sx, sy, sw, sh, 0, 0, cropCanvas.width, cropCanvas.height);

  return canvasToJpegBlob(cropCanvas, 0.9);
}

export default function LiveDemoPanel() {
  const t = useTranslations("liveDemo");
  const {
    setIsLiveDemo,
    setCapturedImage,
    isLiveDemo,
    setLiveResult,
  } = useLiveDemo();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [pipelineStage, setPipelineStage] = useState<PipelineStage>("searching");
  const [countdownMs, setCountdownMs] = useState(COUNTDOWN_MS);
  const [pipelineError, setPipelineError] = useState<string | null>(null);
  const pipelineStageRef = useRef<PipelineStage>("searching");
  const labelOverridesRef = useRef(new Map<number, string>());
  const latestBoxesRef = useRef<DetectionBox[]>([]);
  const previousVerificationBoxRef = useRef<DetectionBox | null>(null);
  const verifiedFramesRef = useRef(0);
  const countdownDeadlineRef = useRef(0);
  const lastPositiveDetectionRef = useRef(0);
  const lastFrameSampleRef = useRef(0);
  const samplingFrameRef = useRef(false);
  const pendingCandidateRef = useRef<Promise<void> | null>(null);
  const bestFrameRef = useRef<BestFrame | null>(null);
  const classificationStartedRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);

  const changeStage = useCallback((stage: PipelineStage) => {
    pipelineStageRef.current = stage;
    setPipelineStage(stage);
  }, []);

  const onBoxes = useCallback((boxes: DetectionBox[]) => {
    latestBoxesRef.current = boxes;
    drawBoxes(canvasRef, videoRef, boxes, labelOverridesRef.current);
    if (["complete", "classifying", "error"].includes(pipelineStageRef.current)) return;

    if (!boxes.length) {
      verifiedFramesRef.current = 0;
      previousVerificationBoxRef.current = null;
      return;
    }

    const primary = boxes[0];
    lastPositiveDetectionRef.current = Date.now();
    if (pipelineStageRef.current === "countdown") return;

    const previous = previousVerificationBoxRef.current;
    verifiedFramesRef.current =
      previous && boxIoU(previous, primary) >= 0.2
        ? verifiedFramesRef.current + 1
        : 1;
    previousVerificationBoxRef.current = primary;

    if (verifiedFramesRef.current >= VERIFICATION_FRAMES) {
      bestFrameRef.current = null;
      classificationStartedRef.current = false;
      countdownDeadlineRef.current = Date.now() + COUNTDOWN_MS;
      setCountdownMs(COUNTDOWN_MS);
      setPipelineError(null);
      changeStage("countdown");
    }
  }, [changeStage]);

  const { modelReady, detectionMs, loadError } = useDateDetector({
    videoRef,
    active: isLiveDemo,
    confidenceThreshold: 0.25,
    iouThreshold: 0.45,
    onBoxes,
  });

  useEffect(() => {
    if (!isLiveDemo) return;
    const onResize = () =>
      drawBoxes(canvasRef, videoRef, latestBoxesRef.current, labelOverridesRef.current);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [isLiveDemo]);

  const classifyBestFrame = useCallback(async () => {
    if (classificationStartedRef.current) return;
    classificationStartedRef.current = true;
    await pendingCandidateRef.current;
    changeStage("classifying");

    const bestFrame = bestFrameRef.current;
    if (!bestFrame) {
      setPipelineError(t("noFrame"));
      changeStage("error");
      return;
    }

    const previewUrl = URL.createObjectURL(bestFrame.blob);
    setCapturedImage({ blob: bestFrame.blob, url: previewUrl });
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const form = new FormData();
      const cropFile = new File([bestFrame.blob], "best-date-crop.jpg", {
        type: "image/jpeg",
      });
      const inferenceImage = await resizeImageForInference(cropFile);
      form.append("image", inferenceImage, "best-date-crop.jpg");
      const response = await fetch("/api/classify", {
        method: "POST",
        body: form,
        signal: controller.signal,
      });
      if (!response.ok) {
        let message = `${response.status}`;
        try {
          const body = await response.json();
          if (typeof body?.error === "string") message = body.error;
        } catch {
          // Keep the HTTP status when the proxy returns a non-JSON error body.
        }
        throw new Error(message);
      }

      const result: LiveClassifyResult = await response.json();
      if (result.is_date === false || !result.variety) {
        throw new Error(t("classifierRejected"));
      }
      setLiveResult({
        ...result,
        detection_confidence: bestFrame.confidence * 100,
      });
      labelOverridesRef.current.set(0, result.variety);
      changeStage("complete");
    } catch (err: unknown) {
      if ((err as Error)?.name !== "AbortError") {
        setPipelineError(err instanceof Error ? err.message : t("classificationFailed"));
        changeStage("error");
      }
    } finally {
      abortRef.current = null;
    }
  }, [changeStage, setCapturedImage, setLiveResult, t]);

  useEffect(() => {
    if (!isLiveDemo || pipelineStage !== "countdown") return;
    const intervalId = setInterval(() => {
      const remaining = Math.max(0, countdownDeadlineRef.current - Date.now());
      setCountdownMs(remaining);
      if (Date.now() - lastPositiveDetectionRef.current > DETECTION_LOSS_GRACE_MS) {
        countdownDeadlineRef.current = 0;
        bestFrameRef.current = null;
        verifiedFramesRef.current = 0;
        previousVerificationBoxRef.current = null;
        setCountdownMs(COUNTDOWN_MS);
        changeStage("searching");
      } else if (remaining === 0) {
        clearInterval(intervalId);
        void classifyBestFrame();
      }
    }, 100);
    return () => clearInterval(intervalId);
  }, [changeStage, classifyBestFrame, isLiveDemo, pipelineStage]);

  useEffect(() => {
    if (!isLiveDemo || pipelineStage !== "countdown") return;
    const sample = async () => {
      const video = videoRef.current;
      const box = latestBoxesRef.current[0];
      const now = Date.now();
      if (!video?.videoWidth || !box || samplingFrameRef.current ||
          now - lastFrameSampleRef.current < FRAME_SAMPLE_MS) return;

      samplingFrameRef.current = true;
      lastFrameSampleRef.current = now;
      const task = captureFrame(video, box, 0.1)
        .then((blob) => {
          if (!blob || pipelineStageRef.current !== "countdown") return;
          const area = (box.x2 - box.x1) * (box.y2 - box.y1);
          const best = bestFrameRef.current;
          if (!best || box.confidence > best.confidence ||
              (box.confidence === best.confidence && area > best.area)) {
            bestFrameRef.current = {
              blob,
              confidence: box.confidence,
              area,
            };
          }
        })
        .catch((err: unknown) => console.error("[LiveDemoPanel] Frame capture failed:", err))
        .finally(() => {
          samplingFrameRef.current = false;
          if (pendingCandidateRef.current === task) pendingCandidateRef.current = null;
        });
      pendingCandidateRef.current = task;
    };
    const intervalId = setInterval(() => {
      if (!document.hidden) void sample();
    }, 50);
    return () => clearInterval(intervalId);
  }, [isLiveDemo, pipelineStage]);

  useEffect(() => () => abortRef.current?.abort(), []);

  const retryPipeline = () => {
    classificationStartedRef.current = false;
    verifiedFramesRef.current = 0;
    previousVerificationBoxRef.current = null;
    bestFrameRef.current = null;
    labelOverridesRef.current.clear();
    setPipelineError(null);
    setLiveResult(null);
    changeStage("searching");
  };

  const statusText = pipelineStage === "countdown"
    ? t("countdown", { seconds: Math.ceil(countdownMs / 1000) })
    : pipelineStage === "classifying"
      ? t("classifying")
      : pipelineStage === "error"
        ? pipelineError || t("classificationFailed")
        : t("verifying");

  return (
    <div className="relative h-full w-full overflow-hidden bg-black">
      <CameraFeed
        ref={videoRef}
        fullScreen
        disabled
        onCapture={(blob, url) => setCapturedImage({ blob, url })}
      />
      <canvas
        ref={canvasRef}
        className="pointer-events-none absolute inset-0 h-full w-full"
        style={{ zIndex: 5 }}
      />

      {loadError && (
        <div className="absolute left-1/2 top-3 z-20 flex -translate-x-1/2 items-center gap-1.5 whitespace-nowrap rounded-full border border-amber-400/30 bg-black/60 px-3 py-1.5 text-[11px] font-medium text-amber-300">
          <AlertTriangle className="h-3 w-3 shrink-0" />
          <span>{t("modelUnavailable")}</span>
        </div>
      )}

      {modelReady && detectionMs !== null && (
        <div className="absolute left-1/2 top-3 z-20 flex -translate-x-1/2 items-center gap-1.5 whitespace-nowrap rounded-full border border-green-400/30 bg-black/60 px-3 py-1.5 text-[11px] font-medium text-green-300">
          <Zap className="h-3 w-3 shrink-0" />
          <span>{t("yoloFPS", { ms: detectionMs })}</span>
        </div>
      )}

      <div className="absolute bottom-16 left-1/2 z-20 -translate-x-1/2 rounded-full bg-black/70 px-4 py-2 text-center text-xs text-white shadow-lg">
        {!modelReady && !loadError ? (
          t("loadingModel")
        ) : loadError ? (
          <span className="inline-flex items-center gap-2">
            {t("modelUnavailable")}
            <button type="button" onClick={() => window.location.reload()} className="underline">{t("retry")}</button>
          </span>
        ) : pipelineStage === "error" ? (
          <span className="inline-flex items-center gap-2">
            <span>{statusText}</span>
            <button type="button" onClick={retryPipeline} className="underline">{t("retry")}</button>
          </span>
        ) : pipelineStage === "classifying" ? (
          <span className="inline-flex items-center gap-2">
            <RefreshCw className="h-3 w-3 animate-spin" />
            {statusText}
          </span>
        ) : (
          statusText
        )}
      </div>

      <div className="absolute right-3 top-1/2 z-30 flex -translate-y-1/2 flex-col gap-3">
        <div
          title={t("liveCamera")}
          className="flex h-10 w-10 cursor-default items-center justify-center rounded-xl border border-white/10 bg-black/50 text-white/80 backdrop-blur-md"
        >
          <CameraIcon className="h-5 w-5" />
        </div>
        <div className="mx-auto h-1.5 w-1.5 rounded-full bg-white/20" />
        <button
          onClick={() => setIsLiveDemo(false)}
          title={t("exit")}
          className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl border border-white/10 bg-black/50 text-white/60 transition-all hover:border-red-400/40 hover:bg-red-950/50 hover:text-red-400"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="pointer-events-none absolute bottom-5 left-0 right-0 z-10 flex justify-center">
        <span className="select-none text-[11px] font-medium uppercase tracking-widest text-white/40">
          {t("placeDate")}
        </span>
      </div>
    </div>
  );
}
