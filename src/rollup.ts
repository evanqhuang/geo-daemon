import type {
  IndexFile,
  RunFile,
  TimeseriesPoint,
  QueryHistoryPoint,
  EngineMap,
  CitationStat,
} from "./types.ts";

function pointFor(run: RunFile): TimeseriesPoint {
  let total = 0;
  let mentioned = 0;
  const byEngineMentioned: EngineMap<number> = {};
  const byEngineTotal: EngineMap<number> = {};

  for (const q of run.queries) {
    for (const result of q.results) {
      total += 1;
      byEngineTotal[result.engine] = (byEngineTotal[result.engine] ?? 0) + 1;
      if (result.mentioned) {
        mentioned += 1;
        byEngineMentioned[result.engine] =
          (byEngineMentioned[result.engine] ?? 0) + 1;
      }
    }
  }

  const by_engine: EngineMap<number> = {};
  for (const engine of Object.keys(byEngineTotal)) {
    by_engine[engine] = (byEngineMentioned[engine] ?? 0) / byEngineTotal[engine]!;
  }

  return {
    run_id: run.run_id,
    share_of_model: total === 0 ? 0 : mentioned / total,
    by_engine,
  };
}

export function buildIndex(runs: RunFile[]): IndexFile {
  const sorted = [...runs].sort((a, b) => a.run_id.localeCompare(b.run_id));
  const timeseries = sorted.map(pointFor);

  const last = timeseries.at(-1);
  const summary = last
    ? {
        share_of_model: last.share_of_model,
        share_of_model_by_engine: last.by_engine,
      }
    : { share_of_model: 0, share_of_model_by_engine: {} };

  const queries: IndexFile["queries"] = {};
  for (const run of sorted) {
    for (const q of run.queries) {
      const entry =
        queries[q.query_id] ?? (queries[q.query_id] = {
          category: q.category,
          history: [] as QueryHistoryPoint[],
        });
      entry.history.push({
        run_id: run.run_id,
        engines_mentioning: q.results
          .filter((r) => r.mentioned)
          .map((r) => r.engine),
      });
    }
  }

  const citations: IndexFile["citations"] = {};
  for (const run of sorted) {
    for (const q of run.queries) {
      for (const result of q.results) {
        for (const c of result.citations) {
          const stat: CitationStat = citations[c.url] ?? {
            count: 0,
            is_owned: c.is_owned,
          };
          stat.count += 1;
          citations[c.url] = stat;
        }
      }
    }
  }

  return {
    last_updated: last?.run_id ?? new Date(0).toISOString(),
    summary,
    timeseries,
    queries,
    citations,
  };
}
