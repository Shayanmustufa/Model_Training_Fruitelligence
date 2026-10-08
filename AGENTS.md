# Agrovisoon – Repository Agent Guide

> Source of truth for all coding agents working in this repo.
> Keep this file up-to-date when ports, env vars, or start commands change.

---

## Project Layout

```
Agrovisoon/
├── backend/
│   └── api_server/          # FastAPI inference server (Python 3.13)
│       ├── main.py          # App entry-point; exposes /classify, /classify/fruits, /health
│       ├── requirements.txt # Python dependencies (PyTorch CPU, ONNX Runtime, FastAPI)
│       └── render.yaml      # Render.com deployment config
├── frontend/                # Next.js 16 + React 19 + Tailwind v4 web app
│   ├── src/app/             # App Router pages & API routes
│   ├── .env.local           # Local env (git-ignored) – copy from .env.local.example
│   └── .env.local.example   # Reference for required env vars
├── dev.ps1                  # Launch both servers (one window each)
├── stop-dev.ps1             # Kill both servers by port
└── docs/
    └── mom_1_1_frontend_plan.md  # Active implementation plan (phases 1-6)
```

---

## Agent Rules

- **Stack**: Next.js 16, React 19, Tailwind CSS v4, Framer Motion, Lucide. Frontend lives in `/frontend`.
- **Source of truth**: `docs/mom_1_1_frontend_plan.md`. Work **one phase at a time**, in order.
- After each phase: run `npm run build` inside `/frontend`, fix errors, then commit
  `feat(phase-N): ...` and stop for review.
- Do **not** edit the README. Do **not** touch backend code.
- Existing classifier flow must behave identically when Live Demo is off.
- No hardcoded user-facing strings after Phase 6 (use `next-intl` keys).

---

## Run Commands

### Quick start (recommended)

```powershell
# From repo root — opens two cmd windows, one per server
.\dev.ps1

# If PowerShell ExecutionPolicy blocks it:
powershell -ExecutionPolicy Bypass -File .\dev.ps1
```

### Stop both servers

```powershell
.\stop-dev.ps1
```

---

### Backend — FastAPI (Uvicorn)

| Item | Value |
|------|-------|
| Directory | `backend/api_server/` |
| Entry point | `main.py` (FastAPI `app` object) |
| Runtime | `training\.venv\Scripts\python.exe` for local development |
| Port | **8000** |
| Start command | `.\training\.venv\Scripts\python.exe -m uvicorn main:app --reload --port 8000` |
| Classifier checkpoint | `Desktop\model_classifier\mobilevit_fold4_stage2_best.pth` (the `dev.ps1` launcher sets `MODEL_PATH` when this file exists) |
| Env vars required | `MODEL_PATH` for the local classifier checkpoint, unless using the configured local/Google Drive fallback |
| Optional Render env vars | `GDRIVE_MODEL_ID`, `GDRIVE_GATE_ONNX_ID`, `MODEL_CACHE_DIR` |

**Manual start:**

```powershell
cd backend\api_server
$env:MODEL_PATH = "$env:USERPROFILE\Desktop\model_classifier\mobilevit_fold4_stage2_best.pth"
..\..\training\.venv\Scripts\python.exe -m uvicorn main:app --reload --port 8000
```

**Health-check URLs:**

| URL | Purpose |
|-----|---------|
| `http://localhost:8000/health` | Liveness check (returns `{"status":"ok"}`) |
| `http://localhost:8000/docs` | Interactive Swagger UI |
| `http://localhost:8000/redoc` | ReDoc API reference |
| `http://localhost:8000/classify` | POST — date variety classifier (checkpoint-selected architecture; MobileViT-S locally) |
| `http://localhost:8000/classify/fruits` | POST — fruit classifier (EfficientNet-B0) |

> Model files are loaded from local disk on first startup; expect ~5-10 s before
> the first request. The backend logs `Application startup complete.` when ready.

---

### Frontend — Next.js 16

| Item | Value |
|------|-------|
| Directory | `frontend/` |
| Port | **3000** |
| Start command | `npm run dev` (uses `--webpack` flag, see `package.json`) |
| Env file | `frontend/.env.local` (copy from `frontend/.env.local.example`) |

**Manual start:**

```powershell
cd frontend
npm run dev
```

**Required env file — `frontend/.env.local`:**

| Variable | Default / Example | Required? |
|----------|-------------------|-----------|
| `CLASSIFY_API_URL` | `http://localhost:8000` | **Yes** — points Next.js API routes to the FastAPI server |
| `GOOGLE_SHEET_WEBHOOK_URL` | `https://script.google.com/macros/s/.../exec` | Optional — logs subscriber emails to Google Sheets |
| `ROBOFLOW_API_KEY` | — | Optional — server-side key for the homepage's hosted Roboflow date-detection demo |

> `.env.local` is git-ignored. Copy `.env.local.example` and fill in values before starting.

**Health-check URLs:**

| URL | Purpose |
|-----|---------|
| `http://localhost:3000` | Main web app |
| `http://localhost:3000/api/classify` | Next.js proxy → FastAPI `/classify` |
| `http://localhost:3000/api/keepalive` | Render keep-alive ping endpoint |

---

## Port Summary

| Service | Port | Process |
|---------|------|---------|
| FastAPI backend | 8000 | `python` (uvicorn) |
| Next.js frontend | 3000 | `node` (Next.js dev server) |

---

## Adding a Python Virtual Environment (optional)

If you want to isolate backend dependencies:

```powershell
cd backend\api_server
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

Then update the `$backendCmd` line in `dev.ps1` to activate the venv first:

```powershell
# In dev.ps1, replace the $backendCmd assignment with:
$backendCmd = "cd /d `"$backendDir`" && call .venv\Scripts\activate.bat && python -m uvicorn main:app --reload --port 8000"
```
