import assert from "node:assert/strict";
import test from "node:test";

import { treeMetricsFor } from "./treeMetrics.js";

test("tree metrics match each algorithm's priority", () => {
  assert.deepEqual(treeMetricsFor("bfs"), ["depth"]);
  assert.deepEqual(treeMetricsFor("dfs"), ["depth"]);
  assert.deepEqual(treeMetricsFor("ucs"), ["g"]);
  assert.deepEqual(treeMetricsFor("greedy"), ["h"]);
  assert.deepEqual(treeMetricsFor("astar"), ["g", "h", "f"]);
});
