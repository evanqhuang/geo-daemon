import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { parseResponse } from "../../src/providers/openai.ts";

test("parses openai response with url_citation annotations", async () => {
  const raw = JSON.parse(await readFile("__fixtures__/openai.json", "utf8"));
  const result = parseResponse(raw, 999);
  assert.equal(result.engine, "openai");
  assert.ok(result.response_text.length > 0);
  assert.ok(result.citations.every((c) => c.url.startsWith("http")));
});
