import type {
  AnalyzedCitation,
  AnalyzedResult,
  ProviderResult,
  TargetConfig,
} from "./types.ts";

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildMentionRegex(target: TargetConfig): RegExp {
  const terms = [target.name, ...target.aliases].map(escapeRegex);
  return new RegExp(`\\b(?:${terms.join("|")})\\b`, "gi");
}

function classifyCitation(
  url: string,
  ownedSet: ReadonlySet<string>,
): AnalyzedCitation {
  let hostname = "";
  try {
    hostname = new URL(url).hostname;
  } catch {
    /* malformed URL → hostname stays "" */
  }
  return {
    url,
    hostname,
    is_owned: hostname !== "" && ownedSet.has(hostname),
  };
}

export function analyze(
  result: ProviderResult,
  target: TargetConfig,
): AnalyzedResult {
  const regex = buildMentionRegex(target);
  const matches = [...result.response_text.matchAll(regex)];
  const ownedSet = new Set(target.owned_hostnames);

  return {
    engine: result.engine,
    model: result.model,
    response_text: result.response_text,
    mentioned: matches.length > 0,
    mention_count: matches.length,
    first_mention_offset: matches[0]?.index ?? null,
    citations: result.citations.map((c) => ({
      ...classifyCitation(c.url, ownedSet),
      title: c.title,
    })),
    latency_ms: result.latency_ms,
    error: result.error ?? null,
    raw: result.raw,
  };
}
