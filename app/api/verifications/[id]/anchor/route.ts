import fs from "node:fs/promises";
import { NextResponse } from "next/server";
import {
  getVerification,
  toPublicVerification,
  updateVerification,
} from "@/lib/db";
import { persistVerificationOn0G } from "@/lib/og";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const record = getVerification(id);
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
    const document = await fs.readFile(record.filePath);
    const persistence = await persistVerificationOn0G({
      id,
      document,
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
    });
    const updated = updateVerification(id, persistence);
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
