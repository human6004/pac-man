const METRICS = [
  ["Thời gian", "time_ms", "ms"],
  ["Số bước", "path_length", ""],
  ["Cost", "cost", ""],
  ["Node mở rộng", "nodes_expanded", ""],
  ["Frontier lớn nhất", "max_frontier", ""],
];

const format = (value, unit) => value == null ? "Chưa có" : `${value}${unit ? ` ${unit}` : ""}`;

export function StatsPanel({ stats }) {
  return (
    <section className="metric-strip" aria-label="Số liệu thuật toán">
      {METRICS.map(([label, key, unit]) => (
        <div key={key}>
          <span>{label}</span>
          <strong>{format(stats?.[key], unit)}</strong>
        </div>
      ))}
    </section>
  );
}
