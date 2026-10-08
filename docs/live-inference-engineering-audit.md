# Fruitelligence Live Inference Engineering Audit

## 1. Executive Summary

This audit traced the running Next.js and FastAPI applications, independently exercised the local YOLO detector, tested the classifier API and proxy, and drove a held-out date image through a synthetic browser camera stream.

The initial audit verified the detector, backend, image validation, camera-unavailable UI, and crop creation, but found the live crop was rejected by the MobileNetV4 gate (`P(date)=0%`, threshold `1%`). Follow-up testing isolated the input-contract mismatch: on a held-out YOLO test image the full scene scored `P(date)=100%`, while its annotated date crop scored about `0.0012%`.

The live capture now sends the crop for variety classification and a same-sampling full-scene context image for the unchanged date gate. On the prepared held-out positive split, the gate accepted 161/166 full scenes (97.0%) at the original threshold; it accepted 188/196 annotated crops (95.9%). The real backend and Next.js proxy were exercised with one held-out scene/crop pair: the gate accepted the scene (`P(date)=100%`), MobileViT-S ran on the crop, and returned `Ajwa` at `23.83%` classifier confidence. This verifies execution, not variety correctness. A crop-only request still receives the original rejection. The threshold and gate model were not changed, and the separately deferred detector false-positive issue remains untouched.

The synthetic scene/crop-to-classifier path now completes. A physical camera and moving-scene behavior remain untested, so this is **PARTIALLY VALIDATED** rather than a claim of real-world readiness.

No physical camera or IP-camera endpoint was available. The live-path test used one held-out image repeatedly as a browser video stream; it is not a moving-camera test. No destructive restructuring was performed. Temporary fixtures and inference outputs were removed.

## 2. System Overview

The active local launcher, [dev.ps1](../dev.ps1), starts:

- **Frontend:** Next.js 16, React 19, Tailwind CSS v4, port `3000`.
- **Backend:** FastAPI/Uvicorn, port `8000`, one PyTorch CPU thread.
- **Live detector:** one-class YOLOv5n exported to ONNX and run in the browser using ONNX Runtime Web/WASM.
- **Backend date gate:** MobileNetV4 ONNX model, followed by the eight-class date-variety classifier.
- **Local classifier checkpoint:** `Desktop\model_classifier\mobilevit_fold4_stage2_best.pth`, outside the repository. The local launcher sets `MODEL_PATH` when that file exists.

The website also contains a separate Roboflow-hosted image/camera demo and a fruit-classifier endpoint. Neither is the local YOLO live-camera path audited here. The health response reported the date classifier and date gate loaded, with eight date classes; optional fruit-classifier checkpoints were not loaded.

## 3. Final Architecture

```text
Browser camera (navigator.mediaDevices.getUserMedia)
  │ MediaStream → HTMLVideoElement; requested ideal 1920 × 1080
  ▼
useDateDetector
  │ Draw current video frame to 640 × 640 grey-letterboxed canvas
  │ RGBA → RGB, NCHW float32 [1, 3, 640, 640], values 0–1
  ▼
YOLOv5n ONNX / ONNX Runtime Web WASM
  │ Raw output [1, 25200, 6]
  │ detection confidence = objectness × class score
  │ confidence ≥ 0.25 → NMS at IoU 0.45 → display-space XYXY boxes
  ▼
Three consecutive spatially consistent observations (IoU ≥ 0.2)
  │ No object-ID tracker; highest-confidence box is the primary target
  ▼
Five-second deadline; sample the source video every 200 ms
  │ Keep one best crop candidate: confidence, then box area
  ▼
Map display-space XYXY back to source-video pixels
  │ Clamp/check crop, add 10% padding; capture a 224 × 224 scene context
  ▼
Next.js /api/classify → FastAPI /classify (multipart crop + context_image)
  │ Crop is resized to 224 × 224 JPEG; scene context is already 224 × 224
  │ FastAPI applies RGB/EXIF handling, resize, tensor conversion, ImageNet normalization
  ▼
MobileNetV4 gate(context_image) → MobileViT-S eight-class classifier(crop)
  │ Gate response: is_date, p_date, t_gate (gate score is for the scene context)
  │ Classifier response: variety, confidence, all_probabilities
  ▼
Live result panel
  │ Date-detection confidence and variety-classification confidence are separate
  └── Gate model and calibrated threshold remain unchanged
```

### Confidence definitions

- **Detection confidence:** YOLOv5 objectness multiplied by its class score, in `[0, 1]`. For the selected best frame the frontend converts this to a percentage for display.
- **Classification confidence:** top softmax probability for the predicted variety, returned by FastAPI in percent.
- **Gate probability:** backend MobileNetV4 `P(date)`, returned separately as `p_date`, also in percent. In the live flow it scores the same-sampling full-scene context; for legacy requests without `context_image`, it scores the classification image. It is neither YOLO confidence nor variety confidence.

