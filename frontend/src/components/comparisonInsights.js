export const ALGORITHM_GUIDE = {
  bfs: {
    strategy: "Duyệt theo từng lớp từ gần đến xa.",
    guarantee: "Đầy đủ và tối ưu khi mỗi bước có cùng chi phí.",
  },
  dfs: {
    strategy: "Đi sâu một nhánh trước khi quay lui.",
    guarantee: "Tiết kiệm frontier nhưng không đảm bảo đường tối ưu.",
  },
  ucs: {
    strategy: "Luôn mở trạng thái có tổng chi phí g nhỏ nhất.",
    guarantee: "Đầy đủ và tối ưu khi chi phí bước dương.",
  },
  greedy: {
    strategy: "Ưu tiên trạng thái có ước lượng h nhỏ nhất.",
    guarantee: "Thường đi nhanh nhưng không đảm bảo đường tối ưu.",
  },
  astar: {
    strategy: "Cân bằng chi phí đã đi g và ước lượng còn lại h.",
    guarantee: "Tối ưu khi heuristic chấp nhận được.",
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
  if (names.length === 2) return names.join(" và ");
  return `${names.slice(0, -1).join(", ")} và ${names.at(-1)}`;
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
      summary: "Không có kết quả hợp lệ để so sánh.",
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
  if (metrics.nodes) summary.push(`${formatAlgorithmNames(metrics.nodes.algorithms)} mở ít node nhất (${metrics.nodes.value}).`);
  if (metrics.frontier) summary.push(`${formatAlgorithmNames(metrics.frontier.algorithms)} dùng frontier đỉnh thấp nhất (${metrics.frontier.value}).`);
  if (metrics.cost) summary.push(`${formatAlgorithmNames(metrics.cost.algorithms)} có cost tốt nhất (${metrics.cost.value}).`);
  if (metrics.time) summary.push(`${formatAlgorithmNames(metrics.time.algorithms)} chạy nhanh nhất trong lần đo này (${metrics.time.value} ms).`);

  return {
    validCount: valid.length,
    metrics,
    summary: summary.join(" ") || "Không thuật toán nào tìm được lời giải.",
    optimal,
    notFound,
    errors,
  };
}
