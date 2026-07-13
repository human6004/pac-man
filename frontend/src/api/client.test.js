import assert from "node:assert/strict";
import test from "node:test";

import { Api } from "./client.js";

test("solve forwards AbortSignal to fetch", async () => {
  const originalFetch = globalThis.fetch;
  const controller = new AbortController();
  let request;
  globalThis.fetch = async (url, options) => {
    request = { url, options };
    return { ok: true, json: async () => ({ found: true }) };
  };

  try {
    await Api.solve({ map: "small" }, { signal: controller.signal });
    assert.equal(request.options.signal, controller.signal);
    assert.equal(request.options.method, "POST");
  } finally {
    globalThis.fetch = originalFetch;
  }
});
