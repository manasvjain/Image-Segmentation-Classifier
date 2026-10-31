"use client";
import { useEffect, useState } from "react";
import CompareSlider from "./CompareSlider";
import CoverageBars from "./CoverageBars";
import Brackets from "./Brackets";
import { CLASS_LIST } from "@/lib/classes";

const VIEWS = [
  ["overlay", "Overlay"],
  ["compare", "Compare"],
  ["mask", "Mask"],
];

function Legend({ items }) {
  return (
    <div className="legend" aria-hidden="true">
      {items.map((c) => (
        <span key={c.id} style={{ "--c": c.css }}><i />{c.label}</span>
      ))}
    </div>
  );
}

function save(href, name) {
  const a = document.createElement("a");
  a.href = href;
  a.download = name;
  a.click();
}

const load = (src) =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });

// The server sends only the mask, so the overlay file is composed here: mask at 60% over the photo.
async function saveOverlay(preview, mask) {
  const [photo, tint] = await Promise.all([load(preview), load(mask)]);
  const canvas = document.createElement("canvas");
  canvas.width = photo.naturalWidth;
  canvas.height = photo.naturalHeight;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(photo, 0, 0);
  ctx.globalAlpha = 0.6;
  ctx.drawImage(tint, 0, 0, canvas.width, canvas.height);
  save(canvas.toDataURL("image/jpeg", 0.92), "segmentation-overlay.jpg");
}

// A scanning pass over the image while the model runs. The timer is real; progress itself is not streamed.
function Scan() {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    const t0 = Date.now();
    const id = setInterval(() => setSeconds(Math.floor((Date.now() - t0) / 1000)), 250);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="scan">
      <span className="scan-grid" />
      <span className="scan-line" />
      <Brackets />
      <div className="scan-label" role="status">
        <span className="spinner" aria-hidden="true" />
        Reading the scene
        <span className="scan-time" aria-hidden="true">{seconds}s</span>
      </div>
    </div>
  );
}

export default function ResultViewer({ preview, result, busy }) {
  const [view, setView] = useState("overlay");

  if (!result) {
    return (
      <div className={"stage" + (busy ? " scanning" : "")}>
        <div className="frame">
          <img src={preview} alt="Uploaded image" />
          {busy && <Scan />}
        </div>
      </div>
    );
  }

  const fellBack = Object.values(result.engines).some((e) => /fallback/i.test(e));
  const detected = CLASS_LIST.filter((c) => c.id in result.coverage);
  const index = VIEWS.findIndex(([id]) => id === view);

  return (
    <div className="results">
      <div className="toolbar">
        <div className="tabs" role="tablist" aria-label="Result view" style={{ "--i": index }}>
          <span className="tab-pill" aria-hidden="true" />
          {VIEWS.map(([id, label]) => (
            <button key={id} role="tab" type="button" aria-selected={view === id} onClick={() => setView(id)}>{label}</button>
          ))}
        </div>
        <div className="downloads">
          <button type="button" className="btn small" onClick={() => saveOverlay(preview, result.mask)}>
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 4v11m0 0 4-4m-4 4-4-4M5 20h14" /></svg>
            Overlay
          </button>
          <button type="button" className="btn small" onClick={() => save(result.mask, "segmentation-mask.png")}>
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 4v11m0 0 4-4m-4 4-4-4M5 20h14" /></svg>
            Mask
          </button>
        </div>
      </div>

      <div className="stage done">
        {view === "compare" && <CompareSlider before={preview} mask={result.mask} />}
        {view === "overlay" && (
          <div className="frame layers">
            <img src={preview} alt="" />
            <img className="top tint wipe" src={result.mask} alt="Segmentation overlay" />
            <Legend items={detected} />
          </div>
        )}
        {view === "mask" && (
          <div className="frame dark">
            <img className="fade" src={result.mask} alt="Segmentation mask" />
            <Legend items={detected} />
          </div>
        )}
      </div>

      <p className="meta">
        <span>{result.width} × {result.height} px</span>
        <span>{result.seconds ? `${result.seconds.toFixed(1)} s` : "done"}</span>
        <span>{result.provider ? result.provider.toUpperCase() : "CPU"}</span>
      </p>

      {fellBack && (
        <p className="notice" role="status">
          The neural model was unavailable for some classes, so a simple colour-based fallback was used. Results will be less accurate.
        </p>
      )}

      <CoverageBars coverage={result.coverage} engines={result.engines} />
    </div>
  );
}
