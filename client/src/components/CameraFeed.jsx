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
