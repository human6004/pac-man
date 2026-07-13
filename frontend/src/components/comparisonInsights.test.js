import assert from "node:assert/strict";
import test from "node:test";

import { buildComparisonInsights } from "./comparisonInsights.js";

const algoInfo = {
  bfs: { name: "BFS" },
  astar: { name: "A*" },
  greedy: { name: "Greedy" },
};

test("comparison insights ignore failed rows and keep ties", () => {
  const rows = [
    { algorithm: "bfs", found: true, optimal: true, stats: { nodes_expanded: 12, max_frontier: 8, cost: 6, time_ms: 3 } },
    { algorithm: "astar", found: true, optimal: true, stats: { nodes_expanded: 7, max_frontier: 5, cost: 6, time_ms: 2 } },
    { algorithm: "greedy", found: false, optimal: false, stats: { nodes_expanded: 1, max_frontier: 1, cost: 0, time_ms: 0.5 } },
  ];
  const result = buildComparisonInsights(rows, algoInfo);

  assert.deepEqual(result.metrics.nodes.algorithms, ["A*"]);
  assert.deepEqual(result.metrics.cost.algorithms, ["BFS", "A*"]);
  assert.equal(result.metrics.frontier.value, 5);
  assert.deepEqual(result.metrics.time.algorithms, ["A*"]);
  assert.equal(result.metrics.time.reference, true);
  assert.deepEqual(result.optimal, ["BFS", "A*"]);
  assert.deepEqual(result.notFound, ["Greedy"]);
});

test("comparison insights handle missing metrics and no successful result", () => {
  const partial = buildComparisonInsights([
    { algorithm: "bfs", found: false, optimal: true, stats: { nodes_expanded: 4 } },
    { algorithm: "astar", error: "timeout" },
  ], algoInfo);
  assert.equal(partial.metrics.cost, null);
  assert.equal(partial.metrics.frontier, null);

  const failed = buildComparisonInsights([{ algorithm: "astar", error: "timeout" }], algoInfo);
  assert.equal(failed.validCount, 0);
  assert.match(failed.summary, /không có kết quả hợp lệ/i);
});

test("comparison insights join multiple tied algorithms as natural Vietnamese", () => {
  const rows = ["bfs", "astar", "greedy"].map((algorithm) => ({
    algorithm,
    found: true,
    stats: { nodes_expanded: 3, max_frontier: 2, cost: 4, time_ms: 1 },
  }));

  assert.match(buildComparisonInsights(rows, algoInfo).summary, /BFS, A\* và Greedy/);
});
