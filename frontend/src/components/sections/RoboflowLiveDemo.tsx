"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertCircle, Camera, ImagePlus, LoaderCircle, ScanSearch, Video, X } from "lucide-react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import CameraFeed from "./CameraFeed";

interface Prediction {
  x: number;
  y: number;
  width: number;
  height: number;
  confidence: number;
}

interface SelectedImage {
  blob: Blob;
  url: string;
}

const CONFIDENCE_THRESHOLD = 0.4;

function parsePredictions(value: unknown): Prediction[] {
  if (!Array.isArray(value)) return [];

  return value.flatMap((item): Prediction[] => {
    if (!item || typeof item !== "object") return [];
    const prediction = item as Record<string, unknown>;
    const { x, y, width, height, confidence } = prediction;
    if (
      typeof x !== "number" ||
      typeof y !== "number" ||
      typeof width !== "number" ||
      typeof height !== "number" ||
      typeof confidence !== "number" ||
      !Number.isFinite(x) ||
      !Number.isFinite(y) ||
      !Number.isFinite(width) ||
      !Number.isFinite(height) ||
      !Number.isFinite(confidence) ||
      width <= 0 ||
      height <= 0 ||
      confidence < CONFIDENCE_THRESHOLD
    ) {
      return [];
    }

    return [{
      x,
      y,
      width,
      height,
      confidence,
    }];
  });
}

function getErrorTranslationKey(code: string | undefined): string {
  switch (code) {
    case "roboflow_not_configured":
      return "errors.notConfigured";
    case "invalid_image":
      return "errors.invalidImage";
    case "image_too_large":
      return "errors.imageTooLarge";
    case "inference_failed":
    case "invalid_response":
    case "inference_unavailable":
      return "errors.inferenceFailed";
    default:
      return "errors.requestFailed";
  }
}

