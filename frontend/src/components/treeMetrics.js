const METRICS_BY_ALGORITHM = {
  bfs: ["depth", "g"],
  dfs: ["depth", "g"],
  ucs: ["g"],
  greedy: ["g", "h", "f"],
  astar: ["g", "h", "f"],
};

export function treeMetricsFor(algorithm) {
  return METRICS_BY_ALGORITHM[algorithm] || METRICS_BY_ALGORITHM.astar;
}
