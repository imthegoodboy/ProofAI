import { NextResponse } from "next/server";
import { getVerification, toPublicVerification } from "@/lib/db";
import { getSessionHash } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const ownerHash = await getSessionHash();
  if (!ownerHash) {
    return NextResponse.json({ error: "Verification not found." }, { status: 404 });
  }
  const record = await getVerification(id, ownerHash);
  if (!record) {
    return NextResponse.json({ error: "Verification not found." }, { status: 404 });
  }
  return NextResponse.json({ verification: toPublicVerification(record) });
}