The live UI labels detection and variety-classification confidence separately. The context is used only by the date gate; the MobileViT-S classifier continues to receive the cropped date region.

## 4. End-to-End Data Flow

1. `CameraFeed` requests a browser video-input device with ideal 1920 × 1080 dimensions. It does not accept RTSP/IP camera URLs; an IP camera must first be exposed as a browser/OS video device or another supported browser stream.
2. `useDateDetector` reads the actual `<video>` element. Its 640-square letterboxed tensor is used only for detection, not for date cropping.
3. The YOLO decoder computes confidence as objectness × class score, rejects values below `0.25`, maps boxes through the letterbox and CSS `object-fit: cover` transforms, and applies NMS at IoU `0.45`.
4. `LiveDemoPanel` requires three consecutive detections whose primary-box IoU is at least `0.2`. It begins a 5,000 ms deadline, keeps checking detections, and samples a crop every 200 ms.
5. `captureFrame` maps a display-space box back to `video.videoWidth × video.videoHeight`, clamps to source bounds, pads by 10%, and captures both the crop and a 224 × 224 full-scene context during the same sampling operation. The crop is JPEG quality `0.9`; the context is JPEG quality `0.95`. It does not crop the 640-square inference canvas.
6. Candidate crops are ranked by YOLO confidence, then box area. Only the current best blob is retained; this is not a sharpness/occlusion score.
7. The best crop is resized in the browser to 224 × 224 JPEG. Its paired scene context is already 224 × 224 JPEG. Both are sent once to `/api/classify` as `image` and optional `context_image`. The Next.js route forwards multipart data to `CLASSIFY_API_URL` (local default `http://localhost:8000`) with a 55-second timeout.
8. FastAPI validates and decodes both images, converts them to RGB, and applies the 224 × 224/ImageNet-normalized transform. The ONNX date gate scores `context_image`; if accepted, MobileViT-S classifies `image` (the crop) and returns the variety and softmax confidence. Requests that omit `context_image` preserve the legacy behavior of gating and classifying the same image.
9. The follow-up held-out scene/crop request completed through the Next.js proxy: the gate accepted the context at `P(date)=100%`, and MobileViT-S returned `Ajwa` at `23.83%` confidence. The identical crop without context remained rejected at `P(date)=0%`.

## 5. Component Breakdown

| Component | Responsibility | Runtime evidence |
|---|---|---|
| `frontend/src/components/sections/CameraFeed.tsx` | Device selection, `getUserMedia`, video lifecycle, capture and errors | Camera-unavailable path displayed an error and Retry button |
| `frontend/src/hooks/useDateDetector.ts` | ONNX session, frame preprocessing, YOLO decode, coordinate conversion and NMS | Browser stream produced the `YOLO · 125 ms` runtime badge |
| `frontend/src/components/sections/LiveDemoPanel.tsx` | Verification, deadline, sampling, best crop and classify request | Synthetic stream reached backend rejection after submitting crop |
| `frontend/src/components/layout/LiveDemoLayout.tsx` | Shared live state and captured-image lifecycle | Build/type-check passed |
| `frontend/src/components/sections/AIClassifierDemo.tsx` | Result/error display and classifier confidence | Browser rendered the gate rejection; separate-confidence UI built |
| `frontend/src/app/api/classify/route.ts` | Multipart proxy, backend response guard and timeout | Valid proxy and invalid/missing-image cases exercised |
| `backend/api_server/main.py` | Startup, MobileNetV4 gate, MobileViT-S classifier and `/classify` | Health and direct valid/invalid requests exercised |

## 6. YOLOv5 Detector

- **Weights/config:** `training/runs/detect/date-gate-yolov5n-grouped/weights/best.pt` is 3,909,352 bytes; browser model `frontend/public/models/date-detector.onnx` is 7,489,752 bytes. The prepared dataset YAML declares exactly one class, `date`.
- **Input/output:** 640 × 640 single-frame input, grey letterbox, RGB NCHW float32. The browser model output was previously verified as `[1, 25200, 6]`.
- **Thresholds:** confidence `0.25`; NMS IoU `0.45`; up to five displayed boxes. YOLOv5 raw confidence is objectness × class probability.
- **Coordinates:** decoded model XYXY is mapped to the displayed video after removing letterbox padding and applying the video element’s cover crop. This audit corrected all four output coordinates to be clamped to the displayed frame and drops non-finite, non-positive, and degenerate boxes.
- **Independent tests:** three held-out positive images produced 3, 1, and 1 boxes. Confidence values were 0.9750/0.9742/0.9735, 0.9744, and 0.9667. The printed XYXY values were within the 640 × 640 source-frame dimensions. A synthetic all-white image produced no boxes at `0.25`.
- **Browser test:** a held-out image streamed repeatedly through a canvas-backed `MediaStream`; the browser reported YOLO iteration latency around 122–141 ms, including preprocessing/decode/NMS. It is one synthetic setup, not a camera FPS benchmark.
- **Performance provenance:** prior grouped held-out test evaluation reported precision 1.000, recall 0.954, mAP@0.5 0.964, and mAP@0.5:0.95 0.957 across 166 positive images/196 boxes. Those training results contain no negative images and do not demonstrate negative-scene false-positive performance.

