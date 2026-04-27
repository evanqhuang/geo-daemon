import Anthropic from "@anthropic-ai/sdk";
import type { ProviderResult, Citation } from "../types.ts";
import type { Provider } from "./types.ts";

const MODEL = "claude-haiku-4-5-20251001";
const ENGINE = "anthropic";

interface AnthropicCitation {
  type: string;
  url?: string;
  title?: string;
}

interface AnthropicTextBlock {
  type: "text";
  text: string;
  citations?: AnthropicCitation[];
}

interface AnthropicRawBlock {
  type: string;
  text?: string;
  citations?: AnthropicCitation[];
  [key: string]: unknown;
}

interface AnthropicRaw {
  content: AnthropicRawBlock[];
}

export function parseResponse(
  raw: AnthropicRaw,
  latency_ms: number,
): ProviderResult {
  const textBlocks = raw.content.filter(
    (b): b is AnthropicTextBlock & AnthropicRawBlock => b.type === "text",
  );
  const text = textBlocks.map((b) => b.text).join("\n");
  const citations: Citation[] = [];
  for (const b of textBlocks) {
    for (const c of b.citations ?? []) {
      if (c.url) citations.push({ url: c.url, title: c.title });
    }
  }
  return {
    engine: ENGINE,
    model: MODEL,
    response_text: text,
    citations,
    latency_ms,
    raw,
  };
}

export class AnthropicProvider implements Provider {
  name = ENGINE;
  private client: Anthropic;

  constructor(apiKey: string) {
    this.client = new Anthropic({ apiKey });
  }

  async query(prompt: string): Promise<ProviderResult> {
    const t0 = Date.now();
    try {
      const message = await this.client.messages.create({
        model: MODEL,
        max_tokens: 1024,
        messages: [{ role: "user", content: prompt }],
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        tools: [{ type: "web_search_20250305", name: "web_search" }] as any,
      });
      return parseResponse(
        message as unknown as AnthropicRaw,
        Date.now() - t0,
      );
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
