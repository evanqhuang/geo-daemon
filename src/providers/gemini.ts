import { GoogleGenAI } from "@google/genai";
import type { ProviderResult, Citation } from "../types.ts";
import type { Provider } from "./types.ts";

const MODEL = "gemini-2.5-flash";
const ENGINE = "gemini";

interface GeminiRaw {
  candidates: {
    content: { parts: { text?: string }[] };
    groundingMetadata?: {
      groundingChunks?: { web?: { uri: string; title?: string } }[];
    };
  }[];
}

export function parseResponse(
  raw: GeminiRaw,
  latency_ms: number,
): ProviderResult {
  const cand = raw.candidates[0];
  const text = (cand?.content.parts ?? [])
    .map((p) => p.text ?? "")
    .join("");
  const chunks = cand?.groundingMetadata?.groundingChunks ?? [];
  const citations: Citation[] = chunks
    .filter((c) => c.web?.uri)
    .map((c) => ({ url: c.web!.uri, title: c.web!.title }));
  return {
    engine: ENGINE,
    model: MODEL,
    response_text: text,
    citations,
    latency_ms,
    raw,
  };
}

export class GeminiProvider implements Provider {
  name = ENGINE;
  private ai: GoogleGenAI;

  constructor(apiKey: string) {
    this.ai = new GoogleGenAI({ apiKey });
  }

  async query(prompt: string): Promise<ProviderResult> {
    const t0 = Date.now();
    try {
      const response = await this.ai.models.generateContent({
        model: MODEL,
        contents: prompt,
        config: { tools: [{ googleSearch: {} }] },
      });
      return parseResponse(response as unknown as GeminiRaw, Date.now() - t0);
    } catch (err) {
      return {
        engine: ENGINE,
        model: MODEL,
        response_text: "",
        citations: [],
        latency_ms: Date.now() - t0,
        raw: null,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }
}
