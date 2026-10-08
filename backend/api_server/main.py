"""
Agrovisoon — Multi-Classifier API
FastAPI inference server supporting:
  • Date Variety Classifier  — checkpoint-defined architecture (POST /classify)
  • Fruit Classifier         — EfficientNet-B0     (POST /classify/fruits)

Local:  uvicorn main:app --reload --port 8000
Render: auto-started via Procfile
"""

from __future__ import annotations

import gc
import io
import os
import json
import datetime
import logging
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Dict, Any

import torch
import torch.nn as nn
from torchvision import models, transforms
from PIL import Image, ImageOps, UnidentifiedImageError
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from profile_store import save_profile, load_profile
from fastapi.middleware.cors import CORSMiddleware

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
logging.basicConfig(level=logging.INFO)
log = logging.getLogger("classifier")

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------
CLASS_NAMES = ["Ajwa", "Amber", "Kalmi", "Mabroom", "Mazafati", "Rabbi", "Sagai", "Zahedi"]
NUM_CLASSES = len(CLASS_NAMES)

# Fruit classifier classes (EfficientNet-B0, 3-class)
FRUIT_CLASS_NAMES = ["Apple", "Banana", "Guava"]
FRUIT_NUM_CLASSES = len(FRUIT_CLASS_NAMES)

# Gate thresholds
DATE_GATE_THRESHOLD  = 0.40   # P(date)  must exceed this to proceed to date classifier
FRUIT_GATE_THRESHOLD = 0.50   # P(fruit) must exceed this to proceed to fruit classifier
MAX_UPLOAD_BYTES = 2 * 1024 * 1024  # 2 MB — client sends 224×224 JPEG; this caps fallbacks

# Inference transform — must match training preprocessing exactly
INFERENCE_TRANSFORM = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
])

# ---------------------------------------------------------------------------
# Model resolution helpers
# ---------------------------------------------------------------------------

def _local_checkpoint_path() -> Path | None:
    """
    Returns the local .pth path relative to this file's location
    (works when running locally from the api_server/ directory).
    """
    here = Path(__file__).parent
    candidate = here.parent / "ResNet50" / "Fold_2" / "resnet50_fold2_finetuned_best.pth"
    if candidate.exists():
        log.info("Local checkpoint found: %s", candidate)
        return candidate
    return None


def _download_from_gdrive(gdrive_id: str, dest: Path) -> Path:
    """
    Downloads the checkpoint from Google Drive using gdown.
    Requires GDRIVE_MODEL_ID env var to be set.
    """
    try:
        import gdown  # type: ignore
    except ImportError as exc:
        raise RuntimeError(
            "gdown is not installed. Add 'gdown' to requirements.txt."
        ) from exc

    dest.parent.mkdir(parents=True, exist_ok=True)
    url = f"https://drive.google.com/uc?id={gdrive_id}"
    log.info("Downloading checkpoint from Google Drive (this may take ~30s) → %s", dest)
    gdown.download(url, str(dest), quiet=True)
    if not dest.exists():
        raise RuntimeError("Google Drive download failed — file not found after download.")
    log.info("Checkpoint download complete: %s (%.1f MB)", dest, dest.stat().st_size / 1_048_576)
    return dest


def resolve_checkpoint() -> Path:
    """
    Resolves the checkpoint path in priority order:
    1. MODEL_PATH env var — explicit override (highest priority)
    2. Local file (relative sibling directory) — used in local dev
    3. Download from Google Drive using GDRIVE_MODEL_ID env var — used on Render
    """
    # Env var override (highest priority)
    env_path = os.getenv("MODEL_PATH")
    if env_path:
        p = Path(env_path)
        if p.exists():
            log.info("Using MODEL_PATH env override: %s", p)
            return p
        raise FileNotFoundError(f"MODEL_PATH set to '{env_path}' but file not found.")

    # Local file next to this server
    local = _local_checkpoint_path()
    if local:
        return local

    # Google Drive download (Render / cloud)
    gdrive_id = os.getenv("GDRIVE_MODEL_ID")
    if gdrive_id:
        cache_dir = Path(os.getenv("MODEL_CACHE_DIR", "/tmp/agrovisoon_model"))
        dest = cache_dir / "resnet50_fold2_finetuned_best.pth"
        if dest.exists():
            log.info("Using cached download: %s", dest)
            return dest
        return _download_from_gdrive(gdrive_id, dest)

    raise FileNotFoundError(
        "Cannot locate model checkpoint. Set MODEL_PATH or GDRIVE_MODEL_ID env var."
    )

