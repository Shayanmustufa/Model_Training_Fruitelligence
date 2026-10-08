# 02 - Frontend Reference (React)

## Behavior spec

- On load, request camera permission once, then list all `videoinput` devices (labels are empty before permission).
- Auto-select a device whose label matches `droidcam|iriun|camo`; otherwise the first device.
- Remember the chosen device **by label** in `localStorage` (`deviceId` can change between sessions).
- Re-scan devices on the `devicechange` event (phone plugged in after page load).
- Stop old stream tracks when switching devices and on unmount.
- Capture draws the current video frame to a canvas at native resolution and returns a JPEG Blob plus an object URL via `onCapture(blob, url)`.
- Show errors inline; disable Capture until video is ready.

## `client/src/components/CameraFeed.jsx`

```jsx
import { useEffect, useRef, useState } from "react";

const PREFERRED = /droidcam|iriun|camo/i;

export default function CameraFeed({ onCapture }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [devices, setDevices] = useState([]);
  const [deviceId, setDeviceId] = useState("");
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");

  async function loadDevices() {
    try {
      // Permission must be granted before labels are visible
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
    } catch (e) {
      setError(e.message);
    }
  }

  useEffect(() => {
    loadDevices();
    navigator.mediaDevices.addEventListener("devicechange", loadDevices);
    return () =>
      navigator.mediaDevices.removeEventListener("devicechange", loadDevices);
  }, []);

  useEffect(() => {
    if (!deviceId) return;
    let cancelled = false;
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
        streamRef.current = stream;
        videoRef.current.srcObject = stream;
        setError("");
      } catch (e) {
        setError(`Could not open camera: ${e.message}`);
      }
    })();
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, [deviceId]);

  const capture = () => {
    const v = videoRef.current;
    if (!v?.videoWidth) return;
    const canvas = document.createElement("canvas");
    canvas.width = v.videoWidth;
    canvas.height = v.videoHeight;
    canvas.getContext("2d").drawImage(v, 0, 0);
    canvas.toBlob(
      (blob) => onCapture(blob, URL.createObjectURL(blob)),
      "image/jpeg",
      0.95
    );
  };

  return (
    <div>
      <select
        value={deviceId}
        onChange={(e) => {
          setDeviceId(e.target.value);
          const label = devices.find((d) => d.deviceId === e.target.value)?.label;
          if (label) localStorage.setItem("cameraLabel", label);
        }}
      >
        {devices.map((d) => (
          <option key={d.deviceId} value={d.deviceId}>
            {d.label || "Camera"}
          </option>
        ))}
      </select>

      {error && <p style={{ color: "crimson" }}>{error}</p>}

      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        onLoadedData={() => setReady(true)}
        style={{ width: "100%", background: "#000" }}
      />
      <button onClick={capture} disabled={!ready}>
        Capture
      </button>
    </div>
  );
}
```

## `client/src/App.jsx`

```jsx
import { useState } from "react";
import CameraFeed from "./components/CameraFeed";

const API = "http://localhost:3001";

export default function App() {
  const [preview, setPreview] = useState(null);
  const [status, setStatus] = useState("");

  async function handleCapture(blob, url) {
    setPreview(url);
    setStatus("Uploading...");
    try {
      const form = new FormData();
      form.append("image", blob, `capture-${Date.now()}.jpg`);
      const res = await fetch(`${API}/api/upload`, { method: "POST", body: form });
      const data = await res.json();
      setStatus(data.ok ? `Saved: ${data.file}` : "Upload failed");
    } catch (e) {
      setStatus(`Upload error: ${e.message}`);
    }
  }

  return (
    <div style={{ maxWidth: 900, margin: "0 auto" }}>
      <CameraFeed onCapture={handleCapture} />
      {status && <p>{status}</p>}
      {preview && <img src={preview} alt="Captured" style={{ width: 300 }} />}
    </div>
  );
}
```

## Optional enhancements

- Countdown timer before capture
- Preview with Retake / Use Photo buttons
- Mirror toggle (CSS only on `<video>`)
- Vite dev proxy (`/api` -> `http://localhost:3001`) to remove the need for CORS
