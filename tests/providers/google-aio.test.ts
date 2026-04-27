import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { parseResponse } from "../../src/providers/google-aio.ts";

test("parses serpapi ai_overview with text_blocks", async () => {
  const raw = JSON.parse(await readFile("__fixtures__/google-aio.json", "utf8"));
  const result = parseResponse(raw, 600);
  assert.equal(result.engine, "google-aio");
  assert.ok(result.response_text.length > 0);
  assert.ok(result.citations.length >= 1);
});

test("handles missing ai_overview gracefully", () => {
  const result = parseResponse({}, 600);
  assert.equal(result.engine, "google-aio");
  assert.equal(result.response_text, "");
  assert.equal(result.citations.length, 0);
  assert.equal(result.error, undefined);
});

test("handles page_token-only ai_overview (no text yet)", () => {
  const result = parseResponse({ ai_overview: { page_token: "abc123" } }, 600);
  assert.equal(result.engine, "google-aio");
  assert.equal(result.response_text, "");
  assert.equal(result.citations.length, 0);
  assert.equal(result.error, undefined);
});
