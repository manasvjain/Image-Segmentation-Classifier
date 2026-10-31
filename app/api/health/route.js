import { NextResponse } from "next/server";
import { modelStatus } from "@/lib/segment";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  let status;
  try {
    status = await modelStatus();
  } catch (e) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 503 });
  }
  const ok = Object.values(status.models).every((m) => m.loaded);
  return NextResponse.json({ ok, ...status }, { status: ok ? 200 : 503 });
}
