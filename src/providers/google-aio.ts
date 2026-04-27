import type { ProviderResult, Citation } from "../types.ts";
import type { Provider } from "./types.ts";

const MODEL = "google-ai-overview";
const ENGINE = "google-aio";

interface AiOverview {
  page_token?: string;
  text_blocks?: { type: string; snippet?: string; list?: { snippet?: string }[] }[];
  references?: { link: string; title?: string }[];
}

interface SerpApiRaw {
  ai_overview?: AiOverview;
}

function flattenText(blocks: AiOverview["text_blocks"] = []): string {
  const parts: string[] = [];
  for (const b of blocks) {
    if (b.snippet) parts.push(b.snippet);
    for (const item of b.list ?? []) if (item.snippet) parts.push(item.snippet);
  }
  return parts.join("\n");
}

export function parseResponse(raw: SerpApiRaw, latency_ms: number): ProviderResult {
  const overview = raw.ai_overview;
  if (!overview?.text_blocks) {
    return { engine: ENGINE, model: MODEL, response_text: "", citations: [], latency_ms, raw };
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
      const searchUrl = new URL("https://serpapi.com/search.json");
      searchUrl.searchParams.set("engine", "google");
      searchUrl.searchParams.set("q", prompt);
      searchUrl.searchParams.set("api_key", this.apiKey);
      const searchRes = await fetch(searchUrl);
      if (!searchRes.ok) throw new Error(`SerpApi ${searchRes.status}`);
      const searchJson = (await searchRes.json()) as SerpApiRaw;

      const pageToken = searchJson.ai_overview?.page_token;
      if (pageToken) {
        const aioUrl = new URL("https://serpapi.com/search.json");
        aioUrl.searchParams.set("engine", "google_ai_overview");
        aioUrl.searchParams.set("page_token", pageToken);
        aioUrl.searchParams.set("api_key", this.apiKey);
        const aioRes = await fetch(aioUrl);
        if (aioRes.ok) {
          const aioJson = (await aioRes.json()) as SerpApiRaw;
          if (aioJson.ai_overview?.text_blocks) {
            return parseResponse(aioJson, Date.now() - t0);
          }
        }
      }

      return parseResponse(searchJson, Date.now() - t0);
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