## 7. Temporal Verification

`LiveDemoPanel` requires three consecutive non-empty observations. A detection continues the count only if the primary box IoU with the preceding observation is at least `0.2`; an empty observation resets the count. A single observation therefore cannot start the countdown.

The held-out still-image stream repeatedly delivered a stable date and eventually reached the classifier request, exercising the nominal verification path. One persistent-object scenario does not validate single-frame flashes, movement, confidence jitter, temporary loss, or multiple-object identity. There is no tracker assigning persistent IDs.

## 8. Date Locking

There is a **stage lock**, not a durable object tracker. After three consistent observations the stage changes to `countdown`; during countdown the first/highest-confidence post-NMS box is used. With multiple dates, that box is the selected target. If the primary box changes substantially, the pre-countdown verification counter resets; during countdown there is no association tracker to guarantee that the same physical date remains selected.

The held-out positive detector image contained three detections, and the browser crop preview showed one date crop. A deliberate crossing/moving-multiple-date video was not tested.

## 9. Five-Second Countdown

The deadline is `Date.now() + 5000`, rendered from remaining milliseconds and updated every 100 ms; classification is guarded so the timer starts only once. Detection loss beyond 1,000 ms clears the best candidate and returns to searching. The code does not block the ONNX animation-frame loop.

The synthetic stream reached the post-countdown backend request, exercising the timer-to-capture path. The exact elapsed wall-clock from visible countdown start to request was not timestamped, and multiple simultaneous timeout races were not stress-tested. Camera-unavailable testing confirmed no countdown was started without video frames.

## 10. Best-Frame Selection

Sampling is attempted at 200 ms intervals while visible. A single candidate blob is retained: larger detector confidence wins, with box area as the tie-break. The chosen crop is from the video element at sample time, not an immutable frame captured at the precise ONNX inference timestamp.

This is deterministic and bounded in memory, but it does not evaluate blur, sharpness, occlusion, exposure, temporal stability, or motion. A motion-heavy stream may pair a recent box with a slightly later source frame. A static repeated image can provide identical candidates; the live test did exactly that.

## 11. Bounding-Box Cropping

The crop reads the source video element at its intrinsic dimensions and reverses the displayed `object-fit: cover` transform. It validates finite, ordered box coordinates and positive source dimensions, clips to source boundaries, applies 10% padding, and rejects empty/invalid crops or failed JPEG encoding. During the same synchronous sampling operation, the browser captures the full scene resized to 224 × 224 as gate context. The date crop is separately resized to the classifier’s 224 × 224 input size; FastAPI applies RGB/ImageNet normalization to both.

**Observed initial crop:** 240 × 96 pixels, JPEG, 7,098 bytes; the preview visibly showed a single date. On a held-out image/annotation from the prepared YOLO test split, the gate assigned the full scene `P(date)=100%` and the date crop `P(date)=0.00118%`. Across the full held-out positive split, full-scene context passed the unchanged 1% gate on 161/166 images (97.0%); annotated crops passed on 188/196 boxes (95.9%). The follow-up API request sent the scene as `context_image` and the date crop as `image`; it passed the unchanged gate and the classifier returned `Ajwa` at 23.83%. The crop-only request still returned `is_date=false`. The 5 rejected scenes remain a positive-set false-rejection limitation; no threshold change was made.

## 12. Backend Classification

- The local process selected the metadata-declared `mobilevit_s` / `timm` MobileViT-S checkpoint, strictly loaded its state dictionary, and checked the eight checkpoint class names/order against `CLASS_NAMES`: Ajwa, Amber, Kalmi, Mabroom, Mazafati, Rabbi, Sagai, Zahedi.
- Backend device is explicitly CPU with one PyTorch thread. The YOLO standalone script used CUDA (`cuda:0`) during these tests; the browser live detector uses WASM.
- Date input preprocessing uses EXIF transpose, RGB, 224 × 224 resize, tensor conversion, and ImageNet normalization. The external training checkpoint was not available in-repository for an independent training-transform audit.
- The current gate configuration loads a calibrated threshold of `0.01` (returned as `1.0%`). It reads `P(Date)` from binary output index 1. The model/config does not ship an explicit class-name map, so the index convention is inferred from observed positive/negative responses rather than independently verified from gate training artifacts.
- A full held-out image passed the gate with `p_date=100%` and produced `Mabroom`, classifier confidence `38.8%`. This is a direct full-frame classifier smoke test, not the live crop result.
- The crop-only request remains rejected before MobileViT-S inference (`is_date=false`, `p_date=0%`). In the live contract, the paired full-scene context passes the unchanged gate and MobileViT-S classifies the crop. The gate weights and calibrated threshold were not modified.
- A synthetic white image was rejected by the gate (`is_date=false`, `p_date=0%`). One easy synthetic negative does not establish real-world rejection performance.

