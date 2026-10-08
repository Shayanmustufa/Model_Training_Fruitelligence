"""
One-time local export of MobileNetV4 gate weights to ONNX.

Run on a machine that has torch + timm and the .pth checkpoint.
Do NOT run this on Render.

  python export_gate_onnx.py

Output: mobilenetv4_gate.onnx next to this script, input name "input", shape [1,3,224,224].
"""

from __future__ import annotations

import os
from pathlib import Path

import torch
import timm


def main() -> None:
    here = Path(__file__).parent
    pth_path = Path(os.getenv("GATE_MODEL_PATH", str(here / "mobilenetv4_gate_best.pth")))
    out_path = here / "mobilenetv4_gate.onnx"

    if not pth_path.exists():
        raise FileNotFoundError(f"Gate checkpoint not found: {pth_path}")

    model = timm.create_model(
        "mobilenetv4_conv_small.e2400_r224_in1k",
        pretrained=False,
        num_classes=2,
    )
    ckpt = torch.load(pth_path, map_location="cpu", weights_only=False)
    model.load_state_dict(ckpt["model_state"] if "model_state" in ckpt else ckpt)
    model.eval()

    dummy = torch.randn(1, 3, 224, 224)
    torch.onnx.export(
        model,
        dummy,
        str(out_path),
        input_names=["input"],
        output_names=["logits"],
        opset_version=17,
        dynamic_axes=None,
    )
    print(f"Wrote {out_path} ({out_path.stat().st_size} bytes)")


if __name__ == "__main__":
    main()