# ---------------------------------------------------------------------------
# MobileNetV4 Gate Resolution & Builder (ONNX-only — no timm / second PyTorch graph)
# ---------------------------------------------------------------------------

def _load_gate_threshold(gate_dir: Path) -> float:
    """Load calibrated date gate threshold from gate_config.json (falls back to DATE_GATE_THRESHOLD)."""
    t_gate = DATE_GATE_THRESHOLD
    config_path = Path(os.getenv("GATE_CONFIG_PATH", str(gate_dir / "gate_config.json")))
    if config_path.exists():
        try:
            with open(config_path, "r") as f:
                cfg = json.load(f)
            t_gate = float(cfg.get("calibrated_threshold", DATE_GATE_THRESHOLD))
            log.info("Loaded calibrated gate threshold: %.4f", t_gate)
        except Exception as e:
            log.warning("Could not read gate_config.json: %s", e)
    return t_gate


def resolve_gate_onnx() -> tuple[Path | None, float]:
    """
    Resolves the ONNX gate and calibrated threshold.
    Order: GATE_ONNX_PATH → local Gate/mobilenetv4_gate.onnx → GDRIVE_GATE_ONNX_ID cache.
    Missing ONNX is non-fatal (gate becomes a pass-through).
    """
    here = Path(__file__).parent
    gate_dir = here.parent / "Gate"
    t_gate = _load_gate_threshold(gate_dir)

    env_path = os.getenv("GATE_ONNX_PATH")
    if env_path:
        p = Path(env_path)
        if p.exists():
            log.info("Using GATE_ONNX_PATH: %s", p)
            return p, t_gate
        log.warning("GATE_ONNX_PATH set to '%s' but file not found.", env_path)

    local_onnx = gate_dir / "mobilenetv4_gate.onnx"
    if local_onnx.exists():
        log.info("Local ONNX gate found: %s", local_onnx)
        return local_onnx, t_gate

    gdrive_id = os.getenv("GDRIVE_GATE_ONNX_ID")
    if gdrive_id:
        cache_dir = Path(os.getenv("MODEL_CACHE_DIR", "/tmp/agrovisoon_model"))
        dest = cache_dir / "mobilenetv4_gate.onnx"
        if dest.exists():
            log.info("Using cached ONNX gate download: %s", dest)
            return dest, t_gate
        try:
            return _download_from_gdrive(gdrive_id, dest), t_gate
        except Exception as e:
            log.warning("Failed to download ONNX gate from Google Drive: %s", e)

    return None, t_gate


def build_gate_model(onnx_path: Path | None) -> dict | None:
    """Load the MobileNetV4 gate via ONNX Runtime (CPU only)."""
    if onnx_path is None:
        log.warning("No Gate ONNX available. Gate will pass all images through.")
        return None

    try:
        import onnxruntime as ort

        session = ort.InferenceSession(
            str(onnx_path),
            providers=["CPUExecutionProvider"],
        )
        input_name = session.get_inputs()[0].name
        log.info("MobileNetV4 Gate loaded via ONNX Runtime from %s (input=%s)", onnx_path, input_name)
        return {"type": "onnx", "model": session, "input_name": input_name}
    except Exception as e:
        log.error("Failed to load ONNX gate: %s", e)
        log.warning("Gate will pass all images through.")
        return None

# ---------------------------------------------------------------------------
# Date Model builder
# ---------------------------------------------------------------------------

