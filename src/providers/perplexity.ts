import OpenAI from "openai";
import type { ProviderResult, Citation } from "../types.ts";
import type { Provider } from "./types.ts";

const MODEL = "sonar-pro";
const ENGINE = "perplexity";

interface PerplexityRaw {
  citations?: string[];
  choices: { message: { content: string } }[];
}

export function parseResponse(raw: PerplexityRaw, latency_ms: number): ProviderResult {
  const text = raw.choices[0]?.message.content ?? "";
  const citations: Citation[] = (raw.citations ?? []).map((url) => ({ url }));
  return {
    engine: ENGINE,
    model: MODEL,
    response_text: text,
    citations,
    latency_ms,
    raw,
  };
}

export class PerplexityProvider implements Provider {
  name = ENGINE;
  private client: OpenAI;

  constructor(apiKey: string) {
    this.client = new OpenAI({
      apiKey,
      baseURL: "https://api.perplexity.ai",
    });
  }

  async query(prompt: string): Promise<ProviderResult> {
    const t0 = Date.now();
    try {
      const completion = await this.client.chat.completions.create({
        model: MODEL,
        messages: [{ role: "user", content: prompt }],
      });
      return parseResponse(completion as unknown as PerplexityRaw, Date.now() - t0);
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