export default function RoboflowLiveDemo() {
  const t = useTranslations("roboflowDemo");
  const [source, setSource] = useState<"upload" | "camera">("upload");
  const [cameraActive, setCameraActive] = useState(false);
  const [selectedImage, setSelectedImage] = useState<SelectedImage | null>(null);
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [hasAnalyzed, setHasAnalyzed] = useState(false);
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!selectedImage) return;
    return () => URL.revokeObjectURL(selectedImage.url);
  }, [selectedImage]);

  const unionBox = useMemo(() => {
    if (!imageSize.width || !imageSize.height || predictions.length === 0) return null;
    const left = Math.max(0, Math.min(...predictions.map((p) => p.x - p.width / 2)));
    const top = Math.max(0, Math.min(...predictions.map((p) => p.y - p.height / 2)));
    const right = Math.min(imageSize.width, Math.max(...predictions.map((p) => p.x + p.width / 2)));
    const bottom = Math.min(imageSize.height, Math.max(...predictions.map((p) => p.y + p.height / 2)));
    if (right <= left || bottom <= top) return null;
    return { left, top, width: right - left, height: bottom - top };
  }, [imageSize, predictions]);

  const acceptImage = (blob: Blob, url: string) => {
    setSelectedImage({ blob, url });
    setImageSize({ width: 0, height: 0 });
    setPredictions([]);
    setHasAnalyzed(false);
    setErrorKey(null);
  };

  const handleUpload = (file: File | undefined) => {
    if (!file) return;
    acceptImage(file, URL.createObjectURL(file));
  };

  const runInference = async () => {
    if (!selectedImage || isLoading) return;
    setIsLoading(true);
    setHasAnalyzed(false);
    setErrorKey(null);
    setPredictions([]);

    try {
      const formData = new FormData();
      formData.append("image", selectedImage.blob, "date-demo-image.jpg");
      const response = await fetch("/api/roboflow-detect", {
        method: "POST",
        body: formData,
      });
      const payload: unknown = await response.json();
      if (!payload || typeof payload !== "object") {
        setErrorKey("errors.requestFailed");
        return;
      }
      const result = payload as Record<string, unknown>;
      if (!response.ok) {
        setErrorKey(getErrorTranslationKey(typeof result.error === "string" ? result.error : undefined));
        return;
      }
      setPredictions(parsePredictions(result.predictions));
      setHasAnalyzed(true);
    } catch {
      setErrorKey("errors.requestFailed");
    } finally {
      setIsLoading(false);
    }
  };

  const bestConfidence = predictions.length
    ? Math.max(...predictions.map((prediction) => prediction.confidence))
    : null;

  return (
    <section id="live-demo" className="scroll-mt-24 py-16 md:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto mb-10 max-w-3xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full bg-accent/10 px-4 py-2 text-sm font-semibold text-accent">
            <ScanSearch className="h-4 w-4" />
            {t("eyebrow")}
          </span>
          <h2 className="mt-5 font-display text-3xl font-bold text-primary md:text-4xl">
            {t("title")}
          </h2>
          <p className="mt-4 text-base leading-7 text-foreground-muted">
            {t("description")}
          </p>
        </div>

        <div className="grid gap-6 rounded-3xl border border-border/15 bg-white p-4 shadow-xl shadow-primary/5 md:grid-cols-2 md:p-7">
          <div className="flex min-w-0 flex-col gap-5">
            <div className="flex flex-wrap gap-2" role="group" aria-label={t("sourceLabel")}>
              <button
                type="button"
                aria-pressed={source === "upload"}
                onClick={() => {
                  setSource("upload");
                  setCameraActive(false);
                }}
                className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors ${
                  source === "upload" ? "bg-primary text-white" : "bg-background-alt text-primary"
                }`}
              >
                <ImagePlus className="h-4 w-4" />
                {t("uploadTab")}
              </button>
              <button
                type="button"
                aria-pressed={source === "camera"}
                onClick={() => setSource("camera")}
                className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors ${
                  source === "camera" ? "bg-primary text-white" : "bg-background-alt text-primary"
                }`}
              >
                <Video className="h-4 w-4" />
                {t("cameraTab")}
              </button>
            </div>

            {source === "upload" ? (
              <label className="flex min-h-48 cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-border/30 bg-background-alt/40 p-6 text-center hover:border-accent/50">
                <ImagePlus className="h-8 w-8 text-accent" />
                <span className="font-semibold text-primary">{t("chooseImage")}</span>
                <span className="text-sm text-foreground-muted">{t("imageRequirements")}</span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="sr-only"
                  onChange={(event) => handleUpload(event.target.files?.[0])}
                />
              </label>
            ) : (
              <div className="flex min-h-48 flex-col gap-3">
                {cameraActive ? (
                  <>
                    <CameraFeed
                      onCapture={acceptImage}
                      disabled={isLoading}
                    />
                    <button
                      type="button"
                      onClick={() => setCameraActive(false)}
                      className="self-start rounded-lg px-3 py-2 text-sm font-semibold text-foreground-muted hover:bg-background-alt"
                    >
                      {t("stopCamera")}
                    </button>
                  </>
                ) : (
                  <div className="flex flex-1 flex-col items-center justify-center gap-4 rounded-2xl bg-background-alt/40 p-6 text-center">
                    <Camera className="h-8 w-8 text-accent" />
                    <p className="text-sm text-foreground-muted">{t("cameraPermission")}</p>
                    <button
                      type="button"
                      onClick={() => setCameraActive(true)}
                      className="rounded-xl bg-primary px-5 py-3 font-semibold text-white hover:bg-primary-hover"
                    >
                      {t("startCamera")}
                    </button>
                  </div>
                )}
              </div>
            )}

            <p className="text-xs leading-5 text-foreground-muted">{t("privacyNote")}</p>
            <button
              type="button"
              onClick={runInference}
              disabled={!selectedImage || isLoading}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-accent px-5 py-3 font-semibold text-white transition-colors hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isLoading ? <LoaderCircle className="h-5 w-5 animate-spin" /> : <ScanSearch className="h-5 w-5" />}
              {isLoading ? t("analyzing") : t("analyze")}
            </button>
          </div>

          <div className="flex min-w-0 flex-col gap-4">
            <h3 className="font-display text-lg font-semibold text-primary">{t("resultTitle")}</h3>
            <div className="relative flex aspect-[4/3] max-h-[440px] min-h-64 items-center justify-center overflow-hidden rounded-2xl bg-slate-950/95 p-3">
              {selectedImage ? (
                <>
                  <Image
                    src={selectedImage.url}
                    alt={t("previewAlt")}
                    fill
                    unoptimized
                    sizes="(max-width: 768px) 100vw, 50vw"
                    onLoad={(event) =>
                      setImageSize({
                        width: event.currentTarget.naturalWidth,
                        height: event.currentTarget.naturalHeight,
                      })
                    }
                    className="object-contain"
                  />
                  {unionBox && (
                    <svg
                      className="pointer-events-none absolute inset-0 h-full w-full"
                      viewBox={`0 0 ${imageSize.width} ${imageSize.height}`}
                      preserveAspectRatio="xMidYMid meet"
                      aria-hidden="true"
                    >
                      <rect
                        x={unionBox.left}
                        y={unionBox.top}
                        width={unionBox.width}
                        height={unionBox.height}
                        fill="rgba(34, 197, 94, 0.08)"
                        stroke="#22c55e"
                        strokeWidth={Math.max(3, imageSize.width * 0.004)}
                        vectorEffect="non-scaling-stroke"
                        rx={Math.max(3, imageSize.width * 0.006)}
                      />
                    </svg>
                  )}
                </>
              ) : (
                <div className="flex flex-col items-center gap-3 px-6 text-center text-white/60">
                  <ImagePlus className="h-9 w-9" />
                  <p className="text-sm">{t("emptyPreview")}</p>
                </div>
              )}
              {selectedImage && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedImage(null);
                    setImageSize({ width: 0, height: 0 });
                    setPredictions([]);
                    setHasAnalyzed(false);
                    setErrorKey(null);
                  }}
                  aria-label={t("removeImage")}
                  className="absolute right-3 top-3 rounded-full bg-black/60 p-2 text-white hover:bg-black/80"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {errorKey ? (
              <div role="alert" className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <p>{t(errorKey)}</p>
              </div>
            ) : predictions.length > 0 ? (
              <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-900">
                <p className="font-semibold">{t("datesFound", { count: predictions.length })}</p>
                {bestConfidence !== null && (
                  <p className="mt-1">{t("confidence", { value: (bestConfidence * 100).toFixed(1) })}</p>
                )}
                <p className="mt-2 text-xs text-green-800">{t("unionBoxNote")}</p>
              </div>
            ) : selectedImage && hasAnalyzed && !isLoading ? (
              <p className="rounded-xl bg-background-alt p-4 text-sm text-foreground-muted">
                {t("noDatesFound")}
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
