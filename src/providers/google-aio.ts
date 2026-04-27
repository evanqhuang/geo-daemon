import type { ProviderResult, Citation } from "../types.ts";
import type { Provider } from "./types.ts";

const MODEL = "google-ai-overview";
const ENGINE = "google-aio";

interface SerpApiRaw {
  ai_overview?: {
    text_blocks?: { type: string; snippet?: string; list?: { snippet?: string }[] }[];
    references?: { link: string; title?: string }[];
  };
}

function flattenText(blocks: NonNullable<SerpApiRaw["ai_overview"]>["text_blocks"] = []): string {
  const parts: string[] = [];
  for (const b of blocks) {
    if (b.snippet) parts.push(b.snippet);
    for (const item of b.list ?? []) if (item.snippet) parts.push(item.snippet);
  }
  return parts.join("\n");
}

export function parseResponse(raw: SerpApiRaw, latency_ms: number): ProviderResult {
  const overview = raw.ai_overview;
  if (!overview) {
    return {
      engine: ENGINE,
      model: MODEL,
      response_text: "",
      citations: [],
      latency_ms,
      raw,
    };
  }
  const text = flattenText(overview.text_blocks);
  const citations: Citation[] = (overview.references ?? []).map((r) => ({
    url: r.link,
    title: r.title,
  }));
  return { engine: ENGINE, model: MODEL, response_text: text, citations, latency_ms, raw };
}

export class GoogleAIOProvider implements Provider {
  name = ENGINE;
  constructor(private apiKey: string) {}

  async query(prompt: string): Promise<ProviderResult> {
    const t0 = Date.now();
    try {
      const url = new URL("https://serpapi.com/search.json");
      url.searchParams.set("engine", "google");
      url.searchParams.set("q", prompt);
      url.searchParams.set("api_key", this.apiKey);
      const res = await fetch(url);
      if (!res.ok) throw new Error(`SerpApi ${res.status}`);
      const json = (await res.json()) as SerpApiRaw;
      return parseResponse(json, Date.now() - t0);
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
