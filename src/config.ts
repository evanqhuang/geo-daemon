import { readFile } from "node:fs/promises";
import { parse } from "yaml";
import type { Config, QueryCategory } from "./types.ts";

const VALID_CATEGORIES: ReadonlySet<QueryCategory> = new Set([
  "identity",
  "attribution",
]);

export async function loadConfig(path: string): Promise<Config> {
  const text = await readFile(path, "utf8");
  const parsed = parse(text) as Config;

  for (const q of parsed.queries) {
    if (!VALID_CATEGORIES.has(q.category)) {
      throw new Error(`unknown category in query ${q.id}: ${q.category}`);
    }
  }
  return parsed;
}
