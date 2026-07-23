import assert from "node:assert/strict";
import test from "node:test";
import { parseImportedMap } from "./mapImport.js";

test("accepts a 4x4 map with one Pac-Man and at most seven dots", () => {
  assert.equal(parseImportedMap("P...\n%%%%\n%%%%\n%%%%\n"), "P...\n%%%%\n%%%%\n%%%%");
});

test("rejects invalid imported maps", () => {
  assert.throws(() => parseImportedMap("P...\n%%%%\n%%%%"), /4x4/);
  assert.throws(() => parseImportedMap("P...\nP%%%\n%%%%\n%%%%"), /exactly one P/);
  assert.throws(() => parseImportedMap("P.......\n........\n%%%%%%%%\n%%%%%%%%"), /at most 7/);
});
