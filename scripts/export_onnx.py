"""One-time: convert the Project Vaayu UNet++ (ResNet34) weights to ONNX in web/models.

Usage (from anywhere):
    python web/scripts/export_onnx.py [path/to/folder/with/*_unetpp_model.pth]

Needs: torch, segmentation_models_pytorch, numpy. With onnxruntime installed, each export is also
checked against the PyTorch output.
After this runs, web/ no longer depends on the source repo.
"""
import sys
from pathlib import Path

import numpy as np
import segmentation_models_pytorch as smp
import torch

try:
    import onnxruntime as ort
except ImportError:  # the export itself only needs torch; onnxruntime enables the parity check
    ort = None

HERE = Path(__file__).resolve().parent
OUT = HERE.parent / "models"
SRC = Path(sys.argv[1]) if len(sys.argv) > 1 else HERE.parents[1] / "ProjectVaayu" / "models"
CLASSES = [("buildings", "buildings"), ("roads", "roads"), ("water", "water_bodies")]
TOL = 1e-3

OUT.mkdir(exist_ok=True)
torch.manual_seed(0)
sample = torch.rand(1, 3, 512, 512)

for name, stem in CLASSES:
    weights = SRC / f"{stem}_unetpp_model.pth"
    m = smp.UnetPlusPlus("resnet34", encoder_weights=None, in_channels=3, classes=1, activation="sigmoid")
    m.load_state_dict(torch.load(weights, map_location="cpu"))
    m.eval()

    target = OUT / f"{name}.onnx"
    torch.onnx.export(
        m, torch.zeros(1, 3, 512, 512), str(target),
        input_names=["input"], output_names=["output"],
        dynamic_axes={"input": {0: "batch"}, "output": {0: "batch"}},
        opset_version=17, dynamo=False,
    )

    size = f"{target.stat().st_size / 1e6:.0f} MB"
    if ort is None:
        print(f"exported {name}  ({size}, not verified: onnxruntime is not installed)")
        continue
    with torch.no_grad():
        expected = m(sample).numpy()
    got = ort.InferenceSession(str(target), providers=["CPUExecutionProvider"]).run(None, {"input": sample.numpy()})[0]
    diff = float(np.abs(expected - got).max())
    assert diff < TOL, f"{name}: ONNX output differs from torch by {diff}"
    print(f"exported {name}  ({size}, max diff {diff:.1e})")
