# Aerial image segmentation

Upload a drone, aerial or satellite image and get building, road and water masks back, with an overlay, a before/after slider and per-class coverage.

- **Website:** Next.js (this folder)
- **Model API:** FastAPI + ONNX on a Hugging Face Space (`hf-space/`)

## Run it

```bash
npm install
cp .env.example .env.local   # points the app at the model API
npm run dev                  # http://localhost:3000
```

Production: `npm run build && npm start`.

`.env.local` needs one line, `HF_API_URL=https://<user>-<space>.hf.space`. Add `HF_TOKEN=...` only if the Space is private.

## Deploy

**Model API (Hugging Face Space)**: upload the contents of `hf-space/` plus the three `.onnx` models in `hf-space/models/` (`buildings`, `roads`, `water`):

```bash
hf upload <user>/<space> hf-space . --repo-type=space
```

**Website (Render)**: create a Web Service from this repo (it reads `render.yaml`) and set `HF_API_URL`.

## API

- `POST /api/predict`: multipart form with `image`, repeated `classes` (`buildings`, `roads`, `water`) and `threshold` (0.05 to 0.95). Returns `mask` (PNG data URL), `coverage` (%), `engines`, `width`, `height`. Max 25 MB; PNG, JPG, WebP or TIFF.
- `GET /api/health`: model status.

The first request after the Space has been idle is slow while it wakes up.

## Run without the Space (optional)

Leave `HF_API_URL` unset and put the models in `models/` (`npm run export-models` converts PyTorch weights; see `scripts/export_onnx.py`). The app then runs ONNX locally, and falls back to a rough colour heuristic for any missing model.

## Layout

```
app/          pages and API routes
components/   UI components
lib/          segment.js (dispatch + local inference), remote.js (Space client), classes.js
hf-space/     the model API deployed to Hugging Face
scripts/      export_onnx.py
```
