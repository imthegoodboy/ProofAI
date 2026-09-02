import dns from "node:dns/promises";
import net from "node:net";
import type { EvidenceResult, ExtractedData } from "@/lib/types";

function isPrivateAddress(address: string) {
  if (net.isIPv4(address)) {
    const [a, b] = address.split(".").map(Number);
    return (
      a === 10 ||
      a === 127 ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      a === 0
    );
  }
  const normalized = address.toLowerCase();
  return (
    normalized === "::1" ||
    normalized === "::" ||
    normalized.startsWith("fc") ||
    normalized.startsWith("fd") ||
    normalized.startsWith("fe80")
  );
}

async function assertPublicUrl(rawUrl: string) {
  const url = new URL(rawUrl);
  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new Error("Only public HTTP or HTTPS evidence links are supported.");
  }
  if (url.username || url.password) throw new Error("Credentialed URLs are not allowed.");
  const addresses = await dns.lookup(url.hostname, { all: true });
  if (!addresses.length || addresses.some((entry) => isPrivateAddress(entry.address))) {
    throw new Error("Private network evidence links are not allowed.");
  }
  return url;
}

async function fetchPublicSource(rawUrl: string) {
  let url = await assertPublicUrl(rawUrl);
  for (let redirects = 0; redirects <= 3; redirects += 1) {
    const response = await fetch(url, {
      redirect: "manual",
      signal: AbortSignal.timeout(8_000),
      headers: { "User-Agent": "ProofAI-Evidence-Agent/1.0" },
    });
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location) throw new Error("Evidence source returned an invalid redirect.");
      if (redirects === 3) throw new Error("Evidence source redirected too many times.");
      url = await assertPublicUrl(new URL(location, url).toString());
      continue;
    }
    return { response, url };
  }
  throw new Error("Evidence source redirected too many times.");
}

async function readLimitedText(response: Response, limit = 1_000_000) {
  const declaredLength = Number(response.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > limit) {
    throw new Error("Evidence source is too large to inspect safely.");
  }
  if (!response.body) return "";
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let total = 0;
  let result = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > limit) {
      await reader.cancel();
      throw new Error("Evidence source is too large to inspect safely.");
    }
    result += decoder.decode(value, { stream: true });
  }
  return result + decoder.decode();
}

const plainText = (html: string) =>
  html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ")
    .toLowerCase();

export async function verifyEvidence(
  urls: string[],
  data: ExtractedData,
): Promise<EvidenceResult[]> {
  return Promise.all(
    urls.slice(0, 3).map(async (rawUrl): Promise<EvidenceResult> => {
      let host = rawUrl;
      try {
        const { response, url } = await fetchPublicSource(rawUrl);
        host = url.hostname.replace(/^www\./, "");
        if (!response.ok) throw new Error(`Source returned HTTP ${response.status}.`);
        const type = response.headers.get("content-type") || "";
        if (!type.includes("text/") && !type.includes("json")) {
          throw new Error("Source is not a readable text page.");
        }
        const sourceText = plainText(await readLimitedText(response));
        const candidates = [
          ["Document ID", data.documentId],
          ["Organization", data.organization],
          ["Issuer", data.issuingAuthority],
        ] as const;
        const comparable = candidates.filter(([, value]) => value && value.length >= 3);
        const matchedFields = comparable
          .filter(([, value]) => sourceText.includes(value!.toLowerCase()))
          .map(([label]) => label);
        const status =
          comparable.length === 0
            ? "unavailable"
            : matchedFields.length === comparable.length
              ? "confirmed"
              : matchedFields.length > 0
                ? "partial"
                : "mismatch";
        const detail =
          status === "confirmed"
            ? "All comparable document fields were present on this source."
            : status === "partial"
              ? `${matchedFields.length} of ${comparable.length} comparable fields matched.`
              : status === "mismatch"
                ? "The source loaded, but no comparable identity fields matched."
                : "The document did not contain enough identity fields to compare.";
        return { url: url.toString(), host, status, matchedFields, detail };
      } catch (error) {
        return {
          url: rawUrl,
          host,
          status: "unavailable",
          matchedFields: [],
          detail: error instanceof Error ? error.message : "Evidence source unavailable.",
        };
      }
    }),
  );
}