## 13. Frontend / Live UI

The initial audit's browser-generated stream displayed detector latency but ended with the crop-only gate rejection. The follow-up held-out crop/context request succeeded through the Next.js proxy. The camera-unavailable error remains visible with a Retry button; successful physical-camera UI behavior was not tested.

The live-result UI now labels **Date detection confidence** separately from **Variety classification confidence**. The selected frame’s YOLO confidence is carried alongside—not substituted for—the backend’s class confidence. The backend and proxy return a successful held-out crop result with the new context contract; a physical-camera browser session remains untested.

The live result is cleared when exiting/retrying the live flow. The dataset showcase no longer renders an empty video `src`, and the marketplace description now uses its existing localized message instead of a missing translation key.

## 14. State Machine

```text
searching
  ├── model load failure → detector-unavailable banner + retry
  └── three consistent boxes → countdown
countdown
  ├── no detection beyond 1 s → clear best frame → searching
  └── deadline reached → classifyBestFrame (once)
classifying
  ├── missing/invalid crop → error
  ├── API/network/timeout/gate reject → error + Retry
  └── valid variety response → complete + result panel
complete/error
  └── user Retry → clear result/candidate and return to searching
```

Camera track termination now clears the video source and shows a localized disconnect error; the Retry action requests devices again and increments the acquisition attempt. The track-`ended` event path was added but could not be induced on a real hardware camera in this environment.

## 15. Error Handling

Verified: invalid/corrupt multipart image receives HTTP 400 from FastAPI and the proxy; missing image receives HTTP 400 from the proxy; camera `getUserMedia` failure is rendered with a retry control; no frame means no countdown; missing/invalid crop reaches a user-visible pipeline error; the proxy now times out at 55 seconds and validates the minimum classifier response shape.

The timeout and malformed-backend-response branches were not forced at runtime. The detector logs inference failures and continues its loop; repeated inference errors are not promoted to a dedicated UI error state. If the backend gate artifact is absent, startup logs that the gate passes all images through; `/health` reports the gate state, but model readiness itself remains the classifier’s primary health status.

## 16. Failure Scenarios Tested

| Scenario | Result | Evidence / limitation |
|---|---|---|
| Camera unavailable | PASS | Injected `NotFoundError`; error text and Retry visible |
| No camera frames | PASS | Waited 6.5 s; countdown did not start |
| Invalid/corrupt image | PASS | HTTP 400 from direct backend and proxy |
| Missing image field | PASS | HTTP 400 from proxy |
| No date — synthetic blank | PASS (limited) | YOLO returned no boxes; backend gate returned `is_date=false` |
| Positive held-out detector image | PASS | Three distinct positive images generated boxes |
| Stable repeated-date sample stream | PARTIAL | Initial audit reached crop rejection; follow-up paired-context proxy test now returns a variety |
| Invalid camera URL | NOT TESTED — no camera-URL input exists; app uses browser device enumeration |
| Physical camera disconnect / track ended | NOT TESTED — no physical camera available |
| True frozen transport/frame clock | NOT TESTED — repeated still content was streamed with advancing video frames |
| Low-confidence detector rejection | NOT TESTED as a dedicated injected case |
| Date disappears during verification/countdown | NOT TESTED dynamically |
| Moving date / confidence jitter | NOT TESTED |
| Multiple-object identity tracking | NOT TESTED; no persistent tracker is implemented |
| Invalid/degenerate detector coordinates | Guard added; malformed model output not injected at runtime |
| Empty crop / encoder failure | Guard added; forced encoder failure not tested |
| Classifier timeout | NOT TESTED — 55-second wait branch not forced |
| Malformed classifier JSON/schema | Guard added; mock backend response not injected |
| Backend unavailable / frontend-backend outage | NOT TESTED against a stopped or unreachable backend |
| Model file missing / wrong model config | NOT TESTED; would disrupt the active server and model |
| CUDA unavailable in standalone predictor | NOT TESTED; this run selected CUDA |
| Backend CPU inference | PASS | Backend is explicitly configured to CPU; full-image inference succeeded |
| Insufficient memory / VRAM | NOT TESTED |
| Successful date-crop variety classification | PASS for tested held-out pair | Scene context passed the gate; MobileViT-S returned a variety for the paired crop |

## 17. Dataset / Model Consistency

