"use client";
import { useEffect, useState } from "react";
import ThemeToggle from "./ThemeToggle";

export function LogoMark({ size = 26 }) {
  return (
    <svg viewBox="0 0 32 32" width={size} height={size} aria-hidden="true">
      <defs>
        <linearGradient id="logo-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#34d399" />
          <stop offset="1" stopColor="#22d3ee" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="9" fill="url(#logo-grad)" />
      <g fill="none" stroke="#03130e" strokeWidth="1.6" strokeLinecap="round" opacity=".85">
        <path d="M7 17c2-.5 3-3 6-3s4-2.5 7-3" />
        <path d="M7 21c3-1 4-5 8-5s5-4 10-4" />
        <path d="M7 25c4-1 6-6 10-6s5-3 8-3" />
      </g>
    </svg>
  );
}

// Asking the health endpoint also loads the models, so the first real request is fast.
function ModelStatus() {
  const [s, setS] = useState({ state: "loading" });

  useEffect(() => {
    let alive = true;
    fetch("/api/health")
      .then((r) => r.json())
      .then((d) => alive && setS({ state: d.ok ? "ready" : "degraded", provider: d.provider }))
      .catch(() => alive && setS({ state: "offline" }));
    return () => { alive = false; };
  }, []);

  const label = {
    loading: "Warming up models",
    ready: `Models ready${s.provider ? ` · ${s.provider.toUpperCase()}` : ""}`,
    degraded: "Fallback mode",
    offline: "Server offline",
  }[s.state];

  return <span className={`status ${s.state}`} role="status"><i />{label}</span>;
}

export default function Nav() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className={"nav" + (scrolled ? " scrolled" : "")}>
      <div className="wrap">
        <a href="#" className="logo" aria-label="Back to top"><LogoMark /></a>
        <div className="nav-right">
          <ModelStatus />
          <a href="#how" className="nav-link">How it works</a>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
