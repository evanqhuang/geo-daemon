import OpenAI from "openai";
import type { ProviderResult, Citation } from "../types.ts";
import type { Provider } from "./types.ts";

const MODEL = "gpt-4o-mini-search-preview";
const ENGINE = "openai";

interface OpenAIRaw {
  choices: {
    message: {
      content: string;
      annotations?: { type: string; url_citation?: { url: string; title?: string } }[];
    };
  }[];
}

export function parseResponse(raw: OpenAIRaw, latency_ms: number): ProviderResult {
  const msg = raw.choices[0]?.message;
  const text = msg?.content ?? "";
  const citations: Citation[] =
    msg?.annotations
      ?.filter((a) => a.type === "url_citation" && a.url_citation)
      .map((a) => ({ url: a.url_citation!.url, title: a.url_citation!.title })) ??
    [];
  return { engine: ENGINE, model: MODEL, response_text: text, citations, latency_ms, raw };
}

export class OpenAIProvider implements Provider {
  name = ENGINE;
  private client: OpenAI;

  constructor(apiKey: string) {
    this.client = new OpenAI({ apiKey });
  }

  async query(prompt: string): Promise<ProviderResult> {
    const t0 = Date.now();
    try {
      const completion = await this.client.chat.completions.create({
        model: MODEL,
        messages: [{ role: "user", content: prompt }],
      });
      return parseResponse(completion as unknown as OpenAIRaw, Date.now() - t0);
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
