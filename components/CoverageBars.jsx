"use client";
import { useEffect, useState } from "react";
import { CLASS_LIST } from "@/lib/classes";
import CountUp from "./CountUp";

const isFallback = (engine) => /fallback/i.test(engine);

export default function CoverageBars({ coverage, engines }) {
  const rows = CLASS_LIST.filter((c) => c.id in coverage);
  const [ready, setReady] = useState(false);

  // Start meters at zero, then let the width transition play.
  useEffect(() => {
    const id = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <div className="coverage">
      {rows.map((c, i) => (
        <div className="stat" key={c.id} style={{ "--c": c.css, "--i": i }}>
          <div className="stat-head">
            <span><i />{c.label}</span>
            <em className={isFallback(engines[c.id]) ? "badge warn" : "badge"}>{isFallback(engines[c.id]) ? "Fallback" : "UNet++"}</em>
          </div>
          <strong><CountUp value={coverage[c.id]} /><small>%</small></strong>
          <span className="stat-sub">of the image</span>
          <div className="meter" role="img" aria-label={`${c.label} covers ${coverage[c.id]} percent of the image`}>
            <i style={{ width: ready ? `${Math.min(100, Math.max(coverage[c.id], coverage[c.id] > 0 ? 1.5 : 0))}%` : "0%" }} />
          </div>
        </div>
      ))}
    </div>
  );
}
