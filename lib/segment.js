import path from "path";
import fs from "fs";
import sharp from "sharp";
import { CLASSES } from "./classes";
import { REMOTE, remoteSegment, remoteStatus } from "./remote";

const TILE = 512;
const OVERLAP = 64;
const STRIDE = TILE - OVERLAP;
const MAX_SIDE = 2048;

export { CLASSES };

const NEURAL = "UNet++ ResNet34";
const FALLBACK = "Colour heuristic (fallback)";

const sessions = {};
const state = { provider: null };
let ortPromise;

const loadOrt = () => (ortPromise ??= import("onnxruntime-node"));

// Try the GPU first; onnxruntime-node throws when CUDA is not installed, so retry on CPU.
async function createSession(file) {
  const ort = await loadOrt();
  for (const provider of ["cuda", "cpu"]) {
    try {
      const session = await ort.InferenceSession.create(file, { executionProviders: [provider] });
      state.provider ??= provider;
      return session;
    } catch (e) {
      if (provider === "cpu") throw e;
    }
  }
}

function getSession(name) {
  if (!sessions[name]) {
    const file = path.join(process.cwd(), "models", `${name}.onnx`);
    if (!fs.existsSync(file)) return Promise.reject(new Error(`missing model ${name}.onnx`));
    sessions[name] = createSession(file).catch((e) => {
      delete sessions[name]; // allow a retry on the next request
      throw e;
    });
  }
  return sessions[name];
}

// Load every model once, so the first request is not slow.
export function preloadModels() {
  if (REMOTE) return Promise.resolve([]);
  return Promise.allSettled(Object.keys(CLASSES).map(getSession));
}

export async function modelStatus() {
  if (REMOTE) return remoteStatus();
  const results = await preloadModels();
  const models = {};
  Object.keys(CLASSES).forEach((name, i) => {
    const present = fs.existsSync(path.join(process.cwd(), "models", `${name}.onnx`));
    models[name] = { file: present, loaded: results[i].status === "fulfilled" };
  });
  return { provider: state.provider, models };
}

// Weight window: tiles contribute less near their borders, so seams blend away.
const WINDOW = new Float32Array(TILE).map((_, i) => Math.min(i + 1, TILE - i) / (TILE / 2));

// Primary: UNet++ (ResNet34) ONNX on overlapping 512x512 tiles, 0-1 RGB like training.
async function neuralProbabilities(name, rgb, w, h) {
  const session = await getSession(name);
  const ort = await loadOrt();
  const acc = new Float32Array(w * h);
  const wsum = new Float32Array(w * h);

  const starts = (len) => {
    const out = [];
    for (let s = 0; ; s += STRIDE) {
      const start = Math.max(0, Math.min(s, len - TILE));
      if (!out.includes(start)) out.push(start);
      if (s + TILE >= len) break;
    }
    return out;
  };

  for (const y0 of starts(h)) {
    for (const x0 of starts(w)) {
      const input = new Float32Array(3 * TILE * TILE);
      for (let y = 0; y < TILE; y++) {
        const sy = Math.min(h - 1, y0 + y); // images smaller than a tile repeat their last row/column
        for (let x = 0; x < TILE; x++) {
          const sx = Math.min(w - 1, x0 + x);
          const si = (sy * w + sx) * 3, di = y * TILE + x;
          input[di] = rgb[si] / 255;
          input[TILE * TILE + di] = rgb[si + 1] / 255;
          input[2 * TILE * TILE + di] = rgb[si + 2] / 255;
        }
      }
      const out = await session.run({ input: new ort.Tensor("float32", input, [1, 3, TILE, TILE]) });
      const p = out.output.data;
      for (let y = 0; y < TILE && y0 + y < h; y++) {
        for (let x = 0; x < TILE && x0 + x < w; x++) {
          const weight = WINDOW[y] * WINDOW[x];
          const di = (y0 + y) * w + x0 + x;
          acc[di] += p[y * TILE + x] * weight;
          wsum[di] += weight;
        }
      }
    }
  }
  for (let i = 0; i < acc.length; i++) acc[i] /= wsum[i];
  return acc;
}

// Fallback: colour heuristics adapted from geospatial-deep-learning-segmentation (Ocean.py / Soil.py).
function heuristicMask(name, rgb, w, h) {
  const mask = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) {
    const r = rgb[i * 3], g = rgb[i * 3 + 1], b = rgb[i * 3 + 2];
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    const sat = max ? (max - min) / max : 0;
    if (name === "water") mask[i] = b > r + 15 && b >= g && max < 200 ? 1 : 0;
    else if (name === "roads") mask[i] = sat < 0.12 && max > 70 && max < 170 ? 1 : 0;
    else mask[i] = sat < 0.25 && r > 150 && g > 130 && b > 110 ? 1 : 0; // bright rooftops
  }
  return mask;
}

export async function segment(buffer, classes, threshold) {
  if (REMOTE) return remoteSegment(buffer, classes, threshold);
  const { data: rgb, info } = await sharp(buffer)
    .rotate()
    .resize(MAX_SIDE, MAX_SIDE, { fit: "inside", withoutEnlargement: true })
    .removeAlpha()
    .toColourspace("srgb")
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width: w, height: h } = info;

  // RGBA: class colour where detected, fully transparent elsewhere.
  const maskImg = Buffer.alloc(w * h * 4);
  const coverage = {};
  const engines = {};

  for (const name of classes) {
    let mask;
    try {
      const prob = await neuralProbabilities(name, rgb, w, h);
      mask = prob.map((p) => (p > threshold ? 1 : 0));
      engines[name] = NEURAL;
    } catch (e) {
      console.error(`[segment] ${name} neural model failed, using fallback:`, e.message);
      mask = heuristicMask(name, rgb, w, h);
      engines[name] = FALLBACK;
    }
    const c = CLASSES[name].color;
    let on = 0;
    for (let i = 0; i < w * h; i++) {
      if (!mask[i]) continue;
      on++;
      maskImg[i * 4] = c[0];
      maskImg[i * 4 + 1] = c[1];
      maskImg[i * 4 + 2] = c[2];
      maskImg[i * 4 + 3] = 255;
    }
    coverage[name] = +((on / (w * h)) * 100).toFixed(2);
  }

  // The response may travel through a slow tunnel, so send only a small palette PNG. The browser
  // already has the photo and draws the overlay itself (mask at 60% opacity over the original).
  const maskPng = await sharp(maskImg, { raw: { width: w, height: h, channels: 4 } })
    .png({ palette: true, colours: 8, compressionLevel: 9 })
    .toBuffer();
  return {
    mask: `data:image/png;base64,${maskPng.toString("base64")}`,
    coverage,
    engines,
    provider: state.provider,
    width: w,
    height: h,
  };
}
