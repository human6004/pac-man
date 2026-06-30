// StatsPanel.jsx — Bảng số liệu phosphor amber (đọc như terminal CRT).

const ROWS = [
  ["Trạng thái", "status"],
  ["Node expand", "nodes_expanded"],
  ["Node sinh ra", "nodes_generated"],
  ["Frontier lớn nhất", "max_frontier"],
  ["Thời gian (ms)", "time_ms"],
  ["Độ dài đường đi", "path_length"],
  ["Chi phí (cost)", "cost"],
  ["Điểm số", "score"],
];

const fmt = (v) => (v === undefined || v === null ? "—" : v);

export function StatsPanel({ status, stats, scoreStat }) {
  const data = {
    status,
    nodes_expanded: stats?.nodes_expanded,
    nodes_generated: stats?.nodes_generated,
    max_frontier: stats?.max_frontier,
    time_ms: stats?.time_ms,
    path_length: stats?.path_length,
    cost: stats?.cost,
    score: scoreStat,
  };

  return (
    <div className="crt-panel p-4">
      <h2 className="crt-label mb-3">◢ Score Panel</h2>
      <table className="stat-grid w-full text-[20px] leading-tight">
        <tbody>
          {ROWS.map(([label, key]) => (
            <tr key={key}>
              <td className="stat-key py-[3px] pr-2">{label}</td>
              <td className="stat-value py-[3px] text-right">{fmt(data[key])}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
