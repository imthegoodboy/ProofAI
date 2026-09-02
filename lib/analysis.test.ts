import { describe, expect, it } from "vitest";
import { extractFields } from "@/lib/analysis";
import { verifyEvidence } from "@/lib/evidence";

describe("extractFields", () => {
  it("extracts certificate identity fields, dates, and claims from content", () => {
    const result = extractFields(
      [
        "CERTIFICATE OF COMPLETION",
        "Northstar Institute of Technology",
        "Certificate ID: CERT-928371",
        "This certifies that Jordan Lee completed the Secure Systems program.",
        "Issued by Northstar Accreditation Council",
        "Issued on 12/05/2025",
      ].join("\n"),
      1,
    );

    expect(result.title).toBe("CERTIFICATE OF COMPLETION");
    expect(result.organization).toBe("Northstar Institute of Technology");
    expect(result.documentId).toBe("CERT-928371");
    expect(result.issuingAuthority).toBe("Northstar Accreditation Council");
    expect(result.dates).toContain("12/05/2025");
    expect(result.claims.some((claim) => claim.includes("completed"))).toBe(true);
    expect(result.pageCount).toBe(1);
  });

  it("returns null identity fields instead of inventing absent values", () => {
    const result = extractFields("A short unlabeled note without any official identifiers.", 1);

    expect(result.documentId).toBeNull();
    expect(result.organization).toBeNull();
    expect(result.issuingAuthority).toBeNull();
    expect(result.dates).toEqual([]);
  });

  it("rejects private-network evidence sources without fetching them", async () => {
    const result = await verifyEvidence(["http://127.0.0.1/internal"], {
      title: "Certificate",
      organization: "Northstar Institute",
      documentId: "CERT-928371",
      issuingAuthority: null,
      dates: [],
      claims: [],
      pageCount: 1,
    });

    expect(result[0].status).toBe("unavailable");
    expect(result[0].detail).toContain("Private network");
  });
});
