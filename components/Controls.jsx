"use client";
import { CLASS_LIST } from "@/lib/classes";

const MIN = 0.1;
const MAX = 0.9;

export default function Controls({ classes, onToggle, threshold, onThreshold, canRun, busy, onRun, onClear, hasImage }) {
  const fill = `${((threshold - MIN) / (MAX - MIN)) * 100}%`;

  return (
    <div className="controls">
      <div className="control-group">
        <span className="control-label" id="classes-label">Detect</span>
        <div className="chips" role="group" aria-labelledby="classes-label">
          {CLASS_LIST.map((c) => (
            <button
              key={c.id}
              type="button"
              className="chip"
              aria-pressed={classes.includes(c.id)}
              style={{ "--c": c.css }}
              onClick={() => onToggle(c.id)}
            >
              <i />
              {c.label}
            </button>
          ))}
        </div>
      </div>

      <label className="control-group threshold">
        <span className="control-label">Sensitivity <output>{threshold.toFixed(2)}</output></span>
        <input
          className="slider"
          type="range"
          min={MIN}
          max={MAX}
          step="0.05"
          value={threshold}
          style={{ "--fill": fill }}
          onChange={(e) => onThreshold(+e.target.value)}
        />
      </label>

      <div className="actions">
        {hasImage && <button type="button" className="btn ghost" onClick={onClear} disabled={busy}>New image</button>}
        <button type="button" className="btn primary" onClick={onRun} disabled={!canRun || busy}>
          {busy ? (
            <><span className="spinner" aria-hidden="true" />Analysing…</>
          ) : (
            <>
              Run segmentation
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14m-6-6 6 6-6 6" /></svg>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
