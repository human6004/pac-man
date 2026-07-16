const METRICS_BY_ALGORITHM = {
  bfs: ["depth"],
  dfs: ["depth"],
  ucs: ["g"],
  greedy: ["h"],
  astar: ["g", "h", "f"],
};

export function treeMetricsFor(algorithm) {
  return METRICS_BY_ALGORITHM[algorithm] || METRICS_BY_ALGORITHM.astar;
}
