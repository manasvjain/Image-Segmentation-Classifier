// Inference on a remote API (the Hugging Face Space) instead of in this process.
// Enabled by setting HF_API_URL; HF_TOKEN is only needed for a private Space.
const BASE = (process.env.HF_API_URL || "").replace(/\/$/, "");

export const REMOTE = Boolean(BASE);

const headers = () => (process.env.HF_TOKEN ? { Authorization: `Bearer ${process.env.HF_TOKEN}` } : {});

export async function remoteSegment(buffer, classes, threshold) {
  const form = new FormData();
  form.append("image", new Blob([buffer]), "image");
  classes.forEach((c) => form.append("classes", c));
  form.append("threshold", String(threshold));
  const res = await fetch(`${BASE}/predict`, {
    method: "POST",
    body: form,
    headers: headers(),
    signal: AbortSignal.timeout(280000),
  });
  if (!res.ok) throw new Error(`HF API ${res.status}`);
  return res.json();
}

export async function remoteStatus() {
  const res = await fetch(`${BASE}/health`, {
    headers: headers(),
    signal: AbortSignal.timeout(60000), // a sleeping Space can take a while to wake
  });
  if (!res.ok) throw new Error(`HF API ${res.status}`);
  const { models, provider } = await res.json();
  const mapped = Object.fromEntries(Object.entries(models).map(([k, v]) => [k, { file: v, loaded: v }]));
  return { remote: true, provider, models: mapped };
}
