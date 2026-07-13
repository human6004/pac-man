export const ALGORITHM_GUIDE = {
  bfs: {
    strategy: "Explores layer by layer from near to far.",
    guarantee: "Complete and optimal when every step has equal cost.",
  },
  dfs: {
    strategy: "Goes deep down one branch before backtracking.",
    guarantee: "Saves frontier memory but does not guarantee an optimal path.",
  },
  ucs: {
    strategy: "Always expands the state with the lowest total cost g.",
    guarantee: "Complete and optimal when step costs are positive.",
  },
  greedy: {
    strategy: "Prioritizes the state with the smallest estimate h.",
    guarantee: "Usually fast but does not guarantee an optimal path.",
  },
  astar: {
    strategy: "Balances cost-so-far g and remaining estimate h.",
    guarantee: "Optimal when the heuristic is admissible.",
  },
};

function namesOf(rows, algoInfo) {
  return rows.map((row) => algoInfo?.[row.algorithm]?.name || row.algorithm);
}

function minimum(rows, key, algoInfo, foundOnly = false) {
  const candidates = rows.filter((row) => {
    if (foundOnly && row.found === false) return false;
    return Number.isFinite(row.stats?.[key]);
  });
  if (!candidates.length) return null;
  const value = Math.min(...candidates.map((row) => row.stats[key]));
  return {
    value,
    algorithms: namesOf(candidates.filter((row) => row.stats[key] === value), algoInfo),
  };
}

export function formatAlgorithmNames(names) {
  if (!names?.length) return "";
  if (names.length === 1) return names[0];
  if (names.length === 2) return names.join(" and ");
  return `${names.slice(0, -1).join(", ")} and ${names.at(-1)}`;
}

export function buildComparisonInsights(rows, algoInfo = {}) {
  const valid = (rows || []).filter((row) => !row.error && row.stats);
  const solved = valid.filter((row) => row.found !== false && row.stats?.found !== false);
  const optimal = namesOf(valid.filter((row) => row.optimal), algoInfo);
  const notFound = namesOf(valid.filter((row) => row.found === false || row.stats?.found === false), algoInfo);
  const errors = (rows || []).filter((row) => row.error).map((row) => ({
    algorithm: algoInfo?.[row.algorithm]?.name || row.algorithm,
    error: row.error,
  }));
  if (!valid.length) {
    return {
      validCount: 0,
      metrics: { nodes: null, frontier: null, cost: null, time: null },
      summary: "No valid results to compare.",
      optimal,
      notFound,
      errors,
    };
  }

  const metrics = {
    nodes: minimum(solved, "nodes_expanded", algoInfo),
    frontier: minimum(solved, "max_frontier", algoInfo),
    cost: minimum(solved, "cost", algoInfo),
    time: minimum(solved, "time_ms", algoInfo),
  };
  if (metrics.time) metrics.time.reference = true;

  const summary = [];
  if (metrics.nodes) summary.push(`${formatAlgorithmNames(metrics.nodes.algorithms)} expands the fewest nodes (${metrics.nodes.value}).`);
  if (metrics.frontier) summary.push(`${formatAlgorithmNames(metrics.frontier.algorithms)} uses the lowest peak frontier (${metrics.frontier.value}).`);
  if (metrics.cost) summary.push(`${formatAlgorithmNames(metrics.cost.algorithms)} has the best cost (${metrics.cost.value}).`);
  if (metrics.time) summary.push(`${formatAlgorithmNames(metrics.time.algorithms)} runs fastest in this measurement (${metrics.time.value} ms).`);

  return {
    validCount: valid.length,
    metrics,
    summary: summary.join(" ") || "No algorithm found a solution.",
    optimal,
    notFound,
    errors,
  };
}
