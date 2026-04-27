import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { parseArgs } from "node:util";
import { loadConfig } from "./config.ts";
import { analyze } from "./parse.ts";
import { buildIndex } from "./rollup.ts";
import { OpenAIProvider } from "./providers/openai.ts";
import { AnthropicProvider } from "./providers/anthropic.ts";
import { GeminiProvider } from "./providers/gemini.ts";
import { GoogleAIOProvider } from "./providers/google-aio.ts";
import type { Provider } from "./providers/types.ts";
import type { RunFile, QueryRun, AnalyzedResult } from "./types.ts";

const RUNS_DIR = "data/runs";

function envOrThrow(key: string): string {
  const v = process.env[key];
  if (!v) throw new Error(`missing env var ${key}`);
  return v;
}

function buildProviders(filter: Set<string> | null): Provider[] {
  const all: Provider[] = [
    new OpenAIProvider(envOrThrow("OPENAI_API_KEY")),
    new AnthropicProvider(envOrThrow("ANTHROPIC_API_KEY")),
    new GeminiProvider(envOrThrow("GEMINI_API_KEY")),
    new GoogleAIOProvider(envOrThrow("SERPAPI_API_KEY")),
  ];
  if (!filter) return all;
  return all.filter((p) => filter.has(p.name));
}

async function loadAllRuns(): Promise<RunFile[]> {
  try {
    const files = await readdir(RUNS_DIR);
    const runs: RunFile[] = [];
    for (const f of files) {
      if (f === "index.json" || !f.endsWith(".json")) continue;
      runs.push(JSON.parse(await readFile(join(RUNS_DIR, f), "utf8")));
    }
    return runs;
  } catch {
    return [];
  }
}

async function main() {
  const { values } = parseArgs({
    options: {
      "dry-run": { type: "boolean", default: false },
      only: { type: "string" },
    },
  });
  const dryRun = values["dry-run"] ?? false;
  const onlyFilter = values.only ? new Set(values.only.split(",")) : null;

  const config = await loadConfig("queries.yaml");
  const providers = buildProviders(onlyFilter);
  const run_id = new Date().toISOString();

  const queries: QueryRun[] = [];
  for (const q of config.queries) {
    console.log(`[${q.id}] ${q.prompt}`);
    const results: AnalyzedResult[] = [];
    for (const provider of providers) {
      const raw = await provider.query(q.prompt);
      const a = analyze(raw, config.target);
      console.log(`  ${provider.name}: mentioned=${a.mentioned} latency=${a.latency_ms}ms${a.error ? ` ERROR=${a.error}` : ""}`);
      results.push(a);
    }
    queries.push({ query_id: q.id, prompt: q.prompt, category: q.category, results });
  }

  const run: RunFile = { run_id, queries };

  if (dryRun) {
    console.log("DRY RUN — not writing");
    return;
  }

  await mkdir(RUNS_DIR, { recursive: true });
  const dateOnly = run_id.slice(0, 10);
  await writeFile(join(RUNS_DIR, `${dateOnly}.json`), JSON.stringify(run, null, 2));
  const allRuns = await loadAllRuns();
  const index = buildIndex(allRuns);
  await writeFile(join(RUNS_DIR, "index.json"), JSON.stringify(index, null, 2));
  console.log(`wrote ${dateOnly}.json and index.json`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
