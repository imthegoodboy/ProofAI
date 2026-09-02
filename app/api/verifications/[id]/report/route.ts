import { NextResponse } from "next/server";
import { getVerification } from "@/lib/db";
import { getSessionHash } from "@/lib/session";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const ownerHash = await getSessionHash();
  const record = ownerHash ? await getVerification(id, ownerHash) : null;
  if (!record || record.status !== "complete") {
    return NextResponse.json({ error: "Completed report not found." }, { status: 404 });
  }
  const report = {
    protocol: "ProofAI Verification Report",
    version: 1,
    verificationId: record.id,
    generatedAt: record.updatedAt,
    document: {
      originalName: record.originalName,
      documentType: record.documentType,
      hash: record.documentHash,
    },
    proofScore: record.proofScore,
    riskLevel: record.riskLevel,
    verdict: record.verdict,
    extractedData: record.extractedData,
    checks: record.checks,
    findings: record.findings,
    evidence: record.evidence,
    storage: {
      documentRoot: record.storageDocumentRoot,
      reportRoot: record.storageReportRoot,
      transactionHash: record.storageTxHash,
    },
    chain: {
      transactionHash: record.chainTxHash,
      blockNumber: record.chainBlock,
    },
    disclaimer:
      "ProofAI assesses document consistency and available evidence; it does not guarantee legal authenticity.",
  };
  return new NextResponse(JSON.stringify(report, null, 2), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "content-disposition": `attachment; filename="${record.id}-report.json"`,
    },
  });
}
