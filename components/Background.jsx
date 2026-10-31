// Decorative backdrop: drifting topographic contours plus soft colour glows. Pure markup, no client JS.
const W = 1200;
const H = 800;

function contours(cx, cy, count, step, seed) {
  return Array.from({ length: count }, (_, i) => {
    const base = 28 + i * step;
    const pts = [];
    for (let k = 0; k <= 80; k++) {
      const t = (k / 80) * Math.PI * 2;
      const wobble =
        1 + 0.1 * Math.sin(3 * t + seed + i * 0.15) + 0.06 * Math.sin(5 * t + seed * 2) + 0.03 * Math.sin(9 * t + i * 0.3);
      pts.push(`${(cx + Math.cos(t) * base * wobble * 1.25).toFixed(1)} ${(cy + Math.sin(t) * base * wobble * 0.85).toFixed(1)}`);
    }
    return `M${pts.join("L")}Z`;
  });
}

const HILLS = [
  { paths: contours(300, 280, 16, 27, 1.2), cls: "drift-a" },
  { paths: contours(900, 520, 14, 29, 4.1), cls: "drift-b" },
];

export default function Background() {
  return (
    <div className="bg" aria-hidden="true">
      <i className="aurora a1" />
      <i className="aurora a2" />
      <i className="aurora a3" />
      <svg className="contours" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice">
        {HILLS.map((h, i) => (
          <g key={i} className={h.cls} fill="none" stroke="currentColor" strokeWidth="1">
            {h.paths.map((d, j) => (
              <path key={j} d={d} opacity={0.35 + (j % 4 === 0 ? 0.45 : 0)} />
            ))}
          </g>
        ))}
      </svg>
      <i className="vignette" />
    </div>
  );
}