- Prepared YOLO dataset: 1,111 images and 1,511 boxes, all mapped from source grades to one `date` class. Grouped splits are train 744/1,111 boxes, validation 201/204 boxes, test 166/196 boxes. The preparation report explicitly records **zero negative images**.
- Previous grouped evaluation: validation best epoch 85; validation precision 0.9942, recall 0.98529, mAP@0.5 0.98655, mAP@0.5:0.95 0.9554. Held-out test metrics are listed in §6. This audit did not retrain or rerun the complete evaluator.
- Browser ONNX file and YOLOv5 one-class dataset are the detector artifacts. Three additional held-out positive images and a synthetic blank negative were run through the standalone predictor.
- MobileViT-S checkpoint metadata and backend class mapping agree on eight classes; backend health reports the same order. The checkpoint remains an external Desktop dependency.
- Gate class index 1 is assumed to mean `Date`; the gate ONNX export/config lacks an explicit class-order artifact. The observed full-frame positive and blank-negative outputs support the current interpretation but do not replace training provenance.
- The live crop/full-frame gate mismatch was a data-distribution/input-contract mismatch; the paired scene-context/crop contract added after the initial audit resolves the tested case without altering the gate.
- With the unchanged 1% threshold, the gate accepted 161/166 (97.0%) full-scene images in the prepared held-out positive split; the remaining five are not passed through by the new context contract. The split has no negatives and does not establish false-positive performance.

## 18. Performance Analysis

| Measurement | Observed | Qualification |
|---|---:|---|
| Browser YOLO iteration | ~122–141 ms; UI showed 125 ms | One synthetic browser run; iteration includes preprocessing/decode/NMS, not camera FPS |
| Standalone detector | Boxes from `cuda:0` | Three held-out images; no sustained throughput profile |
| Backend direct classifier | ~0.277 s | One warm local full-image request |
| Frontend proxy + backend | ~0.613 s | One warm local full-image request |
| Process snapshot | Node ~976.6 MB; Python ~15.7 MB | One Windows working-set snapshot only; not a capacity benchmark |
| GPU/VRAM utilization | Not measured | Backend explicitly uses CPU; CUDA was used by the standalone predictor |

The ONNX browser loop is the likely live-device bottleneck at the observed ~8 inferences/second equivalent, but the synthetic browser environment and single observation are not suitable for a definitive FPS claim. The backend is loaded once at startup. Only one best crop/context pair is retained; candidate frames are not accumulated.

## 19. Security Review

- A non-empty server-side `ROBOFLOW_API_KEY` exists in `frontend/.env.local`; this report intentionally does not print it. The key was previously disclosed in conversation, so rotate/revoke it before further use. The Roboflow API route reads the key on the server and the key is not part of the browser request.
- `frontend/.gitignore` ignores `.env*`. This directory is not a Git repository, so whether any file is tracked cannot be verified here.
- Focused source/environment checks found no literal key value in the inspected source paths. This was not a formal exhaustive secret scan or penetration test.
- FastAPI inference endpoints are unauthenticated and have no rate limiting. The backend applies a 2 MiB image cap; public deployment should consider request throttling and cost controls.
- CORS accepts configured local origins and a broad `https://*.vercel.app` regex with credentials enabled. No deployment-specific production origin was available to narrow this safely; review before deployment.
- The separate Express prototype is not launched by `dev.ps1`; if deployed independently, its unauthenticated disk-upload route needs its own review.

## 20. Code Quality Review

The active pipeline is split into focused camera, detector-hook, live-orchestration, shared-state, proxy, and backend modules. It uses a small stage state machine and retains only one selected crop. Coordinate and crop validation, timeout handling, response-shape checks, camera-track cleanup, and confidence labeling are now more explicit.

Remaining quality concerns: the backend retains a no-op `is_date_image` helper whose OOD logic is commented out and whose return is unconditionally true; it is not the active date gate. The live best-frame score has no image-quality metric. There is no maintained frontend unit-test suite for the state machine or coordinate/crop helpers.

## 21. Project Structure

The active startup path is `dev.ps1` → `backend/api_server` plus `frontend`; the active frontend build is `frontend/package.json`. The detector’s dataset preparation/training/evaluation tools live under `scripts/` and model/data outputs under `training/` and `Dates Detection.date-gate.dataset/`.

Root folders `client/` and `server/` contain a separate Vite/Express prototype; `dev.ps1` does not start them, and the Express `processImage` implementation is a TODO returning `null`. The Roboflow hosted-model route is also separate from the local ONNX detector. `dates_dataset/` is a large research/training dataset (observed roughly 11.6 GB); it is not read by the live web path. `_scratch/`, prompt/config folders, and YOLOv5 source are not active runtime entry points.

These areas may be intentional research artifacts. They were inventoried but **not deleted or moved** because their ownership/purpose cannot be safely inferred. No broad reorganization was justified by the live-path audit.

## 22. Files Changed

### Changes made during this audit

