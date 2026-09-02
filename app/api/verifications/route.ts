import crypto from "node:crypto";
import path from "node:path";
import { NextResponse } from "next/server";
import { config, getIntegrationStatus } from "@/lib/config";
import {
  createVerification,
  listVerifications,
  toPublicVerification,
} from "@/lib/db";
import {
  checkRateLimit,
  getOrCreateSessionHash,
  getSessionHash,
  isSameOrigin,
} from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const mimeByExtension: Record<string, string> = {
  ".pdf": "application/pdf",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
};

const allowedMimeTypes = new Set(Object.values(mimeByExtension));

function matchesFileSignature(buffer: Buffer, mimeType: string) {
  if (mimeType === "application/pdf") return buffer.subarray(0, 5).toString() === "%PDF-";
  if (mimeType === "image/png") {
    return buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  }
  if (mimeType === "image/jpeg") {
    return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  }
  if (mimeType === "image/webp") {
    return buffer.subarray(0, 4).toString() === "RIFF" && buffer.subarray(8, 12).toString() === "WEBP";
  }
  return false;
}

function createId() {
  return `PF-${crypto.randomBytes(10).toString("hex").toUpperCase()}`;
}

function getEvidenceUrls(value: FormDataEntryValue | null) {
  if (typeof value !== "string" || !value.trim()) return [];
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item): item is string => typeof item === "string")
      .map((item) => item.trim())
      .filter(Boolean)
      .slice(0, 3);
  } catch {
    return [];
  }
}

export async function GET() {
  const ownerHash = await getSessionHash();
  return NextResponse.json({
    verifications: (await listVerifications(ownerHash)).map(toPublicVerification),
    integrations: getIntegrationStatus(),
  });
}

export async function POST(request: Request) {
  try {
    if (!isSameOrigin(request)) {
      return NextResponse.json({ error: "Cross-origin uploads are not allowed." }, { status: 403 });
    }
    const rate = await checkRateLimit(request, "upload", 8, 60 * 60 * 1000);
    if (!rate.allowed) {
      return NextResponse.json(
        { error: "Upload limit reached. Try again later." },
        { status: 429, headers: { "retry-after": String(rate.retryAfter) } },
      );
    }
    const ownerHash = await getOrCreateSessionHash();
    const form = await request.formData();
    const file = form.get("document");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Choose a document to verify." }, { status: 400 });
    }
    if (file.size === 0) {
      return NextResponse.json({ error: "The selected document is empty." }, { status: 400 });
    }
    if (file.size > config.maxUploadBytes) {
      const maxMb = Math.round(config.maxUploadBytes / 1024 / 1024);
      return NextResponse.json(
        { error: `The document exceeds the ${maxMb} MB upload limit.` },
        { status: 413 },
      );
    }
    const extension = path.extname(file.name).toLowerCase();
    const mimeType = allowedMimeTypes.has(file.type)
      ? file.type
      : mimeByExtension[extension];
    if (!mimeType || !allowedMimeTypes.has(mimeType)) {
      return NextResponse.json(
        { error: "Upload a PDF, PNG, JPEG, or WebP document." },
        { status: 415 },
      );
    }
    const buffer = Buffer.from(await file.arrayBuffer());
    if (!matchesFileSignature(buffer, mimeType)) {
      return NextResponse.json(
        { error: "The file contents do not match the selected document format." },
        { status: 415 },
      );
    }
    const requestedType = String(form.get("documentType") || "other").toLowerCase();
    const documentType = ["certificate", "invoice", "license", "report", "other"].includes(requestedType)
      ? requestedType
      : "other";
    const evidenceUrls = getEvidenceUrls(form.get("evidenceUrls"));
    const id = createId();
    const record = await createVerification({
      id,
      ownerHash,
      originalName: path.basename(file.name).slice(0, 240),
      document: buffer,
      mimeType,
      documentType,
      evidenceUrls,
    });
    return NextResponse.json(
      { verification: toPublicVerification(record) },
      { status: 201 },
    );
  } catch (error) {
    console.error("Upload failed:", error);
    return NextResponse.json(
      { error: "The upload could not be saved. Please try again." },
      { status: 500 },
    );
  }
}
