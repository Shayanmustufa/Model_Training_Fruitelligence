# 03 - Backend Reference (Node.js / Express)

## Behavior spec

- `POST /api/upload` accepts `multipart/form-data` with a single field named `image`.
- Saves to `server/uploads/` and returns `{ ok: true, file, path }`.
- Only accepts image MIME types; limits size to 15 MB.
- CORS allows the React dev origin (`http://localhost:5173`).
- `GET /api/health` for a quick check.
- A clearly marked hook (`processImage`) is where downstream logic goes.

## Install

```bash
cd server
npm i express multer cors
```

## `server/server.js`

```js
const express = require("express");
const multer = require("multer");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const PORT = process.env.PORT || 3001;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || "http://localhost:5173";
const UPLOAD_DIR = path.join(__dirname, "uploads");
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const app = express();
app.use(cors({ origin: CLIENT_ORIGIN }));

const storage = multer.diskStorage({
  destination: UPLOAD_DIR,
  filename: (_req, file, cb) =>
    cb(null, `${Date.now()}-${file.originalname.replace(/[^\w.-]/g, "_")}`),
});

const upload = multer({
  storage,
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: (_req, file, cb) =>
    file.mimetype.startsWith("image/")
      ? cb(null, true)
      : cb(new Error("Only image uploads are allowed")),
});

// Hook: put downstream image handling here (OCR, ML, DB save, etc.)
async function processImage(filePath) {
  // TODO: implement
  return null;
}

app.get("/api/health", (_req, res) => res.json({ ok: true }));

app.post("/api/upload", upload.single("image"), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ ok: false, error: "No image" });
    const result = await processImage(req.file.path);
    res.json({
      ok: true,
      file: req.file.filename,
      path: req.file.path,
      result,
    });
  } catch (e) {
    next(e);
  }
});

// Error handler (multer errors land here)
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(400).json({ ok: false, error: err.message });
});

app.listen(PORT, () => console.log(`API on http://localhost:${PORT}`));
```

## Variants

**No disk (in-memory):** replace storage with `multer.memoryStorage()` and read `req.file.buffer`.

**Base64 from the client:** in the client use `FileReader.readAsDataURL(blob)`, send JSON, and mount `express.json({ limit: "20mb" })` on the server.
