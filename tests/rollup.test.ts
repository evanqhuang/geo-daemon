import { test } from "node:test";
import assert from "node:assert/strict";
import { buildIndex } from "../src/rollup.ts";
import type { RunFile, AnalyzedResult } from "../src/types.ts";

function r(opts: {
  engine: string;
  mentioned: boolean;
  citations?: { url: string; hostname: string; is_owned: boolean }[];
}): AnalyzedResult {
  return {
    engine: opts.engine,
    model: "x",
    response_text: "",
    mentioned: opts.mentioned,
    mention_count: opts.mentioned ? 1 : 0,
    first_mention_offset: opts.mentioned ? 0 : null,
    citations: opts.citations ?? [],
    latency_ms: 0,
    error: null,
    raw: null,
  };
}

test("computes share_of_model across one run", () => {
  const run: RunFile = {
    run_id: "2026-04-26T12:00:00Z",
    queries: [
      {
        query_id: "q1",
        prompt: "p",
        category: "identity",
        results: [
          r({ engine: "perplexity", mentioned: true }),
          r({ engine: "openai", mentioned: false }),
        ],
      },
      {
        query_id: "q2",
        prompt: "p",
        category: "attribution",
        results: [
          r({ engine: "perplexity", mentioned: true }),
          r({ engine: "openai", mentioned: true }),
        ],
      },
    ],
  };
  const index = buildIndex([run]);
  // 3 mentions out of 4 slots
  assert.equal(index.summary.share_of_model, 0.75);
  assert.equal(index.summary.share_of_model_by_engine.perplexity, 1);
  assert.equal(index.summary.share_of_model_by_engine.openai, 0.5);
});

test("timeseries has one entry per run, ordered chronologically", () => {
  const runs: RunFile[] = [
    { run_id: "2026-04-19T12:00:00Z", queries: [] },
    { run_id: "2026-04-26T12:00:00Z", queries: [] },
  ];
  const index = buildIndex(runs);
  assert.equal(index.timeseries.length, 2);
  assert.equal(index.timeseries[0]!.run_id, "2026-04-19T12:00:00Z");
});

test("query history records which engines mentioned", () => {
  const run: RunFile = {
    run_id: "2026-04-26T12:00:00Z",
    queries: [
      {
        query_id: "q1",
        prompt: "p",
        category: "identity",
        results: [
          r({ engine: "perplexity", mentioned: true }),
          r({ engine: "openai", mentioned: false }),
          r({ engine: "anthropic", mentioned: true }),
        ],
      },
    ],
  };
  const index = buildIndex([run]);
  const point = index.queries.q1!.history[0]!;
  assert.deepEqual(point.engines_mentioning.sort(), ["anthropic", "perplexity"]);
});

test("citations are aggregated across runs", () => {
  const cite = { url: "https://evanqhuang.com", hostname: "evanqhuang.com", is_owned: true };
  const run: RunFile = {
    run_id: "2026-04-26T12:00:00Z",
    queries: [
      {
        query_id: "q1",
        prompt: "p",
        category: "identity",
        results: [
          r({ engine: "perplexity", mentioned: true, citations: [cite] }),
          r({ engine: "openai", mentioned: true, citations: [cite] }),
        ],
      },
    ],
  };
  const index = buildIndex([run, run]);
  assert.equal(index.citations["https://evanqhuang.com"]!.count, 4);
  assert.equal(index.citations["https://evanqhuang.com"]!.is_owned, true);
});

test("empty run list produces zero-state index", () => {
  const index = buildIndex([]);
  assert.equal(index.summary.share_of_model, 0);
  assert.equal(index.timeseries.length, 0);
  assert.deepEqual(index.queries, {});
});
