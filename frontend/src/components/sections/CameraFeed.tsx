"use client";

import { useTranslations } from "next-intl";
import React, { useEffect, useRef, useState, useCallback } from "react";
import { Camera, RefreshCw, AlertCircle, Aperture, ChevronDown } from "lucide-react";

const PREFERRED = /droidcam|iriun|camo/i;

interface CameraFeedProps {
  onCapture: (blob: Blob, url: string) => void;
  disabled?: boolean;
  /** When true the video fills its parent 100% with no aspect-ratio box */
  fullScreen?: boolean;
}

const CameraFeed = React.forwardRef<HTMLVideoElement, CameraFeedProps>(
  function CameraFeed(
    { onCapture, disabled = false, fullScreen = false }: CameraFeedProps,
    forwardedRef: React.ForwardedRef<HTMLVideoElement>
  ) {
  const t = useTranslations("camera");
  const internalRef = useRef<HTMLVideoElement>(null);

  // Merge forwarded ref + internal ref via a stable callback ref
  const setVideoRef = useCallback(
    (el: HTMLVideoElement | null) => {
      (internalRef as React.MutableRefObject<HTMLVideoElement | null>).current = el;
      if (typeof forwardedRef === "function") {
        forwardedRef(el);
      } else if (forwardedRef) {
        (forwardedRef as React.MutableRefObject<HTMLVideoElement | null>).current = el;
      }
    },
    [forwardedRef]
  );

  // Alias so the rest of the component reads `videoRef.current` unchanged
  const videoRef = internalRef;
  const streamRef = useRef<MediaStream | null>(null);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [deviceId, setDeviceId] = useState<string>("");
  const [cameraAttempt, setCameraAttempt] = useState(0);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [showSourcePicker, setShowSourcePicker] = useState(false);

  const loadDevices = async () => {
    try {
      const tmp = await navigator.mediaDevices.getUserMedia({ video: true });
      tmp.getTracks().forEach((t) => t.stop());
      const cams = (await navigator.mediaDevices.enumerateDevices()).filter(
        (d) => d.kind === "videoinput"
      );
      setDevices(cams);
      const saved = localStorage.getItem("cameraLabel");
      const pick =
        cams.find((c) => c.label === saved) ||
        cams.find((c) => PREFERRED.test(c.label)) ||
        cams[0];
      if (pick) setDeviceId(pick.deviceId);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to access camera.");
    }
  };

  const retryCamera = () => {
    setReady(false);
    setError("");
    setCameraAttempt((attempt) => attempt + 1);
    void loadDevices();
  };

  useEffect(() => {
    loadDevices();
    navigator.mediaDevices.addEventListener("devicechange", loadDevices);
    return () =>
      navigator.mediaDevices.removeEventListener("devicechange", loadDevices);
  }, []);

  useEffect(() => {
    if (!deviceId) return;
    let cancelled = false;
    let connectedStream: MediaStream | null = null;
    let onTrackEnded: EventListener | null = null;
    const videoElement = videoRef.current;
    setReady(false);
    (async () => {
      try {
        streamRef.current?.getTracks().forEach((t) => t.stop());
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            deviceId: { exact: deviceId },
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
        });
        if (cancelled) return stream.getTracks().forEach((t) => t.stop());
        connectedStream = stream;
        streamRef.current = stream;
        if (videoElement) videoElement.srcObject = stream;
        const trackEndedListener: EventListener = () => {
          if (streamRef.current !== stream) return;
          streamRef.current = null;
          if (videoElement?.srcObject === stream) videoElement.srcObject = null;
          setReady(false);
          setError(t("cameraDisconnected"));
        };
        onTrackEnded = trackEndedListener;
        stream.getTracks().forEach((track) =>
          track.addEventListener("ended", trackEndedListener, { once: true })
        );
        setError("");
      } catch (e: unknown) {
        setError(
          e instanceof Error
            ? `Could not open camera: ${e.message}`
            : "Could not open camera."
        );
      }
    })();
    return () => {
      cancelled = true;
      if (!connectedStream) return;
      connectedStream.getTracks().forEach((track) => {
        if (onTrackEnded) {
          track.removeEventListener("ended", onTrackEnded);
        }
        track.stop();
      });
      if (streamRef.current === connectedStream) streamRef.current = null;
      if (videoElement?.srcObject === connectedStream) videoElement.srcObject = null;
    };
  }, [cameraAttempt, deviceId, t, videoRef]);

  const capture = () => {
    const v = videoRef.current;
    if (!v?.videoWidth) return;
    const canvas = document.createElement("canvas");
    canvas.width = v.videoWidth;
    canvas.height = v.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(v, 0, 0);
    canvas.toBlob(
      (blob) => {
        if (blob) onCapture(blob, URL.createObjectURL(blob));
      },
      "image/jpeg",
      0.95
    );
  };

  /* ─── Full-screen mode ─────────────────────────────────────────────────── */
  if (fullScreen) {
    return (
      <div className="relative w-full h-full group">
        {/* Error overlay */}
        {error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/80 text-white p-6 z-20">
            <AlertCircle className="w-8 h-8 text-red-400" />
            <p className="text-sm text-center text-white/80">{error}</p>
            <button
              onClick={retryCamera}
              className="text-xs px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 transition-colors cursor-pointer"
            >
              {t("retry")}
            </button>
          </div>
        )}

        {/* Spinner while camera initialises */}
        {!ready && !error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black text-white/60 z-10">
            <RefreshCw className="w-7 h-7 animate-spin text-white/40" />
            <p className="text-xs tracking-wider uppercase">{t("initializing")}</p>
          </div>
        )}

        {/* Video — fills the entire panel */}
        <video
          ref={setVideoRef}
          autoPlay
          playsInline
          muted
          onLoadedData={() => setReady(true)}
          className={`w-full h-full object-cover transition-opacity duration-500 ${
            ready ? "opacity-100" : "opacity-0"
          }`}
        />

        {/* Capture button — centred bottom, visible on hover */}
        {ready && (
          <div className="absolute bottom-14 left-0 right-0 flex justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <button
              onClick={capture}
              disabled={!ready || disabled}
              type="button"
              className="flex items-center gap-2 px-6 py-3 rounded-full bg-white/15 backdrop-blur-md shadow-xl text-white font-semibold text-sm border border-white/20 hover:bg-white/25 hover:scale-105 active:scale-95 transition-all disabled:opacity-40 disabled:hover:scale-100 cursor-pointer"
            >
              <Camera className="w-5 h-5" />
              Capture Photo
            </button>
          </div>
        )}

        {/* Camera source picker — icon overlay, top-left */}
        {devices.length > 1 && (
          <div className="absolute top-3 left-3 z-20">
            <button
              onClick={() => setShowSourcePicker((v) => !v)}
              title={t("switchCamera")}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-black/50 backdrop-blur-md border border-white/10 text-white/70 hover:text-white hover:border-white/30 text-xs font-medium transition-all cursor-pointer"
            >
              <Aperture className="w-4 h-4" />
              <ChevronDown className={`w-3 h-3 transition-transform ${showSourcePicker ? "rotate-180" : ""}`} />
            </button>

            {showSourcePicker && (
              <div className="mt-1.5 bg-black/80 backdrop-blur-md border border-white/10 rounded-xl overflow-hidden shadow-2xl min-w-[180px]">
                {devices.map((d) => (
                  <button
                    key={d.deviceId}
                    onClick={() => {
                      setDeviceId(d.deviceId);
                      const label = d.label;
                      if (label) localStorage.setItem("cameraLabel", label);
                      setShowSourcePicker(false);
                    }}
                    className={`w-full text-left px-4 py-2.5 text-xs transition-colors cursor-pointer truncate ${
                      d.deviceId === deviceId
                        ? "text-white bg-white/15 font-semibold"
                        : "text-white/60 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    {d.label || "Camera"}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  /* ─── Standard (boxed) mode — unchanged behaviour ─────────────────────── */
  return (
    <div className="flex flex-col gap-4 w-full h-full relative group">
      {error && (
        <div className="flex items-center gap-2 p-3 text-sm text-red-600 bg-red-50/50 rounded-xl border border-red-100">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {/* Video Container */}
      <div className="relative w-full aspect-[4/3] bg-background-alt/50 rounded-2xl overflow-hidden border border-border/10 flex items-center justify-center">
        {!ready && !error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-foreground-muted">
            <RefreshCw className="w-6 h-6 animate-spin mb-3 text-primary/70" />
            <p className="text-sm font-medium">{t("initializing")}</p>
          </div>
        )}
        <video
          ref={setVideoRef}
          autoPlay
          playsInline
          muted
          onLoadedData={() => setReady(true)}
          className={`w-full h-full object-cover transition-opacity duration-300 ${
            ready ? "opacity-100" : "opacity-0"
          }`}
        />

        {/* Floating Capture Button overlay */}
        <div className="absolute bottom-4 left-0 right-0 flex justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <button
            onClick={capture}
            disabled={!ready || disabled}
            type="button"
            className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-white/90 backdrop-blur-md shadow-lg text-primary font-semibold text-sm border border-white/20 hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:hover:scale-100 cursor-pointer"
          >
            <Camera className="w-5 h-5" />
            Capture Photo
          </button>
        </div>
      </div>

      {/* Device Selector */}
      {devices.length > 0 && (
        <div className="flex justify-between items-center bg-white border border-border/10 rounded-xl px-4 py-2.5 shadow-sm">
          <span className="text-xs font-semibold text-foreground-muted uppercase tracking-wider">
            Source
          </span>
          <select
            value={deviceId}
            onChange={(e) => {
              setDeviceId(e.target.value);
              const label = devices.find((d) => d.deviceId === e.target.value)?.label;
              if (label) localStorage.setItem("cameraLabel", label);
            }}
            className="text-sm font-medium text-foreground bg-transparent outline-none cursor-pointer hover:text-primary transition-colors focus:ring-0 truncate max-w-[200px] sm:max-w-[300px]"
          >
            {devices.map((d) => (
              <option key={d.deviceId} value={d.deviceId}>
                {d.label || "Camera"}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
  }
);

export default CameraFeed;
