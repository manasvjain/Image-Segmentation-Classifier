"use client";
import { useRef, useState } from "react";
import Brackets from "./Brackets";

const SAMPLES = [
  { src: "/samples/vegas_aerial.png", label: "Suburban blocks", note: "Buildings and roads" },
  { src: "/samples/village_satellite.jpg", label: "Village and fields", note: "Satellite scene" },
];

export default function Uploader({ onFile }) {
  const input = useRef(null);
  const [over, setOver] = useState(false);

  const useSample = async (src) => {
    const blob = await (await fetch(src)).blob();
    onFile(new File([blob], src.split("/").pop(), { type: blob.type }));
  };

  return (
    <div className="uploader">
      <div
        className={"drop" + (over ? " over" : "")}
        role="button"
        tabIndex={0}
        aria-label="Upload an aerial image"
        onClick={() => input.current.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            input.current.click();
          }
        }}
        onDragOver={(e) => { e.preventDefault(); setOver(true); }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => { e.preventDefault(); setOver(false); onFile(e.dataTransfer.files[0]); }}
      >
        <Brackets />
        <span className="drop-icon">
          <i /><i />
          <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 16V4m0 0L7 9m5-5 5 5M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" />
          </svg>
        </span>
        <strong>{over ? "Release to upload" : "Drop an aerial image here"}</strong>
        <span className="drop-sub">or click to browse. You can also paste from the clipboard.</span>
        <span className="formats"><b>PNG</b><b>JPG</b><b>WebP</b><b>TIFF</b><b>25 MB</b></span>
        <input ref={input} type="file" accept="image/png,image/jpeg,image/webp,image/tiff" hidden onChange={(e) => { onFile(e.target.files[0]); e.target.value = ""; }} />
      </div>

      <div className="samples">
        <span className="samples-label">Or start with a sample</span>
        <div className="sample-row">
          {SAMPLES.map((s) => (
            <button key={s.src} type="button" className="sample" onClick={() => useSample(s.src)}>
              <span className="thumb"><img src={s.src} alt="" /></span>
              <span className="sample-text"><strong>{s.label}</strong><small>{s.note}</small></span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
