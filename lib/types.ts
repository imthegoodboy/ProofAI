export type VerificationStatus = "uploaded" | "processing" | "complete" | "failed";
export type RiskLevel = "low" | "medium" | "high" | null;

export interface ExtractedData {
  title: string | null;
  organization: string | null;
  documentId: string | null;
  issuingAuthority: string | null;
  dates: string[];
  claims: string[];
  pageCount: number;
}

export interface ScoreCheck {
  id: string;
  label: string;
  status: "passed" | "warning" | "failed" | "unavailable";
  detail: string;
  contribution: number;
}

export interface Finding {
  severity: "positive" | "warning" | "critical" | "neutral";
  title: string;
  detail: string;
}

export interface EvidenceResult {
  url: string;
  host: string;
  status: "confirmed" | "partial" | "mismatch" | "unavailable";
  matchedFields: string[];
  detail: string;
}

export interface Verification {
  id: string;
  originalName: string;
  mimeType: string;
  documentType: string;
  status: VerificationStatus;
  currentStep: string;
  progress: number;
  createdAt: string;
  updatedAt: string;
  documentHash: string | null;
  extractedData: ExtractedData | null;
  proofScore: number | null;
  riskLevel: RiskLevel;
  verdict: string | null;
  checks: ScoreCheck[];
  findings: Finding[];
  evidence: EvidenceResult[];
  storageDocumentRoot: string | null;
  storageReportRoot: string | null;
  storageTxHash: string | null;
  chainTxHash: string | null;
  chainBlock: number | null;
  storageError: string | null;
  chainError: string | null;
  aiProvider: "0g-compute" | "openai" | "local" | null;
  chainContractAddress: string | null;
}

export interface InternalVerification extends Verification {
  ownerHash: string;
  document: Uint8Array | null;
  extractedText: string | null;
  evidenceUrls: string[];
  storageKey: string | null;
}
