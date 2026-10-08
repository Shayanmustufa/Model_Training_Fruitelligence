import io
import unittest

import numpy as np
import torch
from fastapi import UploadFile
from PIL import Image

import main


def make_upload(filename: str, color: tuple[int, int, int]) -> UploadFile:
    image = Image.new("RGB", (32, 24), color)
    content = io.BytesIO()
    image.save(content, format="PNG")
    image.close()
    content.seek(0)
    return UploadFile(filename=filename, file=content)


def expected_tensor(color: tuple[int, int, int]) -> torch.Tensor:
    with Image.new("RGB", (32, 24), color) as image:
        return main.INFERENCE_TRANSFORM(image).unsqueeze(0)


class RecordingGate:
    def __init__(self, logits: tuple[float, float]):
        self.logits = logits
        self.inputs: list[np.ndarray] = []

    def run(self, _outputs, inputs):
        self.inputs.append(inputs["input"].copy())
        return [np.asarray([self.logits], dtype=np.float32)]


class RecordingClassifier(torch.nn.Module):
    def __init__(self):
        super().__init__()
        self.inputs: list[torch.Tensor] = []

    def forward(self, tensor: torch.Tensor) -> torch.Tensor:
        self.inputs.append(tensor.detach().clone())
        logits = torch.zeros((tensor.shape[0], main.NUM_CLASSES), device=tensor.device)
        logits[:, 0] = 1
        return logits


class LiveContextTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.original_state = main.app_state.copy()
        self.classifier = RecordingClassifier()
        self.gate = RecordingGate((0.0, 4.0))
        main.app_state.update({
            "model": self.classifier,
            "device": torch.device("cpu"),
            "gate": {"type": "onnx", "model": self.gate, "input_name": "input"},
            "t_gate": 0.01,
        })

    async def asyncTearDown(self):
        main.app_state.clear()
        main.app_state.update(self.original_state)

    async def test_context_image_gates_while_crop_is_classified(self):
        crop_color = (240, 20, 20)
        context_color = (20, 220, 20)
        result = await main.classify(
            image=make_upload("crop.png", crop_color),
            context_image=make_upload("context.png", context_color),
        )

        expected_context = expected_tensor(context_color).numpy()
        expected_crop = expected_tensor(crop_color)

        self.assertTrue(result["is_date"])
        np.testing.assert_allclose(self.gate.inputs[0], expected_context, atol=1e-6)
        torch.testing.assert_close(self.classifier.inputs[0], expected_crop)

    async def test_context_gate_rejection_still_blocks_classifier(self):
        self.gate.logits = (10.0, -10.0)
        result = await main.classify(
            image=make_upload("crop.png", (240, 20, 20)),
            context_image=make_upload("context.png", (20, 20, 20)),
        )

        self.assertFalse(result["is_date"])
        self.assertEqual(self.classifier.inputs, [])

    async def test_legacy_request_uses_classification_image_for_gate(self):
        crop_color = (240, 20, 20)
        result = await main.classify(
            image=make_upload("crop.png", crop_color),
            context_image=None,
        )

        expected_crop = expected_tensor(crop_color).numpy()

        self.assertTrue(result["is_date"])
        np.testing.assert_allclose(self.gate.inputs[0], expected_crop, atol=1e-6)


if __name__ == "__main__":
    unittest.main()