def build_model(checkpoint_path: Path, device: torch.device) -> nn.Module:
    """
    Reconstruct the checkpoint's classifier architecture and load its weights.
    """
    checkpoint = torch.load(checkpoint_path, map_location="cpu", weights_only=False)
    state_dict = checkpoint["model_state_dict"]
    architecture = checkpoint.get("architecture") or "resnet50"
    val_acc = checkpoint.get("val_accuracy", "N/A")
    epoch = checkpoint.get("epoch", "N/A")
    fold = checkpoint.get("fold", "?")
    checkpoint_classes = checkpoint.get("class_names")
    if checkpoint_classes is not None and checkpoint_classes != CLASS_NAMES:
        raise ValueError(
            "Classifier checkpoint class order does not match the API classes: "
            f"{checkpoint_classes!r}"
        )

    if architecture == "mobilevit_s":
        try:
            import timm
        except ImportError as exc:
            raise RuntimeError(
                "The MobileViT classifier requires timm. Install backend/api_server/requirements.txt."
            ) from exc
        model = timm.create_model(
            checkpoint.get("timm_model_name", architecture),
            pretrained=False,
            num_classes=NUM_CLASSES,
        )
    elif architecture == "resnet50":
        model = models.resnet50(weights=None)
        in_features = model.fc.in_features
        model.fc = nn.Sequential(
            nn.Identity(),
            nn.Linear(in_features, NUM_CLASSES),
        )
    else:
        raise ValueError(f"Unsupported classifier checkpoint architecture: {architecture!r}")

    if isinstance(val_acc, (int, float)) and 0 <= val_acc <= 1:
        val_acc = float(val_acc) * 100

    del checkpoint
    gc.collect()

    model.load_state_dict(state_dict)
    del state_dict
    gc.collect()

    model.to(device)
    model.eval()

    log.info(
        "Date classifier loaded — architecture=%s fold=%s epoch=%s val_accuracy=%.2f%%",
        architecture,
        fold,
        epoch,
        val_acc if isinstance(val_acc, (int, float)) else 0.0,
    )
    return model


# ---------------------------------------------------------------------------
# Fruit Model resolvers
# ---------------------------------------------------------------------------

def resolve_fruit_gate_checkpoint() -> Path | None:
    """
    Resolves the fruit OOD gate checkpoint (ood_gate_best.pth).
    Priority: FRUIT_GATE_PATH env → backend/FruitModels/ood_gate_best.pth
    """
    env_path = os.getenv("FRUIT_GATE_PATH")
    if env_path:
        p = Path(env_path)
        if p.exists():
            log.info("Using FRUIT_GATE_PATH env override: %s", p)
            return p
        log.warning("FRUIT_GATE_PATH set to '%s' but file not found.", env_path)

    here = Path(__file__).parent
    local = here.parent / "FruitModels" / "ood_gate_best.pth"
    if local.exists():
        log.info("Local fruit gate found: %s", local)
        return local

    log.warning("Fruit gate checkpoint not found. Fruit gate will pass all images through.")
    return None


def resolve_fruit_classifier_checkpoint() -> Path | None:
    """
    Resolves the fruit classifier checkpoint (efficientnet_b0_finetuned_best.pth).
    Priority: FRUIT_CLASSIFIER_PATH env → backend/FruitModels/efficientnet_b0_finetuned_best.pth
    """
    env_path = os.getenv("FRUIT_CLASSIFIER_PATH")
    if env_path:
        p = Path(env_path)
        if p.exists():
            log.info("Using FRUIT_CLASSIFIER_PATH env override: %s", p)
            return p
        log.warning("FRUIT_CLASSIFIER_PATH set to '%s' but file not found.", env_path)

    here = Path(__file__).parent
    local = here.parent / "FruitModels" / "efficientnet_b0_finetuned_best.pth"
    if local.exists():
        log.info("Local fruit classifier found: %s", local)
        return local

    log.warning("Fruit classifier checkpoint not found. /classify/fruits endpoint will be unavailable.")
    return None


