// CompareTable.jsx — Bảng so sánh các thuật toán trên cùng bản đồ.
//
// Nhận compareRows từ /compare: [{algorithm, found, optimal, stats, tree}] hoặc
// {algorithm, error}. Tô đậm (class .best) ô tốt nhất theo từng tiêu chí.
// Click 1 dòng -> onSelectAlgo(row) để mở biểu đồ f/g/h riêng.

const COLS = [
  ["Expand", "nodes_expanded"],
  ["Time(ms)", "time_ms"],
  ["Path", "path_length"],
  ["Cost", "cost"],
  ["Memory (KB)", "memory_kb"],
];

const fmt = (v) => (v === undefined || v === null ? "—" : v);

export function CompareTable({ rows, algoInfo, onSelectAlgo, selectedAlgo }) {
  if (!rows || rows.length === 0) return null;

  // Tìm giá trị tốt nhất (nhỏ nhất) mỗi cột để tô đậm.
  const best = {};
  for (const [, key] of COLS) {
    let min = Infinity;
    for (const r of rows) {
      const v = r.stats?.[key];
      if (typeof v === "number" && v < min) min = v;
    }
    best[key] = min;
  }

  const nameOf = (k) => algoInfo?.[k]?.name || k;

  return (
    <div className="crt-panel p-4">
      <h2 className="crt-label mb-3">◢ So sánh thuật toán (bấm 1 dòng xem f/g/h)</h2>
      <div className="max-h-[280px] overflow-auto">
        <table className="compare">
          <thead>
            <tr>
              <th>Thuật toán</th>
              {COLS.map(([label]) => (
                <th key={label}>{label}</th>
              ))}
              <th
                className="cursor-help"
                title="Tối ưu = đường đi có tổng chi phí nhỏ nhất. BFS/UCS/IDS luôn tối ưu; A* tối ưu khi heuristic admissible; DFS/Greedy không đảm bảo."
              >
                Optimal
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr
                key={r.algorithm}
                onClick={() => !r.error && onSelectAlgo && onSelectAlgo(r)}
                className={r.algorithm === selectedAlgo ? "row-selected" : ""}
                style={{ cursor: r.error ? "default" : "pointer" }}
              >
                <td>{nameOf(r.algorithm)}</td>
                {r.error ? (
                  <td colSpan={COLS.length + 1} className="text-left" style={{ color: "var(--color-clyde)" }}>
                    {r.error}
                  </td>
                ) : (
                  <>
                    {COLS.map(([, key]) => {
                      const v = r.stats?.[key];
                      const isBest = typeof v === "number" && v === best[key];
                      return (
                        <td key={key} className={isBest ? "best" : ""}>
                          {fmt(v)}
                        </td>
                      );
                    })}
                    <td style={{ color: r.optimal ? "var(--color-pac)" : "var(--color-clyde)" }}>
                      {r.optimal ? "✓" : "✗"}
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
