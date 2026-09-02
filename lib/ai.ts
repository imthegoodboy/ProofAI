import { config } from "@/lib/config";
import type { ExtractedData, Finding } from "@/lib/types";

interface AiReview {
  findings: Finding[];
  additionalClaims: string[];
  scoreAdjustment: number;
}

const emptyReview: AiReview = {
  findings: [],
  additionalClaims: [],
  scoreAdjustment: 0,
};

function validSeverity(value: unknown): value is Finding["severity"] {
  return ["positive", "warning", "critical", "neutral"].includes(String(value));
}

export async function reviewWithAi(
  text: string,
  extracted: ExtractedData,
): Promise<{ provider: "openai" | "local"; review: AiReview }> {
  if (!config.openai.apiKey) return { provider: "local", review: emptyReview };

  try {
    const { default: OpenAI } = await import("openai");
    const client = new OpenAI({ apiKey: config.openai.apiKey });
    const completion = await client.chat.completions.create({
      model: config.openai.model,
      response_format: { type: "json_object" },
      temperature: 0.1,
      messages: [
        {
          role: "system",
          content:
            "You are a cautious document-consistency analyst. Analyze only the supplied text. Never declare a document authentic. Return strict JSON with keys findings, additionalClaims, scoreAdjustment. findings is an array of {severity,title,detail}; severity is positive, warning, critical, or neutral. scoreAdjustment is an integer from -10 to 10. Only flag inconsistencies supported by the text. Do not invent external evidence.",
        },
        {
          role: "user",
          content: JSON.stringify({
            documentType: extracted.title,
            extracted,
            text: text.slice(0, 30_000),
          }),
        },
      ],
    });
    const raw = completion.choices[0]?.message.content;
    if (!raw) return { provider: "local", review: emptyReview };
    const parsed = JSON.parse(raw) as Partial<AiReview>;
    const findings = Array.isArray(parsed.findings)
      ? parsed.findings
          .filter(
            (item): item is Finding =>
              Boolean(
                item &&
                  validSeverity(item.severity) &&
                  typeof item.title === "string" &&
                  typeof item.detail === "string",
              ),
          )
          .slice(0, 5)
      : [];
    const additionalClaims = Array.isArray(parsed.additionalClaims)
      ? parsed.additionalClaims.filter((item): item is string => typeof item === "string").slice(0, 5)
      : [];
    const rawAdjustment = Number(parsed.scoreAdjustment || 0);
    return {
      provider: "openai",
      review: {
        findings,
        additionalClaims,
        scoreAdjustment: Math.round(Math.max(-10, Math.min(10, rawAdjustment))),
      },
    };
  } catch (error) {
    console.error("AI review unavailable:", error);
    return { provider: "local", review: emptyReview };
  }
}
