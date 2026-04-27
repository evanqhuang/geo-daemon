import { test } from "node:test";
import assert from "node:assert/strict";
import { analyze } from "../src/parse.ts";
import type { ProviderResult, TargetConfig } from "../src/types.ts";

const target: TargetConfig = {
  name: "Evan Huang",
  aliases: ["Evan Q. Huang", "evanqhuang"],
  domain: "evanqhuang.com",
  owned_hostnames: ["evanqhuang.com", "github.com", "linkedin.com"],
};

function makeResult(over: Partial<ProviderResult> = {}): ProviderResult {
  return {
    engine: "test",
    model: "test",
    response_text: "",
    citations: [],
    latency_ms: 0,
    raw: null,
    ...over,
  };
}

test("detects exact name mention", () => {
  const r = makeResult({ response_text: "Evan Huang is a software engineer." });
  const a = analyze(r, target);
  assert.equal(a.mentioned, true);
  assert.equal(a.mention_count, 1);
  assert.equal(a.first_mention_offset, 0);
});

test("counts multiple mentions", () => {
  const r = makeResult({
    response_text: "Evan Huang built X. Then Evan Huang built Y.",
  });
  assert.equal(analyze(r, target).mention_count, 2);
});

test("matches case-insensitively", () => {
  const r = makeResult({ response_text: "evan huang is great" });
  assert.equal(analyze(r, target).mentioned, true);
});

test("matches aliases", () => {
  const r = makeResult({ response_text: "by evanqhuang on github" });
  assert.equal(analyze(r, target).mentioned, true);
});

test("does not match substrings", () => {
  const r = makeResult({ response_text: "Devan Huangford does not count" });
  assert.equal(analyze(r, target).mentioned, false);
});

test("returns mentioned=false on empty text", () => {
  const a = analyze(makeResult({ response_text: "" }), target);
  assert.equal(a.mentioned, false);
  assert.equal(a.mention_count, 0);
  assert.equal(a.first_mention_offset, null);
});

test("classifies owned and external citations", () => {
  const r = makeResult({
    citations: [
      { url: "https://evanqhuang.com/about" },
      { url: "https://github.com/evanqhuang/portfolio" },
      { url: "https://news.ycombinator.com/item?id=1" },
    ],
  });
  const a = analyze(r, target);
  assert.equal(a.citations[0]!.is_owned, true);
  assert.equal(a.citations[0]!.hostname, "evanqhuang.com");
  assert.equal(a.citations[1]!.is_owned, true);
  assert.equal(a.citations[2]!.is_owned, false);
  assert.equal(a.citations[2]!.hostname, "news.ycombinator.com");
});

test("handles malformed citation urls gracefully", () => {
  const r = makeResult({ citations: [{ url: "not a url" }] });
  const a = analyze(r, target);
  assert.equal(a.citations[0]!.hostname, "");
  assert.equal(a.citations[0]!.is_owned, false);
});

test("propagates error field", () => {
  const r = makeResult({ error: "boom" });
  const a = analyze(r, target);
  assert.equal(a.error, "boom");
});
