"""Run one local image through the trained YOLOv5 date detector."""

from __future__ import annotations

import argparse
from pathlib import Path

import torch

REPO_ROOT = Path(__file__).resolve().parents[1]
YOLOV5_REPO = REPO_ROOT / "training" / "yolov5"
DEFAULT_WEIGHTS = (
    REPO_ROOT
    / "training"
    / "runs"
    / "detect"
    / "date-gate-yolov5n-grouped"
    / "weights"
    / "best.pt"
)
DEFAULT_TEST_IMAGES = REPO_ROOT / "Dates Detection.date-gate.dataset" / "images" / "test"
DEFAULT_OUTPUT = REPO_ROOT / "training" / "outputs" / "date-detector"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--weights", type=Path, default=DEFAULT_WEIGHTS, help="Path to best.pt")
    parser.add_argument(
        "--image",
        type=Path,
        help="Image to test; defaults to the first image in the prepared held-out test split",
    )
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT, help="Annotated image output directory")
    parser.add_argument("--confidence", type=float, default=0.25, help="Smoke-test confidence threshold")
    parser.add_argument("--iou", type=float, default=0.45, help="NMS IoU threshold")
    parser.add_argument("--image-size", type=int, default=640, help="Inference image size")
    args = parser.parse_args()
    if not 0 <= args.confidence <= 1:
        parser.error("--confidence must be in [0, 1]")
    if not 0 <= args.iou <= 1:
        parser.error("--iou must be in [0, 1]")
    if args.image_size <= 0:
        parser.error("--image-size must be positive")
    return args


def main() -> None:
    args = parse_args()
    weights = args.weights.resolve()
    image_path = args.image.resolve() if args.image else None

    if image_path is None:
        candidates = sorted(
            path for path in DEFAULT_TEST_IMAGES.iterdir()
            if path.is_file() and path.suffix.lower() in {".jpg", ".jpeg", ".png"}
        )
        if not candidates:
            raise FileNotFoundError(f"No test images found in {DEFAULT_TEST_IMAGES}")
        image_path = candidates[0]

    if not weights.is_file():
        raise FileNotFoundError(f"Model checkpoint not found: {weights}")
    if not image_path.is_file():
        raise FileNotFoundError(f"Input image not found: {image_path}")
    if not (YOLOV5_REPO / "hubconf.py").is_file():
        raise FileNotFoundError(f"YOLOv5 source is missing: {YOLOV5_REPO}")

    device = "cuda:0" if torch.cuda.is_available() else "cpu"
    print(f"Device: {device}")
    print(f"Checkpoint: {weights}")
    print(f"Image: {image_path}")

    model = torch.hub.load(
        str(YOLOV5_REPO),
        "custom",
        path=str(weights),
        source="local",
        device=device,
    )
    model.conf = args.confidence
    model.iou = args.iou

    results = model(str(image_path), size=args.image_size)
    boxes = results.xyxy[0].detach().cpu().tolist()
    names = model.names

    if not boxes:
        print("No dates detected.")
    for index, (x1, y1, x2, y2, confidence, class_id_value) in enumerate(boxes, 1):
        class_id = int(class_id_value)
        class_name = names[class_id] if isinstance(names, list) else names[class_id]
        print(
            f"Detection {index}: class={class_name} (id={class_id}), "
            f"confidence={confidence:.4f}, "
            f"bbox_xyxy=[{x1:.1f}, {y1:.1f}, {x2:.1f}, {y2:.1f}] px"
        )

    output_dir = args.output.resolve()
    results.ims = [image.copy() for image in results.ims]
    results.save(save_dir=str(output_dir), exist_ok=True)
    print(f"Annotated image saved under: {output_dir}")


if __name__ == "__main__":
    main()
