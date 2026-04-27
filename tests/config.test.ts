import { test } from "node:test";
import assert from "node:assert/strict";
import { loadConfig } from "../src/config.ts";

test("loadConfig parses queries.yaml", async () => {
  const config = await loadConfig("queries.yaml");
  assert.equal(config.target.name, "Evan Huang");
  assert.equal(config.queries.length, 8);
  assert.equal(config.queries[0]!.id, "who-is-evan-huang");
  assert.equal(config.queries[0]!.category, "identity");
});

test("loadConfig rejects unknown category", async () => {
  await assert.rejects(
    () => loadConfig("tests/fixtures/bad-category.yaml"),
    /unknown category/i,
  );
});