# ---------------------------------------------------------------------------
# Fruit Model builders (EfficientNet-B0)
# ---------------------------------------------------------------------------

def build_fruit_gate_model(checkpoint_path: Path | None, device: torch.device) -> nn.Module | None:
    """
    EfficientNet-B0 with a single sigmoid output (binary fruit/non-fruit gate).
    The final classifier head has shape [1, 1280] → raw logit; sigmoid gives P(fruit).
    """
    if checkpoint_path is None:
        log.warning("No fruit gate checkpoint available. Gate will pass all images through.")
        return None

    model = models.efficientnet_b0(weights=None)
    model.classifier[1] = nn.Linear(model.classifier[1].in_features, 1)

    checkpoint = torch.load(checkpoint_path, map_location="cpu", weights_only=False)
    state_dict = checkpoint.get("model_state_dict", checkpoint)
    epoch = checkpoint.get("epoch", "N/A") if isinstance(checkpoint, dict) else "N/A"
    val_f1 = checkpoint.get("best_val_f1", checkpoint.get("val_f1", "N/A")) if isinstance(checkpoint, dict) else "N/A"
    del checkpoint
    gc.collect()

    model.load_state_dict(state_dict)
    del state_dict
    gc.collect()

    model.to(device)
    model.eval()
    log.info("Fruit gate loaded — epoch=%s val_f1=%s", epoch, val_f1)
    return model


def build_fruit_classifier_model(checkpoint_path: Path | None, device: torch.device) -> nn.Module | None:
    """
    EfficientNet-B0 with a 3-class head (Apple / Banana / Guava).
    """
    if checkpoint_path is None:
        log.warning("No fruit classifier checkpoint available.")
        return None

    model = models.efficientnet_b0(weights=None)
    model.classifier[1] = nn.Linear(model.classifier[1].in_features, FRUIT_NUM_CLASSES)

    checkpoint = torch.load(checkpoint_path, map_location="cpu", weights_only=False)
    state_dict = checkpoint.get("model_state_dict", checkpoint)
    epoch = checkpoint.get("epoch", "N/A") if isinstance(checkpoint, dict) else "N/A"
    val_acc = checkpoint.get("best_val_accuracy", checkpoint.get("val_accuracy", "N/A")) if isinstance(checkpoint, dict) else "N/A"
    del checkpoint
    gc.collect()

    model.load_state_dict(state_dict)
    del state_dict
    gc.collect()

    model.to(device)
    model.eval()
    log.info(
        "Fruit classifier loaded — epoch=%s best_val_accuracy=%s classes=%s",
        epoch,
        val_acc,
        FRUIT_CLASS_NAMES,
    )
    return model

# ---------------------------------------------------------------------------
# App state
# ---------------------------------------------------------------------------

