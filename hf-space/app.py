import base64, io, os
import numpy as np
import onnxruntime as ort
from fastapi import FastAPI, File, Form, UploadFile
from fastapi.responses import JSONResponse
from PIL import Image, ImageOps

TILE, OVERLAP, MAX_SIDE = 512, 64, 2048
STRIDE = TILE - OVERLAP
MAX_BYTES = 25 * 1024 * 1024
COLORS = {"buildings": (255, 77, 94), "roads": (255, 205, 60), "water": (56, 140, 255)}
MODEL_DIR = os.path.join(os.path.dirname(__file__), "models")

Image.MAX_IMAGE_PIXELS = 100_000_000
app = FastAPI()
sessions = {}
for name in COLORS:
    path = os.path.join(MODEL_DIR, f"{name}.onnx")
    if os.path.exists(path):
        sessions[name] = ort.InferenceSession(path, providers=["CPUExecutionProvider"])

_w = np.minimum(np.arange(1, TILE + 1), TILE - np.arange(TILE)) / (TILE / 2)
WINDOW = np.outer(_w, _w).astype(np.float32)


def starts(n):
    out, s = [], 0
    while True:
        st = max(0, min(s, n - TILE))
        if st not in out:
            out.append(st)
        if s + TILE >= n:
            return out
        s += STRIDE


def probabilities(session, rgb):
    h, w, _ = rgb.shape
    acc = np.zeros((h, w), np.float32)
    wsum = np.zeros((h, w), np.float32)
    for y0 in starts(h):
        for x0 in starts(w):
            ys = np.minimum(h - 1, np.arange(y0, y0 + TILE))
            xs = np.minimum(w - 1, np.arange(x0, x0 + TILE))
            tile = rgb[ys][:, xs].astype(np.float32) / 255.0
            inp = tile.transpose(2, 0, 1)[None]
            p = session.run(None, {"input": inp})[0][0, 0]
            hh, ww = min(TILE, h - y0), min(TILE, w - x0)
            acc[y0:y0 + hh, x0:x0 + ww] += p[:hh, :ww] * WINDOW[:hh, :ww]
            wsum[y0:y0 + hh, x0:x0 + ww] += WINDOW[:hh, :ww]
    return acc / wsum


@app.get("/health")
def health():
    return {"models": {n: n in sessions for n in COLORS}, "provider": "cpu"}


@app.post("/predict")
async def predict(image: UploadFile = File(...), classes: list[str] = Form(default=[]),
                  threshold: float = Form(0.5)):
    data = await image.read()
    if len(data) > MAX_BYTES:
        return JSONResponse({"error": "That image is larger than 25 MB."}, status_code=413)
    try:
        img = ImageOps.exif_transpose(Image.open(io.BytesIO(data))).convert("RGB")
    except Exception:
        return JSONResponse({"error": "That file is not a readable image."}, status_code=415)
    img.thumbnail((MAX_SIDE, MAX_SIDE), Image.LANCZOS)
    rgb = np.asarray(img)
    h, w, _ = rgb.shape
    classes = [c for c in classes if c in COLORS] or list(COLORS)
    threshold = min(0.95, max(0.05, threshold))

    out = np.zeros((h, w, 4), np.uint8)
    coverage, engines = {}, {}
    for name in classes:
        if name not in sessions:
            return JSONResponse({"error": f"model {name} missing"}, status_code=500)
        mask = probabilities(sessions[name], rgb) > threshold
        out[mask] = (*COLORS[name], 255)
        coverage[name] = round(float(mask.mean()) * 100, 2)
        engines[name] = "UNet++ ResNet34"
    buf = io.BytesIO()
    Image.fromarray(out, "RGBA").save(buf, "PNG", optimize=True)
    return {"mask": "data:image/png;base64," + base64.b64encode(buf.getvalue()).decode(),
            "coverage": coverage, "engines": engines, "provider": "cpu", "width": w, "height": h}
