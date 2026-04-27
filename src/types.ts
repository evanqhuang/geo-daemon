export type QueryCategory = "identity" | "attribution";

export interface QueryConfig {
  id: string;
  prompt: string;
  category: QueryCategory;
}

export interface TargetConfig {
  name: string;
  aliases: string[];
  unique_handles: string[];        // aliases that are globally unique — no disambiguation needed
  domain: string;
  owned_hostnames: string[];
  disambiguation_tokens: string[]; // required co-occurrence for name-only matches
}

export interface Config {
  target: TargetConfig;
  queries: QueryConfig[];
}

export interface Citation {
  url: string;
  title?: string;
}

export interface AnalyzedCitation extends Citation {
  hostname: string;
  is_owned: boolean;
}

export interface ProviderResult {
  engine: string;
  model: string;
  response_text: string;
  citations: Citation[];
  latency_ms: number;
  raw: unknown;
  error?: string;
}

export interface AnalyzedResult {
  engine: string;
  model: string;
  response_text: string;
  mentioned: boolean;
  mention_count: number;
  first_mention_offset: number | null;
  citations: AnalyzedCitation[];
  latency_ms: number;
  error: string | null;
  raw: unknown;
}

export interface QueryRun {
  query_id: string;
  prompt: string;
  category: QueryCategory;
  results: AnalyzedResult[];
}

export interface RunFile {
  run_id: string;
  queries: QueryRun[];
}

export interface EngineMap<V> {
  [engine: string]: V;
}

export interface TimeseriesPoint {
  run_id: string;
  share_of_model: number;
  by_engine: EngineMap<number>;
}

export interface QueryHistoryPoint {
  run_id: string;
  engines_mentioning: string[];
}

export interface CitationStat {
  count: number;
  is_owned: boolean;
}

export interface IndexFile {
  last_updated: string;
  summary: {
    share_of_model: number;
    share_of_model_by_engine: EngineMap<number>;
  };
  timeseries: TimeseriesPoint[];
  queries: {
    [query_id: string]: {
      category: QueryCategory;
      history: QueryHistoryPoint[];
    };
  };
  citations: { [url: string]: CitationStat };
}
