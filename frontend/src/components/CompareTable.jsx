import { useState } from "react";
import { buildFghSeries, nearestSeriesPoint } from "./fghSeries";
import { treeMetricsFor } from "./treeMetrics";

const WIDTH = 920;
const HEIGHT = 390;
const PAD = { top: 32, right: 34, bottom: 76, left: 68 };

const METRICS = [
  { key: "depth", label: "depth" },
  { key: "f", label: "f", color: "var(--color-f)" },
  { key: "g", label: "g", color: "var(--color-g)" },
  { key: "h", label: "h", color: "var(--color-h)" },
];

const ALGORITHM_STYLES = [
  { color: "var(--color-maze)", dash: "0" },
  { color: "var(--color-inky)", dash: "8 5" },
  { color: "var(--color-clyde)", dash: "3 4" },
];

function formatValue(value) {
  return Number.isFinite(value) ? String(Math.round(value * 100) / 100) : "-";
}

function niceMax(value) {
  if (!Number.isFinite(value) || value <= 0) return 1;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const normalized = value / magnitude;
  return (normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10) * magnitude;
}

export function CompareTable({ rows, algoInfo }) {
  const [metric, setMetric] = useState("f");
  const [hovered, setHovered] = useState(null);
  const [pinned, setPinned] = useState(null);
  const availableMetrics = METRICS.filter((item) =>
    rows.some((row) => !row.error && treeMetricsFor(row.algorithm).includes(item.key))
  );
  const metricInfo = availableMetrics.find((item) => item.key === metric) || availableMetrics[0];
  if (!metricInfo) return null;
  const nameOf = (key) => algoInfo?.[key]?.name || key;
  const series = buildFghSeries(
    rows.filter((row) => treeMetricsFor(row.algorithm).includes(metricInfo.key)),
    metricInfo.key,
    nameOf,
  )
    .map((item) => ({
      ...item,
      points: item.orders.map((order, index) => ({ order, value: Number(item.values[index]) }))
        .filter((point) => Number.isFinite(point.value)),
    }))
    .filter((item) => item.points.length > 0);

  if (!series.length) return null;

  const plotWidth = WIDTH - PAD.left - PAD.right;
  const plotHeight = HEIGHT - PAD.top - PAD.bottom;
  const maxOrder = Math.max(1, ...series.flatMap((item) => item.points.map((point) => point.order))) + 1;
  const maxValue = niceMax(Math.max(0, ...series.flatMap((item) => item.points.map((point) => point.value))));
  const ticks = Array.from({ length: 6 }, (_, index) => (maxValue / 5) * index);
  const nodeTickCount = Math.min(6, maxOrder);
  const nodeTicks = [...new Set(
    Array.from(
      { length: nodeTickCount },
      (_, index) => Math.round((index / Math.max(1, nodeTickCount - 1)) * (maxOrder - 1)),
    ),
  )];
  const getX = (order) => PAD.left + (order / (maxOrder - 1)) * plotWidth;
  const getY = (value) => PAD.top + plotHeight - (value / maxValue) * plotHeight;
  const linePath = (points) => points
    .map((point, index) => `${index ? "L" : "M"}${getX(point.order)},${getY(point.value)}`)
    .join(" ");
  const selectionAt = (event, item) => {
    const svg = event.currentTarget.ownerSVGElement;
    const rect = svg.getBoundingClientRect();
    const x = (event.clientX - rect.left) * (WIDTH / rect.width);
    const order = ((x - PAD.left) / plotWidth) * (maxOrder - 1);
    const point = nearestSeriesPoint(item.points, order);
    return point?.order ?? null;
  };
  const sameSelection = (left, right) => left === right;
  const activeSelection = hovered ?? pinned;
  const activePoints = activeSelection == null ? [] : series.flatMap((item, index) => {
    const point = item.points.find((candidate) => candidate.order === activeSelection);
    return point ? [{ ...point, name: item.name, style: ALGORITHM_STYLES[index % ALGORITHM_STYLES.length] }] : [];
  });
  const activePinned = sameSelection(activeSelection, pinned);

  return (
    <section className="lab-panel comparison-line-panel" aria-labelledby="comparison-line-title">
      <div className="panel-heading compact-heading">
        <div>
          <p className="section-kicker">Search metrics</p>
          <h2 id="comparison-line-title">Compare algorithms by node expansion</h2>
        </div>
        <div className="segmented metric-tabs" aria-label="Metric to compare">
          {availableMetrics.map((item) => (
            <button key={item.key} type="button" aria-pressed={metricInfo.key === item.key} onClick={() => {
              setMetric(item.key);
              setHovered(null);
              setPinned(null);
            }}>
              {item.label.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      <p className="metric-glossary">
        Each line shows <strong>{metricInfo.label}</strong> at every expanded node. A displayed metric is recorded for comparison; it is not necessarily the algorithm's priority.
      </p>

      <div className="comparison-line-legend" aria-label="Algorithm legend">
        {series.map((item, index) => {
          const style = ALGORITHM_STYLES[index % ALGORITHM_STYLES.length];
          return (
            <span key={item.algorithm}>
              <i style={{ background: "transparent", borderTop: `4px ${style.dash === "0" ? "solid" : "dashed"} ${style.color}` }} aria-hidden="true" />
              {item.name}
            </span>
          );
        })}
        <span><b className="comparison-goal-key" aria-hidden="true">◆</b> Goal node</span>
      </div>

      <div className="comparison-line-scroll">
        <svg className="comparison-line-chart" viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-labelledby="comparison-line-svg-title comparison-line-svg-description">
          <title id="comparison-line-svg-title">{metricInfo.label} values by node expansion order</title>
          <desc id="comparison-line-svg-description">Each line represents one algorithm. The x-axis is node expansion order and the y-axis is the {metricInfo.label} value.</desc>

          {ticks.map((tick) => {
            const tickY = getY(tick);
            return (
              <g key={tick}>
                <line className="comparison-line-grid" x1={PAD.left} y1={tickY} x2={WIDTH - PAD.right} y2={tickY} />
                <text className="comparison-line-axis-label" x={PAD.left - 12} y={tickY + 4} textAnchor="end">{formatValue(tick)}</text>
              </g>
            );
          })}

          <line className="comparison-line-axis" x1={PAD.left} y1={PAD.top} x2={PAD.left} y2={PAD.top + plotHeight} />
          <line className="comparison-line-axis" x1={PAD.left} y1={PAD.top + plotHeight} x2={WIDTH - PAD.right} y2={PAD.top + plotHeight} />
          <text className="comparison-line-axis-title" x="18" y={PAD.top + plotHeight / 2} textAnchor="middle" transform={`rotate(-90 18 ${PAD.top + plotHeight / 2})`}>{metricInfo.label} value</text>
          <text className="comparison-line-axis-title" x={PAD.left + plotWidth / 2} y={HEIGHT - 12} textAnchor="middle">Node expansion order</text>
          {nodeTicks.map((order) => (
            <g key={order}>
              <line className="comparison-line-tick" x1={getX(order)} y1={PAD.top + plotHeight} x2={getX(order)} y2={PAD.top + plotHeight + 7} />
              <text className="comparison-line-axis-label" x={getX(order)} y={PAD.top + plotHeight + 25} textAnchor={order === 0 ? "start" : order === maxOrder - 1 ? "end" : "middle"}>#{order + 1}</text>
            </g>
          ))}

          {series.map((item, index) => {
            const style = ALGORITHM_STYLES[index % ALGORITHM_STYLES.length];
            const last = item.points.at(-1);
            const goal = item.points.find((point) => point.order === item.goalOrder);
            return (
              <g key={item.algorithm}>
                <path className="comparison-line-series" d={linePath(item.points)} stroke={style.color} strokeDasharray={style.dash} />
                <path
                  className="comparison-line-hit"
                  d={linePath(item.points)}
                  onPointerMove={(event) => setHovered(selectionAt(event, item))}
                  onPointerLeave={() => setHovered(null)}
                  onClick={(event) => {
                    const next = selectionAt(event, item);
                    setPinned((current) => sameSelection(current, next) ? null : next);
                  }}
                />
                <circle className="comparison-line-point" cx={getX(last.order)} cy={getY(last.value)} r="5" fill={style.color} />
                {goal && (
                  <g className="comparison-goal-marker" pointerEvents="none">
                    <title>{`${item.name} goal, Node #${goal.order + 1}`}</title>
                    <polygon
                      points={`${getX(goal.order)},${getY(goal.value) - 9} ${getX(goal.order) + 9},${getY(goal.value)} ${getX(goal.order)},${getY(goal.value) + 9} ${getX(goal.order) - 9},${getY(goal.value)}`}
                      fill="var(--surface)"
                      stroke={style.color}
                    />
                    <circle cx={getX(goal.order)} cy={getY(goal.value)} r="3" fill={style.color} />
                  </g>
                )}
              </g>
            );
          })}
          {activePoints.length > 0 && (
            <g className="comparison-line-selection" opacity={activePinned ? 1 : 0.5} pointerEvents="none">
              <line
                className="comparison-line-guide"
                x1={getX(activeSelection)}
                y1={PAD.top}
                x2={getX(activeSelection)}
                y2={PAD.top + plotHeight + 7}
              />
              {activePoints.map((point, index) => {
                const overlaps = activePoints.slice(0, index)
                  .filter((other) => Math.abs(getY(other.value) - getY(point.value)) < 14).length;
                return (
                  <g key={point.name}>
                    <circle cx={getX(point.order)} cy={getY(point.value)} r="7" fill={point.style.color} />
                    <text className="comparison-line-value" x={getX(point.order)} y={getY(point.value) - 12 - overlaps * 14} textAnchor="middle" fill={point.style.color}>
                      {formatValue(point.value)}
                    </text>
                  </g>
                );
              })}
              <text className="comparison-line-node" x={getX(activeSelection)} y={PAD.top + plotHeight + 48} textAnchor="middle">
                Node #{activeSelection + 1}
              </text>
            </g>
          )}
        </svg>
      </div>
    </section>
  );
}