| File | Change |
|---|---|
| `frontend/src/hooks/useDateDetector.ts` | Clamp mapped boxes to display bounds; reject non-finite, non-positive, and degenerate detections |
| `frontend/src/components/sections/LiveDemoPanel.tsx` | Validate crop coordinates/dimensions/encoding; capture paired scene context; attach selected YOLO confidence to live result; remove misleading retry state |
| `frontend/src/components/layout/LiveDemoLayout.tsx` | Carry optional detection confidence with classifier response; remove obsolete retry-loop state |
| `frontend/src/components/sections/CameraFeed.tsx` | Handle ended tracks, clear dead stream, and make Retry reacquire the selected camera |
| `frontend/src/app/api/classify/route.ts` | Add a 55-second backend timeout and guard invalid JSON/classification payloads |
| `frontend/src/components/sections/AIClassifierDemo.tsx` | Display detection and classification confidence separately; correct MobileViT-S/model-validation copy; remove unused confidence/retry code |
| `frontend/messages/{en,ar,ur}.json` | Localize corrected model facts, confidence labels, classifier description, and camera-disconnect text |
| `frontend/src/components/sections/DatasetVideo.tsx` | Remove the empty video source that caused a browser console error |
| `frontend/src/components/sections/MarketplaceDemo.tsx` | Use the existing localized description instead of missing `marketplace.arhti` |
| `AGENTS.md` | Correct the classifier API architecture description |
| `backend/api_server/main.py` | Add optional `context_image` input for gate-only preprocessing; keep the classification crop and gate threshold behavior intact |
| `backend/api_server/test_live_context.py` | Cover paired gate/classifier inputs, legacy requests, and gate rejection |
| `docs/live-inference-engineering-audit.md` | This report |

No persistent files were deleted. Temporary browser/test images and annotated predictions were removed. The earlier integration’s model, scripts, backend MobileViT-S support, and launcher changes predate this audit and are inventoried as existing artifacts below.

## 23. Bugs Found

| ID | Component | Issue | Severity | Root cause | Fix | Status |
|---|---|---|---|---|---|---|
| AUD-01 | Live classifier copy | UI claimed ResNet-50/Fold 2/98.7% and 500 ms continuous updates; current checkpoint is MobileViT-S/Fold 4/94.44% and classifies once per verified capture | MEDIUM | Old model/loop copy remained after checkpoint and pipeline changes | Updated English/Arabic/Urdu model copy and live status | FIXED; build and browser content checked |
| AUD-02 | Live confidence UI | Detector confidence was not carried to the result; displayed confidence was ambiguous | MEDIUM | Live state only contained backend classifier response | Carry selected-frame YOLO confidence and render separate detection/classification labels; annotation shows variety only | FIXED; successful held-out result returned through proxy |
| AUD-03 | Detector geometry | Coordinate conversion only partially clamped; non-finite/degenerate outputs could reach drawing/cropping | MEDIUM | Decoder did not reject invalid boxes | Clamp all coordinates, reject invalid confidence/dimensions/degenerate boxes | FIXED; positive bounds and production build checked; malformed output not injected |
| AUD-04 | Crop encoding | Crop lacked complete finite/order/minimum-size checks; null JPEG encoding could pass as an absent candidate | MEDIUM | Canvas crop accepted invalid inputs and resolved `toBlob` null | Validate source and box, enforce positive crop, reject failed JPEG encoding | FIXED; valid 240 × 96 crop exercised; forced invalid-box/encoder cases not tested |
| AUD-05 | Camera lifecycle | Ended camera tracks were not surfaced, and same-device Retry could fail to reacquire | MEDIUM | No track-ended listener and no acquisition generation | Clear source, show localized disconnect error, and force a new acquisition attempt | FIXED in code; getUserMedia failure path tested; physical ended-event path not tested |
| AUD-06 | Classify proxy | Backend request could wait without a route-level timeout; invalid success JSON/schema was not distinguished | MEDIUM | Unbounded `fetch` and unconditional JSON forwarding | 55-second timeout (504) and minimum response-shape validation (502) | FIXED in code; timeout/malformed-response branches not forced |
| AUD-07 | Homepage UI | Empty video source emitted browser console error; marketplace rendered missing translation key | LOW | Placeholder `<source src="">` and `t("arhti")` key absent from locales | Removed empty source; use existing localized description key | FIXED; fresh browser page showed no empty source/missing key |
| AUD-08 | Live crop → backend gate | Correctly cropped date was rejected before MobileViT-S; full frame passes | HIGH — release blocker | Backend gate's input contract expected a scene image rather than a tight date crop | Send paired scene context to the unchanged gate and keep the crop as classifier input | FIXED for tested held-out scene/crop; physical-camera validation pending |

## 24. Warnings / Non-Critical Issues

