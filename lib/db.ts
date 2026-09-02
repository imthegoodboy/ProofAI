import fs from "node:fs";
import path from "node:path";
import { createClient, type Client, type InValue, type Row } from "@libsql/client";
import { config } from "@/lib/config";
import type {
  EvidenceResult,
  ExtractedData,
  Finding,
  InternalVerification,
  ScoreCheck,
  Verification,
} from "@/lib/types";

const globalDatabase = globalThis as typeof globalThis & {
  proofAiDatabase?: Client;
  proofAiDatabaseReady?: Promise<void>;
};

function getLocalDatabaseUrl() {
  fs.mkdirSync(config.dataDir, { recursive: true });
  const absolute = path.join(config.dataDir, "proofai.db").replace(/\\/g, "/");
  return `file:${absolute}`;
}

function createDatabase() {
  return createClient({
    url: config.database.url || getLocalDatabaseUrl(),
    authToken: config.database.authToken || undefined,
  });
}

const db = globalDatabase.proofAiDatabase ?? createDatabase();
if (process.env.NODE_ENV !== "production") globalDatabase.proofAiDatabase = db;

async function initializeDatabase() {
  await db.batch(
    [
      `CREATE TABLE IF NOT EXISTS verifications (
        id TEXT PRIMARY KEY,
        owner_hash TEXT NOT NULL DEFAULT '',
        original_name TEXT NOT NULL,
        file_path TEXT NOT NULL DEFAULT '',
        document_blob BLOB,
        mime_type TEXT NOT NULL,
        document_type TEXT NOT NULL,
        evidence_urls TEXT NOT NULL DEFAULT '[]',
        status TEXT NOT NULL,
        current_step TEXT NOT NULL,
        progress INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        document_hash TEXT,
        extracted_text TEXT,
        extracted_data TEXT,
        proof_score INTEGER,
        risk_level TEXT,
        verdict TEXT,
        checks TEXT NOT NULL DEFAULT '[]',
        findings TEXT NOT NULL DEFAULT '[]',
        evidence TEXT NOT NULL DEFAULT '[]',
        storage_document_root TEXT,
        storage_report_root TEXT,
        storage_tx_hash TEXT,
        storage_key TEXT,
        chain_tx_hash TEXT,
        chain_block INTEGER,
        chain_contract_address TEXT,
        storage_error TEXT,
        chain_error TEXT,
        ai_provider TEXT
      )`,
      "CREATE INDEX IF NOT EXISTS idx_verifications_created ON verifications(created_at DESC)",
      "CREATE INDEX IF NOT EXISTS idx_verifications_hash ON verifications(document_hash)",
      `CREATE TABLE IF NOT EXISTS rate_limits (
        rate_key TEXT PRIMARY KEY,
        hits INTEGER NOT NULL,
        expires_at INTEGER NOT NULL
      )`,
      "CREATE INDEX IF NOT EXISTS idx_rate_limits_expiry ON rate_limits(expires_at)",
    ],
    "write",
  );

  // Keep databases created by the local MVP forward-compatible.
  for (const statement of [
    "ALTER TABLE verifications ADD COLUMN document_blob BLOB",
    "ALTER TABLE verifications ADD COLUMN chain_contract_address TEXT",
    "ALTER TABLE verifications ADD COLUMN owner_hash TEXT NOT NULL DEFAULT ''",
  ]) {
    try {
      await db.execute(statement);
    } catch (error) {
      if (!String(error).toLowerCase().includes("duplicate column")) throw error;
    }
  }
}

const ready = globalDatabase.proofAiDatabaseReady ?? initializeDatabase();
if (process.env.NODE_ENV !== "production") globalDatabase.proofAiDatabaseReady = ready;

const parseJson = <T>(value: unknown, fallback: T): T => {
  if (typeof value !== "string") return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
};

function toBytes(value: unknown) {
  if (value instanceof ArrayBuffer) return new Uint8Array(value);
  if (ArrayBuffer.isView(value)) {
    return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
  }
  return null;
}

function mapRow(row: Row): InternalVerification {
  return {
    id: String(row.id),
    ownerHash: String(row.owner_hash),
    originalName: String(row.original_name),
    document: toBytes(row.document_blob),
    mimeType: String(row.mime_type),
    documentType: String(row.document_type),
    evidenceUrls: parseJson<string[]>(row.evidence_urls, []),
    status: String(row.status) as InternalVerification["status"],
    currentStep: String(row.current_step),
    progress: Number(row.progress),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
    documentHash: row.document_hash ? String(row.document_hash) : null,
    extractedText: row.extracted_text ? String(row.extracted_text) : null,
    extractedData: parseJson<ExtractedData | null>(row.extracted_data, null),
    proofScore: row.proof_score === null ? null : Number(row.proof_score),
    riskLevel: row.risk_level
      ? (String(row.risk_level) as InternalVerification["riskLevel"])
      : null,
    verdict: row.verdict ? String(row.verdict) : null,
    checks: parseJson<ScoreCheck[]>(row.checks, []),
    findings: parseJson<Finding[]>(row.findings, []),
    evidence: parseJson<EvidenceResult[]>(row.evidence, []),
    storageDocumentRoot: row.storage_document_root
      ? String(row.storage_document_root)
      : null,
    storageReportRoot: row.storage_report_root ? String(row.storage_report_root) : null,
    storageTxHash: row.storage_tx_hash ? String(row.storage_tx_hash) : null,
    storageKey: row.storage_key ? String(row.storage_key) : null,
    chainTxHash: row.chain_tx_hash ? String(row.chain_tx_hash) : null,
    chainBlock: row.chain_block === null ? null : Number(row.chain_block),
    chainContractAddress: row.chain_contract_address
      ? String(row.chain_contract_address)
      : null,
    storageError: row.storage_error ? String(row.storage_error) : null,
    chainError: row.chain_error ? String(row.chain_error) : null,
    aiProvider: row.ai_provider
      ? (String(row.ai_provider) as InternalVerification["aiProvider"])
      : null,
  };
}

