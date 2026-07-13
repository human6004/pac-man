import { buildComparisonInsights } from "./comparisonInsights";

const COLUMNS = [
  ["Cost", "cost"],
  ["Số bước", "path_length"],
  ["Node mở rộng", "nodes_expanded"],
  ["Node sinh ra", "nodes_generated"],
  ["Frontier lớn nhất", "max_frontier"],
  ["Thời gian (ms)", "time_ms"],
];

const format = (value) => value == null ? "-" : value;

export function CompareTable({ rows, algoInfo }) {
  if (!rows?.length) return null;
  const insights = buildComparisonInsights(rows, algoInfo);
  const bestKeys = {
    cost: insights.metrics.cost,
    nodes_expanded: insights.metrics.nodes,
    max_frontier: insights.metrics.frontier,
    time_ms: insights.metrics.time,
  };
  const nameOf = (key) => algoInfo?.[key]?.name || key;

  return (
    <section className="lab-panel comparison-table-panel" aria-labelledby="comparison-table-title">
      <div className="panel-heading compact-heading">
        <div>
          <p className="section-kicker">Số liệu đầy đủ</p>
          <h2 id="comparison-table-title">Bảng so sánh</h2>
        </div>
      </div>
      <p className="metric-glossary">
        Node mở rộng là trạng thái đã lấy ra xử lý. Frontier lớn nhất phản ánh mức bộ nhớ đỉnh. Runtime chỉ tham khảo trên máy hiện tại.
      </p>
      <div className="table-scroll">
        <table className="compare-table">
          <caption>Kết quả các thuật toán trên cùng bản đồ và bài toán</caption>
          <thead>
            <tr>
              <th scope="col">Thuật toán</th>
              <th scope="col">Tìm thấy</th>
              {COLUMNS.map(([label]) => <th key={label} scope="col">{label}</th>)}
              <th scope="col">Đảm bảo tối ưu</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.algorithm}>
                <th scope="row">{nameOf(row.algorithm)}</th>
                {row.error ? (
                  <td colSpan={COLUMNS.length + 2} className="table-error">{row.error}</td>
                ) : (
                  <>
                    <td>{row.found === false || row.stats?.found === false ? "Không" : "Có"}</td>
                    {COLUMNS.map(([, key]) => {
                      const value = row.stats?.[key];
                      const best = bestKeys[key];
                      const isBest = best && value === best.value && best.algorithms.includes(nameOf(row.algorithm));
                      return <td key={key} className={isBest ? "is-best" : ""}>{format(value)}</td>;
                    })}
                    <td>{row.optimal ? "Có" : "Không"}</td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
