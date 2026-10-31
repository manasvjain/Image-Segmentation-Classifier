import { NextResponse } from "next/server";
import sharp from "sharp";
import { segment, preloadModels } from "@/lib/segment";
import { CLASSES, MAX_UPLOAD_BYTES as MAX_BYTES } from "@/lib/classes";

export const runtime = "nodejs";
export const maxDuration = 300;

// Warm the models when the server starts, but not while `next build` collects page data.
if (process.env.NEXT_PHASE !== "phase-production-build") preloadModels();

const FORMATS = ["jpeg", "png", "webp", "tiff"];

const fail = (error, status = 400) => NextResponse.json({ error }, { status });

export async function POST(req) {
  let form;
  try {
    form = await req.formData();
  } catch {
    return fail("The upload could not be read. Please try again.");
  }

  const file = form.get("image");
  if (!file || typeof file === "string") return fail("No image uploaded.");
  if (file.size > MAX_BYTES) return fail("That image is larger than 25 MB.", 413);

  const buffer = Buffer.from(await file.arrayBuffer());
  try {
    const { format } = await sharp(buffer).metadata();
    if (!FORMATS.includes(format)) return fail("Unsupported file type. Use PNG, JPG, WebP or TIFF.", 415);
  } catch {
    return fail("That file is not a readable image.", 415);
  }

  let classes = form.getAll("classes").filter((c) => c in CLASSES);
  if (!classes.length) classes = Object.keys(CLASSES);
  const threshold = Math.min(0.95, Math.max(0.05, parseFloat(form.get("threshold")) || 0.5));

  try {
    return NextResponse.json(await segment(buffer, classes, threshold));
  } catch (e) {
    console.error("[predict]", e);
    return fail("Something went wrong while analysing this image.", 500);
  }
}