export function toPublicVerification(record: InternalVerification): Verification {
  const {
    document: _document,
    ownerHash: _ownerHash,
    extractedText: _text,
    evidenceUrls: _urls,
    storageKey: _key,
    ...safe
  } = record;
  void _document;
  void _ownerHash;
  void _text;
  void _urls;
  void _key;
  return safe;
}

export async function createVerification(input: {
  id: string;
  ownerHash: string;
  originalName: string;
  document: Uint8Array;
  mimeType: string;
  documentType: string;
  evidenceUrls: string[];
}) {
  await ready;
  const now = new Date().toISOString();
  await db.execute({
    sql: `INSERT INTO verifications (
      id, owner_hash, original_name, file_path, document_blob, mime_type, document_type,
      evidence_urls, status, current_step, progress, created_at, updated_at
    ) VALUES (?, ?, ?, '', ?, ?, ?, ?, 'uploaded', 'Document received', 6, ?, ?)`,
    args: [
      input.id,
      input.ownerHash,
      input.originalName,
      input.document,
      input.mimeType,
      input.documentType,
      JSON.stringify(input.evidenceUrls),
      now,
      now,
    ],
  });
  return (await getVerification(input.id))!;
}

export async function getVerification(id: string, ownerHash: string) {
  await ready;
  const result = await db.execute({
    sql: "SELECT * FROM verifications WHERE id = ? AND owner_hash = ?",
    args: [id, ownerHash],
  });
  return result.rows[0] ? mapRow(result.rows[0]) : null;
}

export async function listVerifications(ownerHash: string | null, limit = 50) {
  await ready;
  if (!ownerHash) return [];
  const safeLimit = Math.min(Math.max(Math.floor(limit), 1), 100);
  const result = await db.execute({
    sql: "SELECT * FROM verifications WHERE owner_hash = ? ORDER BY created_at DESC LIMIT ?",
    args: [ownerHash, safeLimit],
  });
  return result.rows.map(mapRow);
}

const columns: Record<keyof InternalVerification, string> = {
  id: "id",
  ownerHash: "owner_hash",
  originalName: "original_name",
  document: "document_blob",
  mimeType: "mime_type",
  documentType: "document_type",
  evidenceUrls: "evidence_urls",
  status: "status",
  currentStep: "current_step",
  progress: "progress",
  createdAt: "created_at",
  updatedAt: "updated_at",
  documentHash: "document_hash",
  extractedText: "extracted_text",
  extractedData: "extracted_data",
  proofScore: "proof_score",
  riskLevel: "risk_level",
  verdict: "verdict",
  checks: "checks",
  findings: "findings",
  evidence: "evidence",
  storageDocumentRoot: "storage_document_root",
  storageReportRoot: "storage_report_root",
  storageTxHash: "storage_tx_hash",
  storageKey: "storage_key",
  chainTxHash: "chain_tx_hash",
  chainBlock: "chain_block",
  chainContractAddress: "chain_contract_address",
  storageError: "storage_error",
  chainError: "chain_error",
  aiProvider: "ai_provider",
};

const jsonFields = new Set<keyof InternalVerification>([
  "evidenceUrls",
  "extractedData",
  "checks",
  "findings",
  "evidence",
]);

export async function updateVerification(
  id: string,
  ownerHash: string,
  patch: Partial<Omit<InternalVerification, "id" | "createdAt">>,
) {
  await ready;
  const entries = Object.entries(patch) as [keyof InternalVerification, unknown][];
  if (!entries.length) return getVerification(id, ownerHash);
  const set = entries.map(([key]) => `${columns[key]} = ?`);
  const values = entries.map(([key, value]) => {
    const serialized = jsonFields.has(key) ? JSON.stringify(value) : value;
    if (
      serialized === null ||
      typeof serialized === "string" ||
      typeof serialized === "number" ||
      typeof serialized === "bigint" ||
      serialized instanceof Uint8Array ||
      serialized instanceof ArrayBuffer
    ) {
      return serialized as InValue;
    }
    throw new Error(`Unsupported database value for ${String(key)}.`);
  });
  set.push("updated_at = ?");
  values.push(new Date().toISOString());
  await db.execute({
    sql: `UPDATE verifications SET ${set.join(", ")} WHERE id = ? AND owner_hash = ?`,
    args: [...values, id, ownerHash],
  });
  return getVerification(id, ownerHash);
}

export async function countOtherRecordsWithHash(hash: string, currentId: string) {
  await ready;
  const result = await db.execute({
    sql: "SELECT COUNT(*) AS total FROM verifications WHERE document_hash = ? AND id != ?",
    args: [hash, currentId],
  });
  return Number(result.rows[0]?.total || 0);
}

export async function incrementRateLimit(rateKey: string, expiresAt: number) {
  await ready;
  const result = await db.execute({
    sql: `INSERT INTO rate_limits (rate_key, hits, expires_at)
      VALUES (?, 1, ?)
      ON CONFLICT(rate_key) DO UPDATE SET hits = hits + 1
      RETURNING hits`,
    args: [rateKey, expiresAt],
  });
  return Number(result.rows[0]?.hits || 1);
}
