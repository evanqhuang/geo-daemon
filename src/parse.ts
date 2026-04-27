import type {
  AnalyzedCitation,
  AnalyzedResult,
  ProviderResult,
  TargetConfig,
} from "./types.ts";

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildRegex(terms: string[]): RegExp {
  return new RegExp(`\\b(?:${terms.map(escapeRegex).join("|")})\\b`, "gi");
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

function isMentioned(text: string, matches: RegExpMatchArray[], target: TargetConfig): boolean {
  if (matches.length === 0) return false;

  const lower = text.toLowerCase();
  const uniqueHandleSet = new Set(target.unique_handles.map((h) => h.toLowerCase()));

  // If any match is a unique handle, no disambiguation needed
  const hasUniqueHandle = matches.some((m) => uniqueHandleSet.has(m[0]!.toLowerCase()));
  if (hasUniqueHandle) return true;

  // Otherwise require a disambiguation token to appear in the text
  return target.disambiguation_tokens.some((token) =>
    lower.includes(token.toLowerCase()),
  );
}

export function analyze(
  result: ProviderResult,
  target: TargetConfig,
): AnalyzedResult {
  const allTerms = [target.name, ...target.aliases];
  const regex = buildRegex(allTerms);
  const matches = [...result.response_text.matchAll(regex)];
  const ownedSet = new Set(target.owned_hostnames);
  const mentioned = isMentioned(result.response_text, matches, target);

  return {
    engine: result.engine,
    model: result.model,
    response_text: result.response_text,
    mentioned,
    mention_count: mentioned ? matches.length : 0,
    first_mention_offset: mentioned ? (matches[0]?.index ?? null) : null,
    citations: result.citations.map((c) => ({
      ...classifyCitation(c.url, ownedSet),
      title: c.title,
    })),
    latency_ms: result.latency_ms,
    error: result.error ?? null,
    raw: result.raw,
  };
}
