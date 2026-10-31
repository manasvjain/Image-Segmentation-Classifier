"use client";
import { useState } from "react";

export default function CompareSlider({ before, mask }) {
  const [split, setSplit] = useState(50);

  return (
    <div className="compare">
      <img src={before} alt="Original image" />
      <div className="after" style={{ clipPath: `inset(0 ${100 - split}% 0 0)` }}>
        <img src={before} alt="" />
        <img className="tint" src={mask} alt="Segmentation overlay" />
      </div>
      <div className="handle" style={{ left: `${split}%` }} aria-hidden="true">
        <span>
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 7-5 5 5 5M15 7l5 5-5 5" /></svg>
        </span>
      </div>
      <span className="tag left">Prediction</span>
      <span className="tag right">Original</span>
      <input type="range" min="0" max="100" value={split} onChange={(e) => setSplit(+e.target.value)} aria-label="Compare prediction with original" />
    </div>
  );
}
