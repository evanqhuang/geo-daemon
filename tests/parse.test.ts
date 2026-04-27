import { test } from "node:test";
import assert from "node:assert/strict";
import { analyze } from "../src/parse.ts";
import type { ProviderResult, TargetConfig } from "../src/types.ts";

const target: TargetConfig = {
  name: "Evan Huang",
  aliases: ["Evan Q. Huang", "evanqhuang"],
  unique_handles: ["evanqhuang"],
  domain: "evanqhuang.com",
  owned_hostnames: ["evanqhuang.com", "github.com", "linkedin.com"],
  disambiguation_tokens: ["cave mapping", "Brickspect", "Camazotz", "evanqhuang.com"],
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

// --- Unique handle tests (no disambiguation needed) ---

test("unique handle alone triggers mention", () => {
  const r = makeResult({ response_text: "evanqhuang built this project." });
  const a = analyze(r, target);
  assert.equal(a.mentioned, true);
  assert.equal(a.mention_count, 1);
});

test("unique handle is case-insensitive", () => {
  const r = makeResult({ response_text: "by EVANQHUANG on GitHub" });
  assert.equal(analyze(r, target).mentioned, true);
});

// --- Name + disambiguation tests ---

test("name + disambiguation token triggers mention", () => {
  const r = makeResult({ response_text: "Evan Huang is known for cave mapping work." });
  assert.equal(analyze(r, target).mentioned, true);
});

test("name alone (no disambiguation) does NOT trigger mention", () => {
  const r = makeResult({ response_text: "Evan Huang is a software engineer." });
  assert.equal(analyze(r, target).mentioned, false);
});

test("name + Brickspect triggers mention", () => {
  const r = makeResult({ response_text: "Evan Huang created Brickspect." });
  assert.equal(analyze(r, target).mentioned, true);
});

test("name + Camazotz triggers mention", () => {
  const r = makeResult({ response_text: "Evan Huang built Camazotz for underwater navigation." });
  assert.equal(analyze(r, target).mentioned, true);
});

test("name + evanqhuang.com triggers mention", () => {
  const r = makeResult({ response_text: "Visit Evan Huang at evanqhuang.com." });
  assert.equal(analyze(r, target).mentioned, true);
});

test("disambiguation token present but name absent does NOT trigger mention", () => {
  const r = makeResult({ response_text: "Camazotz is a cave mapping project." });
  assert.equal(analyze(r, target).mentioned, false);
});

// --- Alias (non-unique) tests ---

test("Evan Q. Huang alone requires disambiguation", () => {
  const r = makeResult({ response_text: "Evan Q. Huang is a researcher." });
  assert.equal(analyze(r, target).mentioned, false);
});

test("Evan Q. Huang + disambiguation token triggers mention", () => {
  const r = makeResult({ response_text: "Evan Q. Huang built Brickspect." });
  assert.equal(analyze(r, target).mentioned, true);
});

// --- Edge cases ---

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

test("counts multiple unique handle mentions", () => {
  const r = makeResult({
    response_text: "evanqhuang built X. Later evanqhuang released Y.",
  });
  assert.equal(analyze(r, target).mention_count, 2);
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
