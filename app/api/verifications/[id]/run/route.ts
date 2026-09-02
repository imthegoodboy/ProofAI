import { NextResponse } from "next/server";
import { analyzeDocument } from "@/lib/analysis";
import { extractDocument, sha256 } from "@/lib/document";
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
  const rate = await checkRateLimit(request, "analyze", 12, 60 * 60 * 1000);
  if (!rate.allowed) {
    return NextResponse.json(
      { error: "Analysis limit reached. Try again later." },
      { status: 429, headers: { "retry-after": String(rate.retryAfter) } },
    );
  }
  const ownerHash = await getSessionHash();
  if (!ownerHash) {
    return NextResponse.json({ error: "Verification not found." }, { status: 404 });
  }
  const existing = await getVerification(id, ownerHash);
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
    await updateVerification(id, ownerHash, {
      status: "processing",
      currentStep: "Fingerprinting document",
      progress: 14,
    });
    if (!existing.document) {
      throw new Error("The private document copy is no longer available for analysis.");
    }
    const document = Buffer.from(existing.document);
    const documentHash = sha256(document);
    await updateVerification(id, ownerHash, {
      documentHash,
      currentStep: "Extracting document content",
      progress: 28,
    });

    const extraction = await extractDocument(document, existing.mimeType);
    await updateVerification(id, ownerHash, {
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
    await updateVerification(id, ownerHash, {
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
    await updateVerification(id, ownerHash, {
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
    const completed = await updateVerification(id, ownerHash, {
      ...persistence,
      document: persistence.storageDocumentRoot ? null : existing.document,
      extractedText: null,
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
    const failed = await updateVerification(id, ownerHash, {
      status: "failed",
      currentStep: message,
    });
    return NextResponse.json(
      { error: message, verification: failed ? toPublicVerification(failed) : null },
      { status: 500 },
    );
  }
}
