import { countOtherRecordsWithHash } from "@/lib/db";
import type { DocumentExtraction } from "@/lib/document";
import { reviewWithAi } from "@/lib/ai";
import { verifyEvidence } from "@/lib/evidence";
import type {
  EvidenceResult,
  ExtractedData,
  Finding,
  RiskLevel,
  ScoreCheck,
} from "@/lib/types";

const cleanLine = (line: string) => line.replace(/\s+/g, " ").trim();

const unique = (items: string[]) =>
  [...new Set(items.map((item) => item.trim()).filter(Boolean))];

export function extractFields(text: string, pageCount: number): ExtractedData {
  const lines = text
    .split(/\r?\n/)
    .map(cleanLine)
    .filter((line) => line.length >= 3);
  const title =
    lines.find(
      (line) =>
        line.length <= 110 &&
        /(certificate|invoice|licen[cs]e|report|diploma|degree|credential|statement)/i.test(line),
    ) || lines.find((line) => line.length <= 80) || null;
  const labeledId = text.match(
    /(?:certificate|credential|document|invoice|licen[cs]e|registration|serial)\s*(?:id|no\.?|number|#)\s*[:#-]?\s*([A-Z0-9][A-Z0-9./_-]{3,})/i,
  );
  const fallbackId = text.match(/\b[A-Z]{2,8}[-/]\d{4,}[A-Z0-9/-]*\b/i);
  const organization =
    lines.find(
      (line) =>
        line.length <= 120 &&
        /(university|college|institute|authority|council|corporation|company|foundation|limited|ltd\.?|inc\.?|llc|bank|board)/i.test(line),
    ) || null;
  const issuerMatch = text.match(
    /(?:issued|certified|awarded|authorized|approved)\s+by\s*[:\-]?\s*([^\n]{3,100})/i,
  );
  const dates = unique([
    ...(text.match(/\b(?:19|20)\d{2}[-/.](?:0?[1-9]|1[0-2])[-/.](?:0?[1-9]|[12]\d|3[01])\b/g) || []),
    ...(text.match(/\b(?:0?[1-9]|[12]\d|3[01])[-/.](?:0?[1-9]|1[0-2])[-/.](?:19|20)\d{2}\b/g) || []),
    ...(text.match(/\b(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{1,2},?\s+(?:19|20)\d{2}\b/gi) || []),
  ]).slice(0, 12);
  const claims = unique(
    lines.filter(
      (line) =>
        line.length <= 220 &&
        /(certif|award|complet|achiev|compli|claim|total|amount|registered|accredit|valid|issued)/i.test(line),
    ),
  ).slice(0, 8);
  return {
    title,
    organization,
    documentId: labeledId?.[1] || fallbackId?.[0] || null,
    issuingAuthority: issuerMatch?.[1]?.trim() || null,
    dates,
    claims,
    pageCount,
  };
}

function parseDate(value: string) {
  const normalized = value.replace(/^D:/, "").replace(/'/g, "");
  if (/^\d{8}/.test(normalized)) {
    const iso = `${normalized.slice(0, 4)}-${normalized.slice(4, 6)}-${normalized.slice(6, 8)}`;
    const date = new Date(`${iso}T00:00:00Z`);
    return Number.isNaN(date.valueOf()) ? null : date;
  }
  const parts = normalized.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
  const date = parts
    ? new Date(`${parts[3]}-${parts[2].padStart(2, "0")}-${parts[1].padStart(2, "0")}T00:00:00Z`)
    : new Date(normalized);
  return Number.isNaN(date.valueOf()) ? null : date;
}

function dateAnomalies(dates: string[]) {
  const tomorrow = Date.now() + 24 * 60 * 60 * 1000;
  return dates
    .map((value) => ({ value, date: parseDate(value) }))
    .filter(({ date }) => date && date.valueOf() > tomorrow)
    .map(({ value }) => value);
}

function evidenceCheck(evidence: EvidenceResult[]): ScoreCheck {
  if (!evidence.length) {
    return {
      id: "evidence",
      label: "External evidence",
      status: "unavailable",
      detail: "No public evidence links were supplied; the score does not assume a match.",
      contribution: 0,
    };
  }
  const confirmed = evidence.filter((item) => item.status === "confirmed").length;
  const partial = evidence.filter((item) => item.status === "partial").length;
  const mismatch = evidence.filter((item) => item.status === "mismatch").length;
  if (mismatch) {
    return {
      id: "evidence",
      label: "External evidence",
      status: "failed",
      detail: `${mismatch} source${mismatch === 1 ? "" : "s"} loaded without matching document identity fields.`,
      contribution: -15,
    };
  }
  if (confirmed) {
    return {
      id: "evidence",
      label: "External evidence",
      status: partial ? "warning" : "passed",
      detail: `${confirmed} source${confirmed === 1 ? "" : "s"} confirmed all comparable fields.`,
      contribution: partial ? 15 : 20,
    };
  }
  if (partial) {
    return {
      id: "evidence",
      label: "External evidence",
      status: "warning",
      detail: "At least one field matched, but the source did not confirm the full identity.",
      contribution: 8,
    };
  }
  return {
    id: "evidence",
    label: "External evidence",
    status: "unavailable",
    detail: "The submitted evidence links could not be compared.",
    contribution: 0,
  };
}

export async function analyzeDocument(input: {
  id: string;
  hash: string;
  extraction: DocumentExtraction;
  evidenceUrls: string[];
}) {
  const extracted = extractFields(input.extraction.text, input.extraction.pageCount);
  const futureDates = dateAnomalies(extracted.dates);
  const duplicateCount = await countOtherRecordsWithHash(input.hash, input.id);
  const modification = Object.entries(input.extraction.metadata).find(([key]) =>
    /moddate|modifydate|datetimemodified/i.test(key),
  )?.[1];
  const creation = Object.entries(input.extraction.metadata).find(([key]) =>
    /creationdate|createdate|datetimeoriginal/i.test(key),
  )?.[1];
  const modifiedDate = modification ? parseDate(modification) : null;
  const createdDate = creation ? parseDate(creation) : null;
  const metadataOrderIssue = Boolean(
    modifiedDate && createdDate && createdDate.valueOf() > modifiedDate.valueOf(),
  );
  const fontIssue =
    input.extraction.fontFamilies.length > 8 || input.extraction.fontSizes.length > 14;

  const evidence = await verifyEvidence(input.evidenceUrls, extracted);
  const ai = await reviewWithAi(input.extraction.text, extracted);
  extracted.claims = unique([...extracted.claims, ...ai.review.additionalClaims]).slice(0, 10);

  const identityCount = [
    extracted.documentId,
    extracted.organization,
    extracted.issuingAuthority,
  ].filter(Boolean).length;
  const readable = input.extraction.text.length >= 250;
  const barelyReadable = input.extraction.text.length < 80;
  const checks: ScoreCheck[] = [
    {
      id: "integrity",
      label: "Document integrity",
      status: barelyReadable ? "failed" : readable ? "passed" : "warning",
      detail: barelyReadable
        ? "Too little readable text was recovered for a reliable structural review."
        : readable
          ? `${input.extraction.pageCount} page${input.extraction.pageCount === 1 ? "" : "s"} parsed with usable content.`
          : "The document was readable, but contained limited text.",
      contribution: barelyReadable ? -10 : readable ? 20 : 8,
    },
    {
      id: "identity",
      label: "Identity fields",
      status: identityCount >= 2 ? "passed" : identityCount === 1 ? "warning" : "failed",
      detail: `${identityCount} of 3 primary identity fields were extracted.`,
      contribution: identityCount >= 2 ? 15 : identityCount === 1 ? 6 : -5,
    },
    {
      id: "dates",
      label: "Date consistency",
      status: futureDates.length ? "failed" : extracted.dates.length ? "passed" : "unavailable",
      detail: futureDates.length
        ? `Future-dated value${futureDates.length === 1 ? "" : "s"} found: ${futureDates.join(", ")}.`
        : extracted.dates.length
          ? `${extracted.dates.length} date value${extracted.dates.length === 1 ? "" : "s"} found with no future-date conflict.`
          : "No date was available for comparison.",
      contribution: futureDates.length ? -15 : extracted.dates.length ? 15 : 0,
    },
    {
      id: "metadata",
      label: "Metadata & formatting",
      status: metadataOrderIssue || fontIssue ? "warning" : "passed",
      detail: metadataOrderIssue
        ? "The creation timestamp is later than the modification timestamp."
        : fontIssue
          ? "An unusually broad mix of fonts or sizes was detected."
          : "No metadata ordering or typography outlier was detected.",
      contribution: metadataOrderIssue || fontIssue ? -8 : 10,
    },
    {
      id: "duplicate",
      label: "Reuse detection",
      status: duplicateCount ? "warning" : "passed",
      detail: duplicateCount
        ? `This exact file hash appeared in ${duplicateCount} earlier verification${duplicateCount === 1 ? "" : "s"}.`
        : "This file hash has not appeared in another verification.",
      contribution: duplicateCount ? -12 : 5,
    },
    evidenceCheck(evidence),
  ];

  if (ai.provider === "openai") {
    checks.push({
      id: "ai-review",
      label: "AI consistency review",
      status:
        ai.review.scoreAdjustment < 0
          ? "warning"
          : ai.review.scoreAdjustment > 0
            ? "passed"
            : "unavailable",
      detail: "A configured language model reviewed the extracted text for internally supported inconsistencies.",
      contribution: ai.review.scoreAdjustment,
    });
  }

  const rawScore = 20 + checks.reduce((total, check) => total + check.contribution, 0);
  const proofScore = Math.max(0, Math.min(100, Math.round(rawScore)));
  const riskLevel: Exclude<RiskLevel, null> =
    proofScore >= 75 ? "low" : proofScore >= 45 ? "medium" : "high";
  const verdict =
    riskLevel === "low"
      ? "Evidence is broadly consistent"
      : riskLevel === "medium"
        ? "Review recommended"
        : "Multiple risk signals detected";
  const findings: Finding[] = [
    ...checks
      .filter((check) => check.status !== "unavailable")
      .map((check): Finding => ({
        severity:
          check.status === "passed"
            ? "positive"
            : check.status === "failed"
              ? "critical"
              : "warning",
        title: check.label,
        detail: check.detail,
      })),
    ...ai.review.findings,
  ].slice(0, 12);

  return {
    extracted,
    checks,
    findings,
    evidence,
    proofScore,
    riskLevel,
    verdict,
    aiProvider: ai.provider,
  };
}
