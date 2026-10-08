// scripts/copy-ort.mjs
// Windows-safe Node script: copies ORT single-threaded WASM files to public/ort/
// Runs automatically via "postinstall" in package.json.
import { existsSync, mkdirSync, cpSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const src = resolve(__dirname, "../node_modules/onnxruntime-web/dist");
const dest = resolve(__dirname, "../public/ort");

if (!existsSync(src)) {
  console.warn("[copy-ort] onnxruntime-web not installed yet — skipping.");
  process.exit(0);
}

mkdirSync(dest, { recursive: true });

// Copy the standard WASM bundle plus the JSEP bundle used by newer ORT releases.
const files = [
  "ort-wasm-simd-threaded.wasm",
  "ort-wasm-simd.wasm",
  "ort-wasm.wasm",
  "ort-wasm-simd-threaded.mjs",
  "ort-wasm-simd.mjs",
  "ort-wasm.mjs",
  "ort-wasm-simd-threaded.jsep.wasm",
  "ort-wasm-simd-threaded.jsep.mjs",
];

let copied = 0;
for (const f of files) {
  const s = resolve(src, f);
  if (existsSync(s)) {
    cpSync(s, resolve(dest, f));
    console.log(`[copy-ort] ✓ ${f}`);
    copied++;
  }
}

if (copied === 0) {
  console.warn("[copy-ort] No wasm files found in dist/ — check onnxruntime-web version.");
} else {
  console.log(`[copy-ort] Done → public/ort/ (${copied} files)`);
}
