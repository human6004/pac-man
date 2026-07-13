const W = 560;
const LEFT = 112;
const RIGHT = 72;
const ROW_H = 42;

function HorizontalBars({ title, description, rows, statKey, unit, color, algoInfo }) {
  const values = rows.map((row) => row.stats?.[statKey] ?? 0);
  const max = Math.max(1, ...values);
  const height = rows.length * ROW_H + 20;
  const nameOf = (row) => algoInfo?.[row.algorithm]?.name || row.algorithm;

  return (
    <section className="lab-panel bar-chart">
      <h3>{title}</h3>
      <p>{description}</p>
      <svg viewBox={`0 0 ${W} ${height}`} role="img" aria-labelledby={`${statKey}-title ${statKey}-desc`}>
        <title id={`${statKey}-title`}>{title}</title>
        <desc id={`${statKey}-desc`}>{description}. Lower is better.</desc>
        {rows.map((row, index) => {
          const value = values[index];
          const y = index * ROW_H + 8;
          const width = (value / max) * (W - LEFT - RIGHT);
          return (
            <g key={row.algorithm}>
              <text x={LEFT - 10} y={y + 18} textAnchor="end" className="chart-label">{nameOf(row)}</text>
              <rect x={LEFT} y={y + 5} width={Math.max(2, width)} height="16" rx="3" fill={color} />
              <text x={Math.min(W - RIGHT + 8, LEFT + width + 8)} y={y + 18} className="chart-value">{value}{unit}</text>
            </g>
          );
        })}
      </svg>
    </section>
  );
}

export function CompareCharts({ rows, algoInfo }) {
  const valid = (rows || []).filter((row) => !row.error && row.stats && row.found !== false && row.stats.found !== false);
  if (!valid.length) return null;
  return (
    <div className="comparison-bars">
      <HorizontalBars
        title="State expansion"
        description="Number of nodes taken from the frontier for processing"
        rows={valid}
        statKey="nodes_expanded"
        unit=""
        color="var(--state-open)"
        algoInfo={algoInfo}
      />
      <HorizontalBars
        title="Run time"
        description="Runtime measured on the current machine, for reference only"
        rows={valid}
        statKey="time_ms"
        unit=" ms"
        color="var(--color-f)"
        algoInfo={algoInfo}
      />
    </div>
  );
}