- The prepared detector training dataset contains no negative images. A historical pilot check reported detections in 12 of 21 negative images; those files are currently absent from `Desktop\date_detection_pilot\negatives` (zero images), so that result was not reproducible in this audit.
- `backend/Gate/gate_config.json` specifies a low 0.01 threshold. The inspected gate configuration does not include an explicit output-class label map.
- If the backend gate artifact is absent, the backend logs that it will pass inputs through; the `/health` endpoint still reports classifier availability separately.
- FastAPI runs the date classifier on CPU, while browser WASM performance depends on the client machine. One browser iteration was about 125 ms; no sustained benchmark was run.
- Full-project ESLint was not run. Focused lint passed with only two existing `<img>` optimization warnings in `AIClassifierDemo.tsx`; TypeScript had no errors.
- No frontend test files or test runner were found under `frontend/src`. The package scripts provide build, lint, and i18n checks, not a dedicated test suite.
- A prior local `npm ci` lockfile/optional Tailwind platform-package mismatch was recorded before this audit; manifests were not changed and a clean dependency reinstall was not attempted.
- The local MobileViT-S checkpoint is outside the repository. A new machine needs that checkpoint or an explicitly configured model source.

## 25. Deferred Issues

1. **Known detector false positives:** preserve the previously agreed deferral; no negative-data retraining, confidence redesign, or detector replacement was done.
2. **Crop/gate generalization:** the tested mismatch is addressed by gating on paired full-scene context while classifying the crop. Validate this contract across more held-out scenes and a real camera; the gate is not an authentication boundary.
3. **Best-frame quality:** sharpness, blur, occlusion, and motion quality remain unscored.
4. **Tracking:** multiple detections are not assigned stable identities.
5. **Physical camera/IP input:** no URL/RTSP support or real-device disconnect test.

## 26. Known Limitations

- A browser-permission failure is handled, but a source that freezes while its track remains live is not detected by a frame-clock watchdog.
- The browser's repeated-image stream is static content with advancing video frames; it is not evidence for camera motion, focus, changing exposure, or real-world latency.
- Exact five-second wall-clock accuracy, disappearance/reset timing, low-confidence edge behavior, moving/multiple dates, and camera reconnection were not independently instrumented.
- Crop coordinates are associated with the latest detector box but sampled from a later current video frame. Rapid movement can create slight box/frame skew.
- Current best-frame selection is confidence-first/area-second and may select a blurred or occluded crop.
- End-to-end success is blocked by the backend gate's response to valid crops.
- No formal penetration test, exhaustive secret scan, memory stress test, or capacity test was performed.

## 27. Testing Results

| Check | Result |
|---|---|
| Three held-out positive YOLO inference runs | PASS |
| Synthetic blank negative YOLO inference | PASS (limited negative) |
| Full-frame classifier direct endpoint | PASS; returned Mabroom/38.8% and `p_date=100%` |
| Valid classifier request through Next.js proxy | PASS |
| Corrupt/invalid image through direct backend and proxy | PASS; HTTP 400 |
| Missing image field through proxy | PASS; HTTP 400 |
| Synthetic camera permission failure UI | PASS; visible error and Retry |
| No camera frames do not start countdown | PASS |
| Browser sample stream model/detector operation | PASS for one repeated-image scenario; about 125 ms observed iteration |
| Live crop creation | PASS for one sample; screenshot/preview showed 240 × 96 date JPEG |
| Crop-only request accepted by backend gate | **FAIL as expected**; `P(date)=0%`, threshold `1%` |
| Held-out scene context + crop through backend | PASS; gate `P(date)=100%`; MobileViT-S returned Ajwa/23.83% |
| Held-out scene context + crop through Next.js proxy | PASS; same successful classifier response |
| Held-out positive split gate scan | PASS/known limitation; 161/166 scenes and 188/196 annotated crops above the unchanged threshold |
| Context image gates while crop is classified | PASS; three focused backend regression tests |
| Legacy request without `context_image` | PASS; gate still evaluates the uploaded classification image |
| Context rejection below gate threshold | PASS; classifier was not invoked |
| `npm run i18n:check` | PASS |
| Focused ESLint | PASS with two existing `<img>` warnings |
| `npx tsc --noEmit` | PASS |
| `npm run build` | PASS |
| Physical camera, camera track-ended, disconnect/reconnect | NOT TESTED — no physical camera |
| Held-out scene context → gate → crop classifier | PASS through backend and Next.js proxy |
| Physical-camera capture → successful live result | NOT TESTED — no physical camera |

## 28. Final System Status

**SYSTEM STATUS: PARTIALLY VALIDATED — held-out synthetic scene/crop classification completes; real-camera readiness is not yet verified.**

