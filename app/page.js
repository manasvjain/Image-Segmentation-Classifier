"use client";
import { useCallback, useEffect, useState } from "react";
import Background from "@/components/Background";
import Nav, { LogoMark } from "@/components/Nav";
import Reveal from "@/components/Reveal";
import Uploader from "@/components/Uploader";
import Controls from "@/components/Controls";
import ResultViewer from "@/components/ResultViewer";
import { CLASS_LIST, ACCEPTED_TYPES, MAX_UPLOAD_BYTES } from "@/lib/classes";

const STEPS = [
  ["Upload", "Drop in a drone, aerial or satellite image, or start from a sample."],
  ["Segment", "A UNet++ model reads the scene tile by tile and labels every pixel."],
  ["Review", "Compare with the original, tune the sensitivity and download the masks."],
];

const SPECS = [
  ["UNet++", "ResNet34 encoder"],
  ["512 px", "Overlapping tiles"],
  ["ONNX", "Runs on your server"],
  ["Private", "Images are not stored"],
];

const STEPPER = ["Upload", "Configure", "Results"];

const tick = (
  <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m5 12 5 5 9-10" /></svg>
);

export default function Home() {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [classes, setClasses] = useState(CLASS_LIST.map((c) => c.id));
  const [threshold, setThreshold] = useState(0.5);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  const pick = useCallback((f) => {
    if (!f) return;
    if (f.type && !ACCEPTED_TYPES.includes(f.type)) return setError("Unsupported file type. Use PNG, JPG, WebP or TIFF.");
    if (f.size > MAX_UPLOAD_BYTES) return setError("That image is larger than 25 MB.");
    setFile(f);
    setResult(null);
    setError("");
    setPreview((old) => {
      if (old) URL.revokeObjectURL(old);
      return URL.createObjectURL(f);
    });
  }, []);

  useEffect(() => {
    const onPaste = (e) => pick([...(e.clipboardData?.files ?? [])].find((f) => f.type.startsWith("image/")));
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [pick]);

  const clear = () => {
    setPreview((old) => {
      if (old) URL.revokeObjectURL(old);
      return null;
    });
    setFile(null);
    setResult(null);
    setError("");
  };

  const toggle = (id) => setClasses((cs) => (cs.includes(id) ? cs.filter((c) => c !== id) : [...cs, id]));

  const run = async () => {
    setBusy(true);
    setError("");
    const body = new FormData();
    body.append("image", file);
    body.append("threshold", threshold);
    classes.forEach((c) => body.append("classes", c));
    const t0 = performance.now();
    try {
      const r = await fetch("/api/predict", { method: "POST", body });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(data.error || "Prediction failed. Please try again.");
      setResult({ ...data, seconds: (performance.now() - t0) / 1000 });
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  // Lets the studio card's glow follow the cursor.
  const spotlight = (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty("--mx", `${e.clientX - r.left}px`);
    e.currentTarget.style.setProperty("--my", `${e.clientY - r.top}px`);
  };

  const step = result ? 3 : preview ? 2 : 1;

  return (
    <>
      <Background />
      <Nav />

      <main>
        <section className="hero wrap">
          <p className="eyebrow rise" style={{ "--d": 0 }}><i />Private · Runs on your server</p>
          <h1 className="rise" style={{ "--d": 1 }}>
            Segment aerial imagery <em>in&nbsp;seconds</em>
          </h1>
          <p className="lead rise" style={{ "--d": 2 }}>
            Upload a drone, aerial or satellite image and get building, road and water masks, with a before-and-after view and coverage numbers.
          </p>
        </section>

        <section className="studio wrap rise" style={{ "--d": 3 }} aria-label="Segmentation studio">
          <div className={"panel" + (busy ? " busy" : "")} onPointerMove={spotlight}>
            <ol className="stepper" aria-label="Progress">
              {STEPPER.map((label, i) => (
                <li key={label} className={step > i + 1 ? "done" : step === i + 1 ? "active" : ""} aria-current={step === i + 1 ? "step" : undefined}>
                  <span>{step > i + 1 ? tick : i + 1}</span>
                  {label}
                </li>
              ))}
            </ol>

            {preview ? (
              <ResultViewer preview={preview} result={result} busy={busy} />
            ) : (
              <Uploader onFile={pick} />
            )}

            {error && <p className="error" role="alert">{error}</p>}

            <Controls
              classes={classes}
              onToggle={toggle}
              threshold={threshold}
              onThreshold={setThreshold}
              hasImage={!!preview}
              canRun={!!file && classes.length > 0}
              busy={busy}
              onRun={run}
              onClear={clear}
            />
          </div>
        </section>

        <Reveal as="section" className="specs-wrap wrap" aria-label="Under the hood">
          <div className="specs">
            {SPECS.map(([big, small]) => (
              <div key={big}><strong>{big}</strong><span>{small}</span></div>
            ))}
          </div>
        </Reveal>

        <section className="how wrap" id="how" aria-labelledby="how-title">
          <Reveal>
            <h2 id="how-title">How it works</h2>
          </Reveal>
          <ol>
            {STEPS.map(([title, text], i) => (
              <Reveal as="li" key={title} delay={i * 110}>
                <strong>{title}</strong>
                <span>{text}</span>
              </Reveal>
            ))}
          </ol>
          <Reveal>
            <p className="fine">
              Trained on 50 cm drone orthophotos. If a model cannot be loaded, a simple colour-based method steps in and the result is labelled as a fallback.
            </p>
          </Reveal>
        </section>
      </main>

      <footer className="wrap">
        <span className="foot-logo"><LogoMark size={20} />Aerial segmentation</span>
        <span>UNet++ · ONNX Runtime · Next.js</span>
      </footer>
    </>
  );
}
