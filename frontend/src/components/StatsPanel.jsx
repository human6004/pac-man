// StatsPanel.jsx — Bảng số liệu phosphor amber (đọc như terminal CRT).

// [nhãn, key, chú thích (hover)] — chú thích giúp người xem hiểu ý nghĩa số liệu.
const ROWS = [
  ["Trạng thái", "status", "Kết quả lần chạy: đang chạy / hoàn tất / không tìm thấy"],
  ["Node expand", "nodes_expanded", "Số node được lấy ra khỏi frontier để mở rộng"],
  ["Node sinh ra", "nodes_generated", "Số node con được tạo trong quá trình tìm kiếm"],
  ["Frontier lớn nhất", "max_frontier", "Kích thước lớn nhất của open list — đo độ phức tạp không gian (bộ nhớ)"],
  ["Thời gian (ms)", "time_ms", "Thời gian chạy thuật toán"],
  ["Độ dài đường đi", "path_length", "Số bước của lời giải tìm được"],
  ["Chi phí (cost)", "cost", "Tổng chi phí đường đi (mỗi bước = 1)"],
  ["Điểm số", "score", "Điểm trò chơi (chỉ có ở chế độ đối kháng)"],
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
          {ROWS.map(([label, key, hint]) => (
            <tr key={key}>
              <td className="stat-key py-[3px] pr-2 cursor-help" title={hint}>{label}</td>
              <td className="stat-value py-[3px] text-right">{fmt(data[key])}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
