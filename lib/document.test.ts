import { describe, expect, it } from "vitest";
import { sha256 } from "@/lib/document";

describe("sha256", () => {
  it("creates a stable prefixed document fingerprint", () => {
    expect(sha256(Buffer.from("ProofAI"))).toBe(
      "0xa50866612621daa0ce2709cb1d277d4716b3b5a0ab8b2af7cdc732094ead3ee9",
    );
  });
});
