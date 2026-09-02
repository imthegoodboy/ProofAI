import fs from "node:fs/promises";
import { NextResponse } from "next/server";
import { analyzeDocument } from "@/lib/analysis";
import { extractDocument, sha256 } from "@/lib/document";
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
  const existing = getVerification(id);
  if (!existing) {
    return NextResponse.json({ error: "Verification not found." }, { status: 404 });
  }
  if (existing.status === "complete") {
    return NextResponse.json({ verification: toPublicVerification(existing) });
  }
  if (
    existing.status === "processing" &&
    Date.now() - new Date(existing.updatedAt).valueOf() < 5 * 60 * 1000
  ) {
    return NextResponse.json(
      { verification: toPublicVerification(existing), processing: true },
      { status: 202 },
    );
  }

  try {
    updateVerification(id, {
      status: "processing",
      currentStep: "Fingerprinting document",
      progress: 14,
    });
    const document = await fs.readFile(existing.filePath);
    const documentHash = sha256(document);
    updateVerification(id, {
      documentHash,
      currentStep: "Extracting document content",
      progress: 28,
    });

    const extraction = await extractDocument(document, existing.mimeType);
    updateVerification(id, {
      extractedText: extraction.text,
      currentStep: "Checking structure and metadata",
      progress: 46,
    });

    const analysis = await analyzeDocument({
      id,
      hash: documentHash,
      extraction,
      evidenceUrls: existing.evidenceUrls,
    });
    updateVerification(id, {
      extractedData: analysis.extracted,
      proofScore: analysis.proofScore,
      riskLevel: analysis.riskLevel,
      verdict: analysis.verdict,
      checks: analysis.checks,
      findings: analysis.findings,
      evidence: analysis.evidence,
      aiProvider: analysis.aiProvider,
      currentStep: "Preparing verification report",
      progress: 72,
    });

    const report = {
      protocol: "ProofAI Verification Report",
      version: 1,
      verificationId: id,
      generatedAt: new Date().toISOString(),
      document: {
        originalName: existing.originalName,
        documentType: existing.documentType,
        hash: documentHash,
      },
      result: analysis,
      disclaimer:
        "ProofAI assesses document consistency and available evidence; it does not guarantee legal authenticity.",
    };
    updateVerification(id, {
      currentStep: "Writing encrypted evidence to 0G",
      progress: 81,
    });
    const persistence = await persistVerificationOn0G({
      id,
      document,
      documentHash,
      proofScore: analysis.proofScore,
      riskLevel: analysis.riskLevel,
      report,
    });
    const completed = updateVerification(id, {
      ...persistence,
      status: "complete",
      currentStep: persistence.chainTxHash
        ? "Verification anchored on 0G"
        : "Analysis complete — 0G proof pending",
      progress: 100,
    });
    return NextResponse.json({ verification: toPublicVerification(completed!) });
  } catch (error) {
    console.error(`Verification ${id} failed:`, error);
    const message = error instanceof Error ? error.message : "Verification failed.";
    const failed = updateVerification(id, {
      status: "failed",
      currentStep: message,
    });
    return NextResponse.json(
      { error: message, verification: failed ? toPublicVerification(failed) : null },
      { status: 500 },
    );
  }
}
