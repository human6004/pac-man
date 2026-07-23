const METRICS_BY_ALGORITHM = {
  bfs: ["depth"],
  dfs: ["depth"],
  ucs: ["g"],
  // greedy: ["h", "f"],
  // greedy: ["h"],
  greedy: ["f", "g", "h"],
  astar: ["f", "g", "h"],
};

export function treeMetricsFor(algorithm) {
  return METRICS_BY_ALGORITHM[algorithm] || METRICS_BY_ALGORITHM.astar;
}
