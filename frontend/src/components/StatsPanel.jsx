const METRICS = [
  ["Time", "time_ms", "ms"],
  ["Steps", "path_length", ""],
  ["Cost", "cost", ""],
  ["Nodes expanded", "nodes_expanded", ""],
  ["Max frontier", "max_frontier", ""],
];

const format = (value, unit) => value == null ? "N/A" : `${value}${unit ? ` ${unit}` : ""}`;

export function StatsPanel({ stats }) {
  return (
    <section className="metric-strip" aria-label="Algorithm metrics">
      {METRICS.map(([label, key, unit]) => (
        <div key={key}>
          <span>{label}</span>
          <strong>{format(stats?.[key], unit)}</strong>
        </div>
      ))}
    </section>
  );
}
