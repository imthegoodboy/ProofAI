import { NextResponse } from "next/server";
import { getVerification, toPublicVerification } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const record = getVerification(id);
  if (!record) {
    return NextResponse.json({ error: "Verification not found." }, { status: 404 });
  }
  return NextResponse.json({ verification: toPublicVerification(record) });
}
