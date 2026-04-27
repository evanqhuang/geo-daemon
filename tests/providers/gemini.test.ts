import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { parseResponse } from "../../src/providers/gemini.ts";

test("parses gemini grounding metadata", async () => {
  const raw = JSON.parse(await readFile("__fixtures__/gemini.json", "utf8"));
  const result = parseResponse(raw, 800);
  assert.equal(result.engine, "gemini");
  assert.ok(result.response_text.length > 0);
  assert.ok(result.citations.length >= 1);
});
