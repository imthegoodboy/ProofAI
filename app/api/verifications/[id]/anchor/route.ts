import { NextResponse } from "next/server";
import {
  getVerification,
  toPublicVerification,
  updateVerification,
} from "@/lib/db";
import { persistVerificationOn0G } from "@/lib/og";
import { checkRateLimit, getSessionHash, isSameOrigin } from "@/lib/session";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: "Cross-origin requests are not allowed." }, { status: 403 });
  }
  const rate = await checkRateLimit(request, "anchor", 8, 60 * 60 * 1000);
  if (!rate.allowed) {
    return NextResponse.json(
      { error: "Anchoring limit reached. Try again later." },
      { status: 429, headers: { "retry-after": String(rate.retryAfter) } },
    );
  }
  const ownerHash = await getSessionHash();
  if (!ownerHash) {
    return NextResponse.json({ error: "Verification not found." }, { status: 404 });
  }
  const record = await getVerification(id, ownerHash);
  if (!record) {
    return NextResponse.json({ error: "Verification not found." }, { status: 404 });
  }
  if (
    record.status !== "complete" ||
    !record.documentHash ||
    record.proofScore === null ||
    !record.riskLevel
  ) {
    return NextResponse.json(
      { error: "Finish document analysis before anchoring a proof." },
      { status: 409 },
    );
  }
  try {
    if (!record.document && !record.storageDocumentRoot) {
      return NextResponse.json(
        { error: "The private document copy is no longer available for storage retry." },
        { status: 410 },
      );
    }
    const persistence = await persistVerificationOn0G({
      id,
      document: record.document ? Buffer.from(record.document) : null,
      documentHash: record.documentHash,
      proofScore: record.proofScore,
      riskLevel: record.riskLevel,
      report: {
        protocol: "ProofAI Verification Report",
        version: 1,
        verificationId: id,
        documentHash: record.documentHash,
        proofScore: record.proofScore,
        riskLevel: record.riskLevel,
        extractedData: record.extractedData,
        checks: record.checks,
        findings: record.findings,
        evidence: record.evidence,
      },
      existingDocumentRoot: record.storageDocumentRoot,
      existingReportRoot: record.storageReportRoot,
      existingStorageTxHash: record.storageTxHash,
      existingStorageKey: record.storageKey,
    });
    const updated = await updateVerification(id, ownerHash, {
      ...persistence,
      document: persistence.storageDocumentRoot ? null : record.document,
    });
    const failed = persistence.chainError || persistence.storageError;
    return NextResponse.json({
      verification: toPublicVerification(updated!),
      anchored: Boolean(persistence.chainTxHash),
      error: failed || undefined,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "0G anchoring failed." },
      { status: 500 },
    );
  }
}