app_state: Dict = {}


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Load all models once at startup; release on shutdown."""
    torch.set_num_threads(1)
    device = torch.device("cpu")
    log.info("Device: %s (torch threads=1)", device)

    # ── 1. Date Variety Classifier ──────────────────────────────────────────
    checkpoint_path = resolve_checkpoint()
    variety_model = build_model(checkpoint_path, device)
    app_state["model"] = variety_model
    app_state["device"] = device

    # ── 2. MobileNetV4 Date Verification Gate (ONNX) ───────────────────────
    onnx_path, t_gate = resolve_gate_onnx()
    gate_data = build_gate_model(onnx_path)
    app_state["gate"] = gate_data
    app_state["t_gate"] = t_gate

    # ── 3. Fruit OOD Gate (EfficientNet-B0 sigmoid) ────────────────────────
    fruit_gate_path = resolve_fruit_gate_checkpoint()
    fruit_gate_model = build_fruit_gate_model(fruit_gate_path, device)
    app_state["fruit_gate"] = fruit_gate_model
    app_state["t_fruit_gate"] = FRUIT_GATE_THRESHOLD

    # ── 4. Fruit Variety Classifier (EfficientNet-B0, 3-class) ────────────
    fruit_clf_path = resolve_fruit_classifier_checkpoint()
    fruit_clf_model = build_fruit_classifier_model(fruit_clf_path, device)
    app_state["fruit_model"] = fruit_clf_model
    app_state["fruit_classes"] = FRUIT_CLASS_NAMES

    gate_status = "onnx" if gate_data is not None else "missing"
    fruit_gate_status = "pytorch" if fruit_gate_model is not None else "missing"
    fruit_clf_status = "pytorch" if fruit_clf_model is not None else "missing"
    log.info(
        "Date classifier ready — gate=%s threshold=%.4f, serving %d classes: %s",
        gate_status, t_gate, NUM_CLASSES, CLASS_NAMES,
    )
    log.info(
        "Fruit classifier ready — gate=%s threshold=%.4f, classifier=%s, serving %d classes: %s",
        fruit_gate_status, FRUIT_GATE_THRESHOLD, fruit_clf_status, FRUIT_NUM_CLASSES, FRUIT_CLASS_NAMES,
    )
    yield
    app_state.clear()
    gc.collect()
    log.info("All models unloaded.")

# ---------------------------------------------------------------------------
# FastAPI application
# ---------------------------------------------------------------------------

app = FastAPI(
    title="Agrovisoon Date Variety Classifier",
    description="Checkpoint-defined model — 8-class date variety classification",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS — allow Next.js dev server, Vite local ports, and Vercel deployments
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",   # Next.js default
        "http://localhost:5173",   # Vite default
        "http://localhost:5174",   # Vite alt port
        "http://localhost:8080",   # generic local fallback
        "https://*.vercel.app",
        # Add your specific Vercel domain below after deploying:
        # "https://agrovision-app.vercel.app",
    ],
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@app.get("/health")
async def health():
    """Health check — used by Render and proxy."""
    gate = app_state.get("gate")
    return {
        "status": "ok",
        # Date classifier
        "date_model_loaded": "model" in app_state,
        "date_gate": "onnx" if gate is not None and gate.get("type") == "onnx" else "missing",
        "date_classes": CLASS_NAMES,
        # Fruit classifier
        "fruit_model_loaded": app_state.get("fruit_model") is not None,
        "fruit_gate": "pytorch" if app_state.get("fruit_gate") is not None else "missing",
        "fruit_classes": app_state.get("fruit_classes", FRUIT_CLASS_NAMES),
    }


# ---------------------------------------------------------------------------
# Non-Date Detection & Out-of-Distribution (OOD) Filtering
# ---------------------------------------------------------------------------
NON_DATE_CONFIDENCE_THRESHOLD = 45.0  # Threshold in percentage (0 - 100)


def is_date_image(
    probabilities: torch.Tensor,
    confidence_pct: float,
    entropy_threshold: float = 2.0,
) -> tuple[bool, str | None]:
    """
    Determines whether the input image is a recognized date fruit.

    Logic:
    1. Confidence threshold: If top-1 confidence < 45%, the image is flagged as OOD / non-date.
    2. Shannon entropy: High entropy indicates uniform uncertainty across all classes (non-date).
    3. Extensibility: Replace or supplement with a dedicated binary classifier or CLIP zero-shot score.

    Returns:
        (is_date: bool, reason: str | None)
    """
    # Non-date checking logic commented out as requested
    """
    # 1. Top-1 Confidence Check
    if confidence_pct < NON_DATE_CONFIDENCE_THRESHOLD:
        return (
            False,
            f"Prediction confidence ({confidence_pct:.1f}%) is below the minimum date variety threshold ({NON_DATE_CONFIDENCE_THRESHOLD}%)."
        )

    # 2. Shannon Entropy Check (high entropy indicates uniform confusion / non-date)
    probs_clamped = torch.clamp(probabilities, min=1e-7)
    entropy = -torch.sum(probs_clamped * torch.log(probs_clamped)).item()

    if entropy > entropy_threshold:
        return (
            False,
            f"High prediction entropy detected ({entropy:.2f}). Features do not match date varieties."
        )
    """

    return (True, None)


async def _prepare_inference_tensor(
    upload: UploadFile,
    device: torch.device,
) -> torch.Tensor:
    content = await upload.read()
    if not content:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")
    if len(content) > MAX_UPLOAD_BYTES:
        raise HTTPException(
            status_code=413,
            detail=f"Image too large ({len(content)} bytes). Maximum is {MAX_UPLOAD_BYTES} bytes.",
        )

    try:
        with Image.open(io.BytesIO(content)) as opened:
            oriented = ImageOps.exif_transpose(opened)
            try:
                pil_image = oriented.convert("RGB")
            finally:
                if oriented is not opened:
                    oriented.close()
    except (UnidentifiedImageError, OSError) as exc:
        raise HTTPException(
            status_code=400,
            detail="Could not decode image. Upload a valid JPG/PNG/WebP.",
        ) from exc
    finally:
        del content

    try:
        return INFERENCE_TRANSFORM(pil_image).unsqueeze(0).to(device)
    finally:
        pil_image.close()


@app.post("/classify")
async def classify(
    image: UploadFile = File(...),
    context_image: UploadFile | None = File(None),
):
    """
    Classify a date crop, optionally checking its scene context with the date gate.

    When provided, context_image is used only by the gate; image remains the
    classifier input. Omitting context_image preserves the legacy same-image flow.

    Returns:
        {
            "variety": "Ajwa",
            "confidence": 97.57,
            "all_probabilities": { "Ajwa": 97.57, "Amber": 0.21, ... },
            "is_date": true,
            "non_date_reason": null
        }
    """
    model: nn.Module = app_state.get("model")
    device: torch.device = app_state.get("device")

    if model is None:
        raise HTTPException(status_code=503, detail="Model not loaded yet. Try again shortly.")

    tensor = await _prepare_inference_tensor(image, device)
    gate_tensor = (
        await _prepare_inference_tensor(context_image, device)
        if context_image is not None
        else tensor
    )

    # ── Stage 1: MobileNetV4 Date Verification Gate (ONNX) ──────────────────
    gate_data = app_state.get("gate")
    t_gate = app_state.get("t_gate", 0.0100)
    p_date = 1.0  # Default if gate is disabled

    if gate_data is not None and gate_data.get("type") == "onnx":
        gate_session = gate_data["model"]
        input_name = gate_data.get("input_name") or gate_session.get_inputs()[0].name
        tensor_np = gate_tensor.detach().cpu().numpy()
        gate_out = gate_session.run(None, {input_name: tensor_np})[0][0]
        gate_logits = torch.from_numpy(gate_out.copy())
        gate_probs = torch.softmax(gate_logits, dim=0)
        p_date = float(gate_probs[1].item())

        # Early rejection if image fails gate verification
        if p_date < t_gate:
            log.info("Image rejected by Gate: P(Date)=%.4f < T_gate=%.4f", p_date, t_gate)
            return {
                "variety": None,
                "confidence": 0.0,
                "all_probabilities": None,
                "is_date": False,
                "p_date": round(p_date * 100, 2),
                "t_gate": round(t_gate * 100, 2),
                "message": "Please Enter a Correct Date Image.",
                "non_date_reason": "The uploaded image does not appear to be a recognized date fruit (verified by MobileNetV4 gate).",
            }

    del gate_tensor

    # ── Stage 2: Date Variety Classification ────────────────────────────────
    with torch.no_grad():
        outputs = model(tensor)
        probabilities = torch.softmax(outputs, dim=1).squeeze(0)

    confidence_val, predicted_idx = probabilities.max(dim=0)
    predicted_class = CLASS_NAMES[predicted_idx.item()]
    confidence_pct = round(confidence_val.item() * 100, 2)

    all_probs = {
        name: round(prob.item() * 100, 2)
        for name, prob in zip(CLASS_NAMES, probabilities)
    }

    return {
        "variety": predicted_class,
        "confidence": confidence_pct,
        "all_probabilities": all_probs,
        "is_date": True,
        "p_date": round(p_date * 100, 2),
        "t_gate": round(t_gate * 100, 2),
        "message": f"Successfully identified {predicted_class} date.",
        "non_date_reason": None,
    }


# ---------------------------------------------------------------------------
# Fruit Classifier Endpoint
# ---------------------------------------------------------------------------

@app.post("/classify/fruits")
async def classify_fruits(image: UploadFile = File(...)):
    """
    Two-stage fruit image classification.

    Stage 1 — EfficientNet-B0 binary gate (sigmoid):
        Rejects images with P(fruit) < FRUIT_GATE_THRESHOLD (0.50).
    Stage 2 — EfficientNet-B0 3-class classifier:
        Identifies the fruit variety: Apple | Banana | Guava.

    Returns:
        {
            "variety": "Apple",
            "confidence": 94.3,
            "all_probabilities": {"Apple": 94.3, "Banana": 3.1, "Guava": 2.6},
            "is_fruit": true,
            "p_gate": 97.5,
            "t_gate": 50.0,
            "message": "Successfully identified Apple.",
            "non_fruit_reason": null
        }
    """
    fruit_model: nn.Module | None = app_state.get("fruit_model")
    device: torch.device = app_state.get("device")
    fruit_classes: list = app_state.get("fruit_classes", FRUIT_CLASS_NAMES)

    if fruit_model is None:
        raise HTTPException(
            status_code=503,
            detail="Fruit classifier model not loaded. Ensure FruitModels checkpoints are present.",
        )

    # ── Read and validate image ────────────────────────────────────────────
    content = await image.read()
    if not content:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")
    if len(content) > MAX_UPLOAD_BYTES:
        raise HTTPException(
            status_code=413,
            detail=f"Image too large ({len(content)} bytes). Maximum is {MAX_UPLOAD_BYTES} bytes.",
        )

    try:
        opened = Image.open(io.BytesIO(content))
        oriented = ImageOps.exif_transpose(opened)
        pil_image = (oriented if oriented is not None else opened).convert("RGB")
    except (UnidentifiedImageError, OSError) as exc:
        raise HTTPException(
            status_code=400,
            detail="Could not decode image. Upload a valid JPG/PNG/WebP.",
        ) from exc
    finally:
        del content

    # ── Preprocess ────────────────────────────────────────────────────────
    tensor = INFERENCE_TRANSFORM(pil_image).unsqueeze(0).to(device)
    pil_image.close()
    del pil_image

    # ── Stage 1: EfficientNet-B0 Fruit Verification Gate (sigmoid) ─────────
    fruit_gate: nn.Module | None = app_state.get("fruit_gate")
    t_fruit_gate: float = app_state.get("t_fruit_gate", FRUIT_GATE_THRESHOLD)
    p_fruit = 1.0  # Default if gate is disabled

    if fruit_gate is not None:
        with torch.no_grad():
            gate_logit = fruit_gate(tensor).squeeze()     # scalar logit
            p_fruit = float(torch.sigmoid(gate_logit).item())

        if p_fruit < t_fruit_gate:
            log.info(
                "Fruit gate rejected image: P(fruit)=%.4f < T_gate=%.4f",
                p_fruit, t_fruit_gate,
            )
            return {
                "variety": None,
                "confidence": 0.0,
                "all_probabilities": None,
                "is_fruit": False,
                "p_gate": round(p_fruit * 100, 2),
                "t_gate": round(t_fruit_gate * 100, 2),
                "message": "Please upload a valid fruit image (Apple, Banana, or Guava).",
                "non_fruit_reason": "The uploaded image does not appear to be a recognized fruit (verified by EfficientNet-B0 gate).",
            }

    # ── Stage 2: EfficientNet-B0 Fruit Variety Classification ──────────────
    with torch.no_grad():
        outputs = fruit_model(tensor)
        probabilities = torch.softmax(outputs, dim=1).squeeze(0)

    confidence_val, predicted_idx = probabilities.max(dim=0)
    predicted_class = fruit_classes[predicted_idx.item()]
    confidence_pct = round(confidence_val.item() * 100, 2)

    all_probs = {
        name: round(prob.item() * 100, 2)
        for name, prob in zip(fruit_classes, probabilities)
    }

    log.info(
        "Fruit classified: %s (%.2f%%) | P(fruit)=%.4f",
        predicted_class, confidence_pct, p_fruit,
    )

    return {
        "variety": predicted_class,
        "confidence": confidence_pct,
        "all_probabilities": all_probs,
        "is_fruit": True,
        "p_gate": round(p_fruit * 100, 2),
        "t_gate": round(t_fruit_gate * 100, 2),
        "message": f"Successfully identified {predicted_class}.",
        "non_fruit_reason": None,
    }


# ---------------------------------------------------------------------------
# Health Profile Endpoints
# ---------------------------------------------------------------------------

class UserProfile(BaseModel):
    """Schema for the user health questionnaire (FYP-Work.docx)."""
    country: str = ""
    diabetes: bool = False
    hypertension: bool = False
    anemia: bool = False
    constipation: bool = False
    weight_management: bool = False


@app.post("/profile", status_code=200)
async def post_profile(profile: UserProfile):
    """Save the user's health questionnaire answers to a local JSON file."""
    # Data persistence to JSON commented out as requested
    # save_profile(profile.model_dump())
    return {"status": "persistence_disabled"}


