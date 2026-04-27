import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { parseResponse } from "../../src/providers/perplexity.ts";

test("parses perplexity response into ProviderResult", async () => {
  const raw = JSON.parse(await readFile("__fixtures__/perplexity.json", "utf8"));
  const result = parseResponse(raw, 1234);
  assert.equal(result.engine, "perplexity");
  assert.equal(typeof result.response_text, "string");
  assert.ok(result.response_text.length > 0);
  assert.ok(Array.isArray(result.citations));
  assert.equal(result.latency_ms, 1234);
});
