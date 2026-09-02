import crypto from "node:crypto";

export interface DocumentExtraction {
  text: string;
  pageCount: number;
  metadata: Record<string, string>;
  fontFamilies: string[];
  fontSizes: number[];
  ocrConfidence: number | null;
}

const normalizeText = (value: string) =>
  value
    .replace(/\u0000/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

const normalizeMetadata = (input: Record<string, unknown>) =>
  Object.fromEntries(
    Object.entries(input)
      .filter(([, value]) => value !== undefined && value !== null)
      .map(([key, value]) => [
        key,
        value instanceof Date ? value.toISOString() : String(value),
      ]),
  );

export function sha256(buffer: Buffer) {
  return `0x${crypto.createHash("sha256").update(buffer).digest("hex")}`;
}

export async function extractDocument(
  buffer: Buffer,
  mimeType: string,
): Promise<DocumentExtraction> {
  if (mimeType === "application/pdf") {
    const { extractText, extractTextItems, getDocumentProxy, getMeta } = await import(
      "unpdf"
    );
    const pdf = await getDocumentProxy(new Uint8Array(buffer));
    try {
      const [{ text, totalPages }, meta, structured] = await Promise.all([
        extractText(pdf, { mergePages: true }),
        getMeta(pdf, { parseDates: true }),
        extractTextItems(pdf),
      ]);
      const fonts = new Set<string>();
      const sizes = new Set<number>();
      structured.items.flat().forEach((item) => {
        if (item.fontFamily) fonts.add(item.fontFamily);
        if (item.fontSize) sizes.add(Math.round(item.fontSize * 10) / 10);
      });
      return {
        text: normalizeText(text),
        pageCount: totalPages,
        metadata: normalizeMetadata(meta.info),
        fontFamilies: [...fonts],
        fontSizes: [...sizes],
        ocrConfidence: null,
      };
    } finally {
      await (pdf as typeof pdf & { destroy: () => Promise<void> }).destroy();
    }
  }

  if (mimeType.startsWith("image/")) {
    const [{ recognize }, exifr] = await Promise.all([
      import("tesseract.js"),
      import("exifr"),
    ]);
    const [ocr, imageMeta] = await Promise.all([
      recognize(buffer, "eng", {
        logger: () => undefined,
        langPath: process.cwd(),
        cacheMethod: "none",
        gzip: false,
      }),
      exifr.parse(buffer).catch(() => null),
    ]);
    return {
      text: normalizeText(ocr.data.text),
      pageCount: 1,
      metadata: normalizeMetadata((imageMeta || {}) as Record<string, unknown>),
      fontFamilies: [],
      fontSizes: [],
      ocrConfidence: Math.round(ocr.data.confidence),
    };
  }

  throw new Error("Unsupported document format. Upload a PDF, PNG, JPEG, or WebP file.");
}