@app.get("/profile")
async def get_profile():
    """Return the saved health questionnaire answers, or an empty profile if none exist."""
    # Data loading from JSON commented out as requested
    # data = load_profile()
    # if data is None:
    #     return JSONResponse(content={"exists": False})
    # return JSONResponse(content={"exists": True, **data})
    return JSONResponse(content={"exists": False})


class SubscribeRequest(BaseModel):
    email: str


@app.post("/subscribe", status_code=200)
async def post_subscribe(req: SubscribeRequest):
    """Save newsletter subscriber email to local JSON and text files."""
    email = req.email.strip().lower()
    if not email or "@" not in email:
        raise HTTPException(status_code=400, detail="Please provide a valid email address.")

    here = Path(__file__).parent
    json_path = here / "subscribers.json"
    txt_path = here / "subscribers.txt"
    now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()

    subscribers = []
    if json_path.exists():
        try:
            subscribers = json.loads(json_path.read_text(encoding="utf-8"))
            if not isinstance(subscribers, list):
                subscribers = []
        except Exception:
            subscribers = []

    existing = any(
        isinstance(item, dict) and item.get("email") == email
        for item in subscribers
    )

    if not existing:
        subscribers.append({"email": email, "subscribedAt": now_iso})
        json_path.write_text(json.dumps(subscribers, indent=2, ensure_ascii=False), encoding="utf-8")
        with open(txt_path, "a", encoding="utf-8") as f:
            f.write(f"[{now_iso}] {email}\n")

    # Cloud Google Sheet Webhook Sync (optional fallback)
    webhook_url = os.environ.get("GOOGLE_SHEET_WEBHOOK_URL")
    if webhook_url:
        try:
            import urllib.request
            payload = json.dumps({
                "email": email,
                "timestamp": now_iso,
                "source": "FastAPI Backend Direct",
            }).encode("utf-8")
            h_req = urllib.request.Request(
                webhook_url,
                data=payload,
                headers={"Content-Type": "text/plain;charset=utf-8"},
            )
            urllib.request.urlopen(h_req, timeout=5)
        except Exception as exc:
            log.warning("Google Sheet webhook forward failed: %s", exc)

    return {
        "status": "ok",
        "message": "Thank you! You are subscribed.",
        "email": email,
    }