| Area | Verdict | Evidence |
|---|---|---|
| Detection | PASS | Three held-out positives, blank synthetic negative, browser detector output |
| Temporal verification | PARTIAL | Stable repeated-image flow reached backend; edge scenarios not tested |
| Countdown | PARTIAL | Post-deadline classify path executed; exact 5.000-second timing not measured |
| Best frame | PARTIAL | One usable candidate/crop produced; candidate ranking not compared across quality-varying frames |
| Cropping | PASS (one synthetic case) | Source-video crop was 240 × 96 and visibly contained one date |
| Classification | PASS for tested scene/crop pair | Context passed the unchanged gate; MobileViT-S classified the crop as Ajwa at 23.83% |
| Backend service | PASS operationally | Health true, model/gate loaded, paired-context and legacy requests tested |
| Frontend | PASS build/UI errors | Production build, successful proxy integration, locale checks, camera error UI verified |
| Error handling | PARTIAL | Invalid image and camera permission covered; timeout/schema/disconnect runtime branches not forced |
| End-to-end API pipeline | PASS for tested held-out pair | Next.js proxy forwarded scene context and crop; variety result returned |
| End-to-end browser/camera pipeline | PARTIAL | Capture code builds; no physical camera was available to verify a real camera session |
| Overall | **PARTIALLY VALIDATED** | Tested scene/crop path completes; real-world capture and gate generalization remain unverified |

## 29. Recommended Next Steps

1. Investigate the five positive held-out scenes rejected by the unchanged gate; preserve its threshold until negative-scene behavior is measured.
2. Validate the paired scene-context/crop contract on approved negative scenes and more held-out sources.
3. Test with a real camera: dates entering/leaving frame, moving dates, multiple dates, transport freeze, device disconnect/reconnect, and no-date scenes.
4. Obtain/use an approved negative-image set to quantify false positives before changing the YOLO threshold or model.
5. Rotate the previously exposed Roboflow key, and restrict production CORS/rate-limit policy to the deployed frontend.
6. Add focused automated tests for `decodeYoloOutput`, crop mapping/validation, temporal state transitions, timeout/schema errors, and no-countdown-on-camera-loss.
7. Verify a clean install in a separate environment before addressing the previously recorded npm lockfile issue.

## 30. How to Run the Final System

From the repository root in PowerShell:

```powershell
.\dev.ps1
```

The frontend should be available at `http://localhost:3000`; backend health and API docs are `http://localhost:8000/health` and `http://localhost:8000/docs`. The local launcher uses `training\.venv\Scripts\python.exe` when available and sets `MODEL_PATH` when the Desktop MobileViT-S checkpoint exists. Ensure `frontend\.env.local` has the local `CLASSIFY_API_URL` configuration; do not put Roboflow credentials in client-side source.

Stop both services with:

```powershell
.\stop-dev.ps1
```

The frontend and updated backend are running locally. The held-out scene/crop proxy request succeeds; physical-camera validation remains outstanding.

## Final Artifact Inventory

| Artifact | Purpose | Status / notes |
|---|---|---|
| `frontend/public/models/date-detector.onnx` | Browser YOLOv5n date detector | Present, 7,489,752 bytes; used by `useDateDetector` |
| `backend/Gate/mobilenetv4_gate.onnx` | Backend binary date gate | Present, 9,955,278 bytes; gate weights unchanged |
| `backend/Gate/gate_config.json` | Gate threshold/provenance configuration | Present; threshold 0.01; no explicit output label map |
| `Desktop/model_classifier/mobilevit_fold4_stage2_best.pth` | Eight-class MobileViT-S checkpoint | Exists outside repo; local runtime dependency |
| `Dates Detection.date-gate.dataset/` | Prepared one-class YOLO dataset | Present; 1,111 positive images, no negatives |
| `training/runs/detect/date-gate-yolov5n-grouped/` | YOLOv5n training/checkpoint output | Present; weights/config/results retained |
| `training/runs/test/date-gate-yolov5n/` | Earlier held-out YOLO evaluation | Existing training artifact; not regenerated during this audit |
| `scripts/prepare_date_gate_dataset.py` | Polygon-to-box conversion and grouped split | Existing training utility |
| `scripts/train_date_gate.ps1` | YOLOv5n training launcher | Existing training utility |
| `scripts/evaluate_date_gate.ps1` | Held-out evaluation launcher | Existing evaluation utility |
| `scripts/predict_date_detector.py` | Independent local image inference | Used for positive/negative smoke tests |
| `frontend/scripts/copy-ort.mjs` | Install-time copy of browser ONNX runtime assets | Existing integration support |
| `frontend/src/app/api/roboflow-detect/route.ts` | Separate hosted Roboflow demo proxy | Not used by local YOLO live pipeline |
| `client/`, `server/` | Separate Vite/Express prototype | Not started by `dev.ps1`; retained, not deleted |
| `dates_dataset/` | Larger classification/research data | About 11.6 GB; not read by live inference |
| `frontend/.env.local` | Local frontend environment/secrets | Present and ignored by `.gitignore`; secret omitted here and should be rotated |
| `docs/live-inference-engineering-audit.md` | This audit record | Added during audit |

No project directories were removed or moved. The temporary `frontend/public/audit-date-fixture.jpg`, the follow-up `frontend/public/_pipeline-validation-date.jpg`, and temporary annotated test outputs were deleted. Git status/commit state could not be reported because the workspace root is not a Git repository.
