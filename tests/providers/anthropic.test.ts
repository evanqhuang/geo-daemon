import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { parseResponse } from "../../src/providers/anthropic.ts";

test("parses anthropic response with web_search citations", async () => {
  const raw = JSON.parse(await readFile("__fixtures__/anthropic.json", "utf8"));
  const result = parseResponse(raw, 1500);
  assert.equal(result.engine, "anthropic");
  assert.ok(result.response_text.length > 0);
  assert.ok(result.citations.length >= 1);
});
