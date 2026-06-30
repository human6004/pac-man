// CompareTable.jsx — Bảng so sánh các thuật toán trên cùng bản đồ.
//
// Nhận compareRows từ /compare: [{algorithm, found, stats}] hoặc {algorithm, error}.
// Tô đậm (class .best) ô tốt nhất theo từng tiêu chí: ít node expand nhất,
// nhanh nhất, path ngắn nhất, cost thấp nhất.

const COLS = [
  ["Expand", "nodes_expanded"],
  ["Time(ms)", "time_ms"],
  ["Path", "path_length"],
  ["Cost", "cost"],
];

const fmt = (v) => (v === undefined || v === null ? "—" : v);

export function CompareTable({ rows, algoInfo }) {
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
      <h2 className="crt-label mb-3">◢ So sánh thuật toán</h2>
      <div className="max-h-[280px] overflow-auto">
        <table className="compare">
          <thead>
            <tr>
              <th>Thuật toán</th>
              {COLS.map(([label]) => (
                <th key={label}>{label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.algorithm}>
                <td>{nameOf(r.algorithm)}</td>
                {r.error ? (
                  <td colSpan={COLS.length} className="text-left" style={{ color: "var(--color-clyde)" }}>
                    {r.error}
                  </td>
                ) : (
                  COLS.map(([, key]) => {
                    const v = r.stats?.[key];
                    const isBest = typeof v === "number" && v === best[key];
                    return (
                      <td key={key} className={isBest ? "best" : ""}>
                        {fmt(v)}
                      </td>
                    );
                  })
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
