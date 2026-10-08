# Agrovisoon / Fruitelligence — Technical Architecture Report

> **Generated:** 2026-08-23
> **Purpose:** Onboarding reference — self-contained description of the codebase for new contributors.

---

## Table of Contents

1. [Tech Stack](#1-tech-stack)
2. [Project Structure](#2-project-structure)
3. [File-by-File / Module Breakdown](#3-file-by-file--module-breakdown)
4. [Data & Control Flow](#4-data--control-flow)
5. [Module Dependency Map](#5-module-dependency-map)
6. [Gaps & Risks](#6-gaps--risks)

---

## 1. Tech Stack

### 1.1 Frontend

| Concern | Technology | Exact Version |
|---|---|---|
| Framework | Next.js (App Router) | `16.2.11` |
| Runtime | React | `19.2.4` |
| Language | TypeScript | `^5` (latest 5.x) |
| Styling | Tailwind CSS v4 + custom CSS variables | `^4` |
| Animation | Framer Motion | `^11.18.0` |
| Icons | Lucide React | `^0.474.0` |
| Fonts | Google Fonts via `next/font` — Playfair Display (display), Plus Jakarta Sans (body) | CDN, no version pinned |
| State management | Local React `useState` / `useRef` — **no global state library** | — |
| Build tool | Webpack (forced via `next dev --webpack` in `package.json`) | bundled with Next.js |
| CSS post-processor | PostCSS + `@tailwindcss/postcss` | `^4` |
| Linting | ESLint 9 + `eslint-config-next` | `^9` / `16.2.11` |

> **Note:** The dev script explicitly forces Webpack with `next dev --webpack`, meaning Turbopack is intentionally **disabled**.

### 1.2 Backend

| Concern | Technology | Exact Version (from `requirements.txt`) |
|---|---|---|
| Framework | FastAPI | `>=0.111.0` |
| ASGI Server | Uvicorn (standard) | `>=0.29.0` |
| Language | Python | Not pinned in `requirements.txt`; Render uses its default Python runtime |
| Deep-learning runtime | PyTorch (CPU-only build) | `2.13.0+cpu` |
| Vision utilities | TorchVision (CPU-only) | `0.28.0+cpu` |
| Image decoding | Pillow | `>=10.0.0` |
| Multipart upload parsing | python-multipart | `>=0.0.9` |
| Model download helper | gdown (Google Drive) | `>=5.1.0` |
| Authentication | **None** — public endpoints, no auth middleware | — |
| Database / ORM | **None** — stateless inference server only | — |

### 1.3 AI / ML

| Concern | Detail |
|---|---|
| Model architecture | ResNet-50 (torchvision standard implementation) |
| Task | 8-class image classification of date fruit varieties |
| Classes | Ajwa, Amber, Kalmi, Mabroom, Mazafati, Rabbi, Sagai, Zahedi |
| Checkpoint file | `resnet50_fold2_finetuned_best.pth` (~90 MB PyTorch state dict) |
| FC head modification | Standard FC replaced with `nn.Sequential(nn.Identity(), nn.Linear(in_features, 8))` |
| Inference method | **Local weights loaded at server startup** via `torch.load` — no external API calls at inference time |
| Serving framework | Raw FastAPI — no vLLM, Ollama, or TorchServe |
| Preprocessing | `Resize(224,224)` → `ToTensor` → `Normalize(mean=[0.485,0.456,0.406], std=[0.229,0.224,0.225])` (ImageNet standard) |
| OOD detection | Dual strategy: (1) top-1 confidence threshold at 45%, (2) Shannon entropy threshold at 2.0 |
| Reported val accuracy | 98.7% (stored in checkpoint, logged at startup) |
| Cross-validation | Fold 2 of a k-fold training run |

### 1.4 Infrastructure & Configuration

| Concern | Detail |
|---|---|
| Frontend hosting | Vercel (inferred from `*.vercel.app` CORS allowlist and `CLASSIFY_API_URL` docs) |
| Backend hosting | Render (free tier web service, `render.yaml` present) |
| Env management (frontend) | `.env.local` (git-ignored); template at `.env.local.example` |
| Env management (backend) | Render dashboard env vars (`GDRIVE_MODEL_ID`, `MODEL_CACHE_DIR`); optional `MODEL_PATH` override |
| Backend deployment config | `render.yaml` (Render IaC) + `Procfile` (Heroku-compatible fallback) |
| Frontend build config | `next.config.ts` (empty — no custom config beyond defaults) |
| TypeScript config | `tsconfig.json` — strict mode, `@/*` path alias to `./src/*` |
| Model local path | `FYP_Model_Progress_Demo/ResNet50/Fold_2/resnet50_fold2_finetuned_best.pth` |
| Model cloud path | Downloaded from Google Drive at cold start via `gdown` using `GDRIVE_MODEL_ID` env var |

---

## 2. Project Structure

```
d:\FYP workings\Agrovisoon\
|
+-- agrovision-app/                  <- Next.js frontend application
|   +-- src/
|   |   +-- app/                     <- Next.js App Router root
|   |   |   +-- api/
|   |   |   |   +-- classify/
|   |   |   |   |   +-- route.ts     <- POST proxy to Python FastAPI /classify
|   |   |   |   +-- keepalive/
|   |   |   |       +-- route.ts     <- GET proxy to Python FastAPI /health
|   |   |   +-- globals.css          <- Design system: CSS variables, utilities, animations
|   |   |   +-- layout.tsx           <- Root layout: fonts, metadata, ServerKeepAlive
|   |   |   +-- page.tsx             <- Single-page home; assembles all section components
|   |   +-- components/
|   |       +-- layout/              <- Structural primitives (no business logic)
|   |       |   +-- BentoGrid.tsx    <- Responsive CSS Grid wrappers
|   |       |   +-- Container.tsx    <- Max-width + horizontal padding wrapper
|   |       |   +-- Footer.tsx       <- Site footer with nav links and newsletter form
|   |       |   +-- Navbar.tsx       <- Sticky nav with scroll-spy active state
|   |       |   +-- SectionWrapper.tsx  <- Semantic <section> with id + className
|   |       +-- motion/              <- Animation and side-effect utilities
|   |       |   +-- AnimatedCounter.tsx  <- Viewport-triggered count-up animation
|   |       |   +-- ServerKeepAlive.tsx  <- Zero-UI hook runner for backend pinging
|   |       |   +-- StaggerContainer.tsx <- Framer Motion stagger wrapper (UNUSED)
|   |       |   +-- useServerKeepAlive.ts <- Custom hook: pings /api/keepalive every 14 min
|   |       +-- sections/            <- Full-width page sections (content, no routing)
|   |           +-- AIClassifierDemo.tsx <- Primary feature: image upload + classify UI
|   |           +-- AboutUs.tsx      <- Team member bios and project background
|   |           +-- BentoFeatures.tsx   <- Feature overview bento grid
|   |           +-- EconomicImpact.tsx  <- GDP/export stats with animated counters
|   |           +-- HealthUses.tsx   <- Nutritional and industrial use-case tabs
|   |           +-- Hero.tsx         <- Landing hero banner
|   |           +-- MarketplaceDemo.tsx <- Farm-to-buyer vs. middleman comparison
|   |           +-- Roadmap.tsx      <- Project milestone timeline
|   |           +-- TreeDigitization.tsx <- GIS/QR palm tree tracking explainer
|   |           +-- VarietiesGallery.tsx <- Filterable date variety card gallery
|   +-- public/                      <- Static assets
|   |   +-- placeholder-*.jpg/jpeg  <- Team and date variety photos (10 images)
|   |   +-- *.svg                   <- Generic SVG icons
|   +-- .env.local.example           <- Environment variable template
|   +-- next.config.ts               <- Next.js config (currently empty)
|   +-- package.json                 <- NPM manifest + dependency versions
|   +-- postcss.config.mjs           <- PostCSS config for Tailwind v4
|   +-- tsconfig.json                <- TypeScript compiler options
|
+-- FYP_Model_Progress_Demo/         <- Python inference backend
|   +-- api_server/                  <- Deployable FastAPI service
|   |   +-- main.py                  <- Entire backend: model loading, endpoints, OOD logic
|   |   +-- requirements.txt         <- Python dependencies with exact versions
|   |   +-- render.yaml              <- Render.com deployment specification
|   |   +-- Procfile                 <- Heroku-style process declaration
|   |   +-- check_env.py             <- Dev utility to verify Python/torch/fastapi install
|   |   +-- .gitignore               <- Backend-specific git ignores
|   +-- ResNet50/
|       +-- Fold_2/
|           +-- resnet50_fold2_finetuned_best.pth  <- Fine-tuned checkpoint (~90 MB)
|           +-- resnet50_fold2_head_best.pth        <- Head-only checkpoint (~90 MB, UNUSED in code)
|
+-- design-system/                   <- Design assets/documentation (not deployed)
+-- .agents/                         <- AI agent customizations (skills, rules)
+-- .gitignore                       <- Root-level git ignores
+-- changestomake.txt                <- Developer notes / TODO scratch file
+-- todays_work_summary.txt          <- Developer session log
+-- Karachi_Dates_Market_Survey_Report.docx <- Primary data source for pricing
+-- ARCHITECTURE.md                  <- This file
```

---

## 3. File-by-File / Module Breakdown

### 3.1 Backend — `FYP_Model_Progress_Demo/api_server/`

#### `main.py`

**Responsibility:** The entire backend in one file. Handles model resolution, loading, ASGI app setup, CORS, and all HTTP endpoints.

**Key exports / symbols:**

| Symbol | Type | Purpose |
|---|---|---|
| `app` | `FastAPI` instance | ASGI application entrypoint |
| `CLASS_NAMES` | `list[str]` | Ordered class labels matching model output indices |
| `INFERENCE_TRANSFORM` | `transforms.Compose` | Preprocessing pipeline applied before inference |
| `NON_DATE_CONFIDENCE_THRESHOLD` | `float = 45.0` | OOD threshold constant |
| `resolve_checkpoint()` | function | Multi-strategy checkpoint path resolution |
| `build_model()` | function | Reconstructs ResNet-50 architecture + loads weights |
| `is_date_image()` | function | OOD filter: confidence + Shannon entropy check |
| `lifespan()` | async context manager | Startup/shutdown model lifecycle |
| `GET /health` | endpoint | Health check returning model load status + class list |
| `POST /classify` | endpoint | Accepts `UploadFile`, returns JSON classification result |

**Imported by:** Nothing in this repo — it is the entrypoint, launched by Uvicorn directly.

**Internal flow of `POST /classify`:**
1. Read `UploadFile` bytes → `PIL.Image.open().convert("RGB")`
2. Apply `INFERENCE_TRANSFORM` → `torch.Tensor`
3. `model(tensor)` → raw logits → `torch.softmax` → probabilities
4. Extract top-1 class + confidence
5. Call `is_date_image()` for OOD check
6. Return JSON dict

---

#### `requirements.txt`

**Responsibility:** Exact Python dependency specification. Uses PyPI extra index for CPU-only PyTorch wheels.

```
fastapi>=0.111.0
uvicorn[standard]>=0.29.0
torch==2.13.0+cpu
torchvision==0.28.0+cpu
pillow>=10.0.0
python-multipart>=0.0.9
gdown>=5.1.0
```

---

#### `render.yaml`

**Responsibility:** Infrastructure-as-code for Render.com. Defines the web service, build/start commands, plan (free tier), and required env vars (`GDRIVE_MODEL_ID`, `MODEL_CACHE_DIR`).

---

#### `Procfile`

**Responsibility:** Heroku-compatible process declaration. Fallback if `render.yaml` is not used. Contains: `web: uvicorn main:app --host 0.0.0.0 --port $PORT`.

---

#### `check_env.py`

**Responsibility:** Developer utility script to verify that Python, torch, fastapi, and uvicorn are installed. **Not imported anywhere** — standalone diagnostic tool.

---

### 3.2 Frontend — `agrovision-app/src/app/`

#### `layout.tsx`

**Responsibility:** Next.js root layout. Loads Google Fonts (Playfair Display, Plus Jakarta Sans), sets `<html>` class for CSS variable mapping, injects `<ServerKeepAlive />`, and exports page metadata for SEO.

**Exports:** `RootLayout` (default), `metadata` (Next.js Metadata object)

**Imports:** `ServerKeepAlive`, `globals.css`, `next/font/google`

---

#### `page.tsx`

**Responsibility:** The single home page. Composes all 10 section components in render order. No logic of its own.

**Render order:** `Navbar` → `Hero` → `AIClassifierDemo` → `BentoFeatures` → `VarietiesGallery` → `EconomicImpact` → `HealthUses` → `TreeDigitization` → `MarketplaceDemo` → `AboutUs` → `Roadmap` → `Footer`

**Imports:** All 10 section components + `Navbar` + `Footer`

---

#### `globals.css`

**Responsibility:** The entire design system. Defines:
- All semantic color tokens under `@theme { --color-* }` (Tailwind v4 custom properties)
- Typography tokens (`--font-display`, `--font-body`)
- Shadow and radius tokens
- Utility classes: `.glass-light`, `.glass-dark`, `.glass-card`, `.organic-pattern`, `.no-scrollbar`, `.focus-ring-custom`
- Component classes: `.btn-primary`, `.btn-secondary`, `.badge-origin`, `.card-variety`
- Custom keyframe animations: `spin-slow`, `scan-laser`
- `prefers-reduced-motion` media query override

**Imported by:** `layout.tsx` (once, root scope)

---

#### `app/api/classify/route.ts`

**Responsibility:** Next.js Route Handler acting as a **server-side proxy**. Forwards multipart form-data from the browser to the Python backend at `$CLASSIFY_API_URL/classify`. This keeps the actual backend URL server-side only.

**Exports:** `POST` (named export for Next.js route handling)

**Key constants:**
- `dynamic = "force-dynamic"` — disables caching
- `maxDuration = 60` — allows up to 60 s for Render cold-start latency (requires Vercel Pro plan)

**Environment variable:** `CLASSIFY_API_URL` (server-side only; defaults to `http://localhost:8000`)

**Called by:** Browser `fetch("/api/classify", { method: "POST", body: FormData })` in `AIClassifierDemo.tsx`

---

#### `app/api/keepalive/route.ts`

**Responsibility:** Next.js Route Handler that pings `$CLASSIFY_API_URL/health` with a 10-second timeout, then returns a normalized status JSON. Always returns HTTP 200 so the client-side hook treats any response as success.

**Exports:** `GET` (named export)

**Called by:** `useServerKeepAlive` hook → `ServerKeepAlive` component → `layout.tsx`

---

### 3.3 Frontend — `agrovision-app/src/components/layout/`

#### `Container.tsx`

**Responsibility:** `max-w-7xl` centered wrapper with responsive horizontal padding. Accepts optional `clean` prop to remove constraints.

**Exports:** `Container` (default)

**Imported by:** `Navbar`, `Footer`, and all 10 section components.

---

#### `SectionWrapper.tsx`

**Responsibility:** Wraps content in a semantic `<section>` element with an optional `id` for scroll-spy navigation.

> **Note:** The `delay` prop is declared in the interface but **not read or applied** in the implementation. It is a dead prop.

**Exports:** `SectionWrapper` (default)

**Imported by:** All section components except `Hero` (Hero uses `Container` directly, no `SectionWrapper`).

---

#### `BentoGrid.tsx`

**Responsibility:** CSS Grid layout primitives for bento-style card arrangements.

**Exports:** `BentoGrid` (named), `BentoGridItem` (named)

**Imported by:** `BentoFeatures.tsx` only.

---

#### `Navbar.tsx`

**Responsibility:** Sticky navigation bar with scroll-triggered backdrop blur, scroll-spy active section detection, smooth-scroll anchor navigation, and a mobile hamburger drawer.

**Exports:** `Navbar` (default)

**Imported by:** `page.tsx`

---

#### `Footer.tsx`

**Responsibility:** Dark-themed footer with nav links, project vision blurb, and a newsletter subscription form (client-side state only — no actual backend submission).

**Exports:** `Footer` (default)

**Imported by:** `page.tsx`

---

### 3.4 Frontend — `agrovision-app/src/components/motion/`

#### `useServerKeepAlive.ts`

**Responsibility:** Custom React hook. On mount: fires an immediate `fetch("/api/keepalive")`, then sets a 14-minute `setInterval`. Cleans up on unmount. No return value.

**Exports:** `useServerKeepAlive` (named)

**Imported by:** `ServerKeepAlive.tsx`

---

#### `ServerKeepAlive.tsx`

**Responsibility:** A zero-render `"use client"` component whose only purpose is to call `useServerKeepAlive()` from within the server component tree (`RootLayout`). Returns `null`.

**Exports:** `ServerKeepAlive` (default)

**Imported by:** `layout.tsx`

---

#### `AnimatedCounter.tsx`

**Responsibility:** Viewport-triggered count-up number animation using `framer-motion`'s `useInView`. Runs once when the component enters the viewport. Uses cubic ease-out at 60 fps via `setInterval`.

**Exports:** `AnimatedCounter` (default)

**Imported by:** `EconomicImpact.tsx` (only consumer)

---

#### `StaggerContainer.tsx`

**Responsibility:** Framer Motion stagger animation wrapper. Exports both the parent container and child item variants. Respects `prefers-reduced-motion`.

**Exports:** `StaggerContainer` (default), `StaggerItem` (named)

**Imported by:** **None** — this component is **orphaned/unused** in the current codebase.

---

### 3.5 Frontend — `agrovision-app/src/components/sections/`

#### `AIClassifierDemo.tsx` — Primary Feature

**Responsibility:** The main interactive feature. Provides an image upload UI (drag-and-drop or click-to-browse), sends the image to `/api/classify`, displays animated scan progress, and renders a classification report card with probability bars and market pricing.

**Exports:**
- `AIClassifierDemo` (default) — the section component
- `checkNonDateImage()` (named) — client-side OOD detection logic
- `NON_DATE_CONFIDENCE_THRESHOLD` (named constant `= 45.0`)
- `NonDateCheckResult` (named interface)

**Key state:**
`uploadedImage`, `rawFile`, `scanning`, `scanStep`, `scanCompleted`, `classifiedResult`, `confidence`, `allProbabilities`, `isDragOver`, `error`, `validationError`, `isNonDate`

**API contract (hardcoded against `/api/classify`):**

```typescript
// Request: POST /api/classify  multipart/form-data { image: File }
// Response:
interface ClassifyApiResponse {
  variety: string;
  confidence: number;
  all_probabilities: Record<string, number>;
  is_date?: boolean;
  non_date_reason?: string;
  error?: string;
  message?: string;
}
```

---

#### `Hero.tsx`

**Responsibility:** Landing hero with headline, description, and CTA buttons. Background image from `/public/placeholder-hero-orchard.jpeg`. No dynamic data.

---

#### `BentoFeatures.tsx`

**Responsibility:** A 3-column bento grid showcasing 5 product pillars (AI Classifier, Marketplace, Tree GIS, Variety DB, Export Analytics). Static content.

**Imports:** `BentoGrid`, `BentoGridItem`, `SectionWrapper`, `Container`, `lucide-react`

---

#### `VarietiesGallery.tsx`

**Responsibility:** Interactive gallery of 8 date varieties. Client-side filter by type (all / local / imported). Each card shows variety photo, origin badge, price range, and nutritional highlights.

---

#### `EconomicImpact.tsx`

**Responsibility:** Dark section with animated stat counters (GDP share, export volume, etc.) sourced from static hardcoded data. The only consumer of `AnimatedCounter`.

---

#### `HealthUses.tsx`

**Responsibility:** Tabbed UI showing health, nutritional, and industrial use cases of dates. Client-side tab state only.

---

#### `TreeDigitization.tsx`

**Responsibility:** Explainer section for the planned GIS/QR palm tree traceability feature. Fully static content.

---

#### `MarketplaceDemo.tsx`

**Responsibility:** Side-by-side comparison of traditional middleman supply chain vs. the Fruitelligence direct marketplace. Fully static content.

---

#### `AboutUs.tsx`

**Responsibility:** Team bios for 4 FYP contributors with placeholder photos from `/public/`. Social links (GitHub, LinkedIn, email) are partially populated.

---

#### `Roadmap.tsx`

**Responsibility:** Vertical timeline of project milestones (completed, in-progress, planned). Fully static content.

---

## 4. Data & Control Flow

### Flow 1: AI Image Classification (Primary Feature)

```
BROWSER (client-side)
  User drops/selects an image file
    -> AIClassifierDemo.tsx handleFile()
       * Validates file.type starts with "image/"
       * Reads via FileReader -> base64 data URL -> setUploadedImage()
       * Stores raw File in setRawFile()
    -> User clicks "Classify Date Variety" -> handleClassify()
       * Guards: requires uploadedImage && rawFile
       * Starts UI scan animation (setTimeout steps)
       * Builds FormData: form.append("image", rawFile, rawFile.name)
    -> fetch("/api/classify", { method: "POST", body: FormData })

          | HTTP POST (same-origin, multipart/form-data)
          v

NEXT.JS SERVER (app/api/classify/route.ts)
  POST /api/classify
    * Parses multipart form-data via req.formData()
    * Validates "image" field exists and is a Blob
    * Reads CLASSIFY_API_URL env var (server-side only)
    * Re-posts FormData to {CLASSIFY_API_URL}/classify

          | HTTP POST (server-to-server, multipart/form-data)
          v

PYTHON FASTAPI BACKEND (main.py on Render)
  POST /classify
    * Reads UploadFile bytes
    * PIL.Image.open().convert("RGB")
    * INFERENCE_TRANSFORM(pil_image).unsqueeze(0).to(device)
    * model(tensor) -> logits
    * torch.softmax() -> probabilities (tensor, 8 values)
    * probabilities.max() -> (confidence_val, predicted_idx)
    * CLASS_NAMES[predicted_idx] -> predicted_class
    * Build all_probs dict (8 classes with percentage values)
    * is_date_image() -> OOD check (confidence threshold + Shannon entropy)
    * Return JSON: { variety, confidence, all_probabilities, is_date, non_date_reason }

          | JSON response
          v

NEXT.JS SERVER (route.ts)
    * Forwards JSON response unchanged via NextResponse.json()

          | JSON response
          v

BROWSER (AIClassifierDemo.tsx - handleClassify continued)
  const data: ClassifyApiResponse = await res.json()
    * If !res.ok -> throw error -> setError()
    * checkNonDateImage(data.confidence, data.all_probabilities, data)
      -> if OOD: setIsNonDate(true) + setValidationError()
    * VARIETY_MAP.get(data.variety) -> ClassifiedVariety metadata
    * setClassifiedResult(), setConfidence(), setAllProbabilities()
    * setScanCompleted(true) -> renders Classification Report card
```

**Result rendered after success:**
- Identified variety name + confidence % (color-coded: green >=85%, amber >=60%, muted otherwise)
- Top-5 probability bars (sorted descending)
- 2-column spec grid: price range, avg price, texture profile, description
- Market source attribution (Karachi Dates Market Survey)

---

### Flow 2: Backend Keep-Alive Ping

Prevents the Render free-tier backend from sleeping after 15 minutes of inactivity.

```
layout.tsx renders <ServerKeepAlive />
  -> ServerKeepAlive.tsx calls useServerKeepAlive()
  -> Hook fires immediately on mount:
       fetch("/api/keepalive", { cache: "no-store" })
  -> Next.js GET /api/keepalive (route.ts)
       -> fetch(`${CLASSIFY_API_URL}/health`, { signal: AbortSignal.timeout(10_000) })
       -> Python FastAPI GET /health -> { status: "ok", model_loaded: true, classes: [...] }
       -> NextResponse.json({ status: "ok", backend: "alive", detail: {...} })
  -> Hook logs to console.debug only - no UI change
  -> setInterval repeats every 14 minutes
```

---

### Flow 3: Page Navigation (Scroll-Spy)

```
User scrolls page
  -> Navbar useEffect scroll listener fires
  -> Iterates defaultLinks, finds element.offsetTop matching scroll position
  -> setActiveSection(link.href) -> applies "text-accent font-semibold" CSS class

User clicks a nav link
  -> handleLinkClick() prevents default anchor behavior
  -> document.getElementById(targetId) -> element.getBoundingClientRect()
  -> window.scrollTo({ top: offsetPosition - 80, behavior: "smooth" })
  -> setIsOpen(false) (closes mobile drawer if open)
```

---

### Frontend–Backend Coupling Points

| Coupling | Frontend Location | Backend Location |
|---|---|---|
| API base URL | `CLASSIFY_API_URL` env var consumed in `route.ts` | `CLASSIFY_API_URL` set in Render dashboard |
| Classify endpoint path | `/classify` hardcoded in `route.ts:43` | `@app.post("/classify")` in `main.py:256` |
| Health endpoint path | `/health` hardcoded in keepalive `route.ts:23` | `@app.get("/health")` in `main.py:204` |
| Response JSON shape | `ClassifyApiResponse` interface in `AIClassifierDemo.tsx:32-40` | JSON dict returned in `main.py:306-312` |
| Class names (8 varieties) | `SURVEY_VARIETIES` array + `VARIETY_MAP` in `AIClassifierDemo.tsx` | `CLASS_NAMES` list in `main.py:34` |
| OOD threshold value | `NON_DATE_CONFIDENCE_THRESHOLD = 45.0` in `AIClassifierDemo.tsx:53` | `NON_DATE_CONFIDENCE_THRESHOLD = 45.0` in `main.py:217` |
| Form field name | `form.append("image", ...)` in `AIClassifierDemo.tsx:347` | `image: UploadFile = File(...)` in `main.py:257` |

---

## 5. Module Dependency Map

```
layout.tsx
 +-- globals.css
 +-- components/motion/ServerKeepAlive.tsx
      +-- components/motion/useServerKeepAlive.ts
           +-- (fetch) /api/keepalive/route.ts
                        +-- (fetch) Python FastAPI /health

page.tsx
 +-- components/layout/Navbar.tsx
 |    +-- components/layout/Container.tsx
 +-- components/sections/Hero.tsx
 |    +-- components/layout/Container.tsx
 +-- components/sections/AIClassifierDemo.tsx  [PRIMARY FEATURE]
 |    +-- components/layout/SectionWrapper.tsx
 |    +-- components/layout/Container.tsx
 |    +-- (fetch) /api/classify/route.ts
 |                  +-- (fetch) Python FastAPI /classify <- main.py
 +-- components/sections/BentoFeatures.tsx
 |    +-- components/layout/SectionWrapper.tsx
 |    +-- components/layout/Container.tsx
 |    +-- components/layout/BentoGrid.tsx
 +-- components/sections/VarietiesGallery.tsx
 |    +-- components/layout/SectionWrapper.tsx
 |    +-- components/layout/Container.tsx
 +-- components/sections/EconomicImpact.tsx
 |    +-- components/layout/SectionWrapper.tsx
 |    +-- components/layout/Container.tsx
 |    +-- components/motion/AnimatedCounter.tsx
 +-- components/sections/HealthUses.tsx
 |    +-- components/layout/SectionWrapper.tsx
 |    +-- components/layout/Container.tsx
 +-- components/sections/TreeDigitization.tsx
 |    +-- components/layout/SectionWrapper.tsx
 |    +-- components/layout/Container.tsx
 +-- components/sections/MarketplaceDemo.tsx
 |    +-- components/layout/SectionWrapper.tsx
 |    +-- components/layout/Container.tsx
 +-- components/sections/AboutUs.tsx
 |    +-- components/layout/SectionWrapper.tsx
 |    +-- components/layout/Container.tsx
 +-- components/sections/Roadmap.tsx
 |    +-- components/layout/SectionWrapper.tsx
 |    +-- components/layout/Container.tsx
 +-- components/layout/Footer.tsx
      +-- components/layout/Container.tsx

ORPHANED (imported by nothing):
 +-- components/motion/StaggerContainer.tsx  [UNUSED]
```

---

## 6. Gaps & Risks

### High Priority

| # | Issue | Location | Detail |
|---|---|---|---|
| 1 | **Duplicated OOD threshold constant** | `main.py:217` and `AIClassifierDemo.tsx:53` | Both define `NON_DATE_CONFIDENCE_THRESHOLD = 45.0` independently. If the backend value is tuned, the frontend check can fall out of sync, causing inconsistent rejection behavior. The single source of truth should be the backend; the frontend should rely solely on the `is_date` field returned by the API. |
| 2 | **No authentication or rate limiting** | `main.py` CORS + all endpoints | The `/classify` endpoint accepts any request from `*.vercel.app` with no API key, rate limiting, or quota. Free-tier abuse (flooding the Render endpoint) could exhaust compute. |
| 3 | **Newsletter form submits nothing** | `Footer.tsx:11-17` | `handleSubscribe` sets `subscribed = true` and clears the field, but sends no data to any backend. Users believe they subscribed without it having any effect. |

### Medium Priority

| # | Issue | Location | Detail |
|---|---|---|---|
| 4 | **Orphaned `StaggerContainer` / `StaggerItem`** | `components/motion/StaggerContainer.tsx` | Fully implemented but imported nowhere. Adds bundle weight without benefit. |
| 5 | **Dead `delay` prop on `SectionWrapper`** | `SectionWrapper.tsx:7` | `delay?: number` declared in the props interface but never read or applied in the render output. Callers passing a `delay` prop get no effect. |
| 6 | **Two model checkpoints locally, one undocumented** | `ResNet50/Fold_2/` | Both `resnet50_fold2_finetuned_best.pth` and `resnet50_fold2_head_best.pth` (~90 MB each) exist. `main.py` always loads the `finetuned_best` variant. The `head_best` file is never referenced in any code and its purpose is undocumented. |
| 7 | **Python version not pinned** | `requirements.txt` | No `python-requires`, `.python-version`, or `runtime.txt` file. Render will use its default Python runtime, which may drift between deploys. Recommend adding `runtime.txt` with e.g. `python-3.11.9`. |
| 8 | **CORS allows all Vercel deployments** | `main.py:194` | `allow_origin_regex=r"https://.*\.vercel\.app"` allows **any** Vercel project to call the classify API. Should be locked to the specific production domain after deployment. |
| 9 | **`maxDuration = 60` requires Vercel Pro** | `app/api/classify/route.ts:16` | On Vercel free plans the maximum serverless function duration is 10 seconds. Cold-start classification requests that take longer will time out silently for free-tier users. |

### Low Priority / Notes

| # | Note | Location |
|---|---|---|
| 10 | **GitHub link is a placeholder** | `Footer.tsx:128` | `href="https://github.com"` points to the GitHub homepage, not the actual project repository. |
| 11 | **Privacy Policy and Terms links are dead** | `Footer.tsx:125-126` | Both link to `#`. Acceptable for an FYP demo, but should be noted. |
| 12 | **`next.config.ts` is empty** | `next.config.ts` | No custom configuration. If images from external domains are ever needed, `images.remotePatterns` will need to be added. |
| 13 | **`weights_only=False` in `torch.load`** | `main.py:135` | Disables PyTorch safe deserialization. Since the `.pth` is a team-controlled artifact this is acceptable, but it should be documented as a deliberate decision in a code comment. |
| 14 | **Developer scratch files committed** | Root | `changestomake.txt` and `todays_work_summary.txt` are developer notes committed to the repo. These should be added to `.gitignore` or removed before any public release. |
