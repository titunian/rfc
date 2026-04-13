// ── AI-powered document analysis via Claude API ─────────────────
//
// Sends markdown content to the Anthropic Messages API and returns
// structured tags, concept entities, and a brief summary.

export interface AIAnalysisResult {
  tags: string[];
  concepts: Array<{
    name: string;
    type: "system" | "decision" | "pattern" | "question" | "person";
    context: string;
    importance: "high" | "medium" | "low";
  }>;
  summary: string;
}

const EMPTY_RESULT: AIAnalysisResult = { tags: [], concepts: [], summary: "" };

const SYSTEM_PROMPT = `You are a technical document analyzer. Extract key concepts, tags, and a brief summary from this markdown document. Return JSON only.

Return a JSON object with exactly these fields:
- "tags": an array of 5-15 key topic tags (lowercase, hyphenated, e.g. "event-sourcing", "api-design")
- "concepts": an array of key entities, each with:
  - "name": short entity name
  - "type": one of "system", "decision", "pattern", "question", "person"
  - "context": a 1-sentence explanation of why this concept matters in the document
  - "importance": one of "high", "medium", "low"
- "summary": a 1-2 sentence summary of the document

Return ONLY valid JSON, no markdown fences, no commentary.`;

/**
 * Call the Anthropic Messages API to deeply analyze a markdown document.
 * Returns an empty result on any failure (network, auth, parse).
 */
export async function analyzeWithClaude(
  content: string,
  apiKey: string,
): Promise<AIAnalysisResult> {
  try {
    // Truncate to first 8000 chars to keep costs low
    const truncated = content.slice(0, 8000);

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 2048,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: "user",
            content: truncated,
          },
        ],
      }),
    });

    if (!res.ok) {
      console.error("[ai-analyze] API error:", res.status, await res.text());
      return EMPTY_RESULT;
    }

    const body = await res.json();

    // The response content is an array of blocks; grab the first text block.
    const textBlock = body?.content?.find(
      (b: { type: string }) => b.type === "text",
    );
    if (!textBlock?.text) return EMPTY_RESULT;

    const parsed = JSON.parse(textBlock.text) as AIAnalysisResult;

    // Basic shape validation
    if (!Array.isArray(parsed.tags)) parsed.tags = [];
    if (!Array.isArray(parsed.concepts)) parsed.concepts = [];
    if (typeof parsed.summary !== "string") parsed.summary = "";

    return parsed;
  } catch (err) {
    console.error("[ai-analyze] failed:", err);
    return EMPTY_RESULT;
  }
}
