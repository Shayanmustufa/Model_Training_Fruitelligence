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
