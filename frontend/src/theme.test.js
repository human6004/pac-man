import assert from "node:assert/strict";
import test from "node:test";

import { resolveTheme } from "./theme.js";

test("theme uses a stored choice before the system preference", () => {
  assert.equal(resolveTheme("light", true), "light");
  assert.equal(resolveTheme("dark", false), "dark");
});

test("theme falls back to the system when storage is empty or invalid", () => {
  assert.equal(resolveTheme(null, true), "dark");
  assert.equal(resolveTheme("invalid", false), "light");
});
