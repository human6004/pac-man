import { useState } from "react";
import { ALGORITHM_GUIDE, buildComparisonInsights, formatAlgorithmNames } from "./comparisonInsights";
import { SearchTreePreview } from "./SearchTreePanel";

const METRIC_LABELS = [
  ["nodes", "Fewest nodes", "node"],
  ["frontier", "Lowest frontier", "node"],
  ["cost", "Best cost", "cost"],
  ["time", "Fastest measured", "ms"],
];

function names(metric) {
  return formatAlgorithmNames(metric?.algorithms) || "N/A";
}

export function ComparisonView({ rows, algoInfo }) {
  if (!rows?.length) return null;
  const insights = buildComparisonInsights(rows, algoInfo);

  return (
    <section className="comparison-overview" aria-labelledby="comparison-overview-title">
      {/* <div className="comparison-lead lab-panel">
        <p className="section-kicker">Quick takeaway</p>
        <h2 id="comparison-overview-title">Key differences in this run</h2>
        <p>{insights.summary}</p>
        {insights.optimal.length > 0 && <p><strong>Guaranteed optimal:</strong> {insights.optimal.join(", ")}.</p>}
        {insights.notFound.length > 0 && <p className="warning-text"><strong>No path found:</strong> {insights.notFound.join(", ")}.</p>}
        {insights.errors.map((item) => <p className="error-text" key={item.algorithm}><strong>{item.algorithm}:</strong> {item.error}</p>)}
      </div> */}

      <div className="insight-strip" aria-label="Highlight metrics">
        {METRIC_LABELS.map(([key, label, unit]) => {
          const metric = insights.metrics[key];
          return (
            <div key={key}>
              <span>{label}</span>
              <strong>{metric ? `${metric.value} ${unit}` : "N/A"}</strong>
              <small>{names(metric)}</small>
            </div>
          );
        })}
      </div>

      <div className="algorithm-notes">
        {rows.filter((row) => !row.error).map((row) => {
          const guide = ALGORITHM_GUIDE[row.algorithm];
          const label = algoInfo?.[row.algorithm]?.name || row.algorithm;
          return (
            <article key={row.algorithm}>
              <h3>{label}</h3>
              <p>{guide?.strategy || "Follow the node expansion order to see how the algorithm prioritizes states."}</p>
              <small>{guide?.guarantee || (row.optimal ? "Guaranteed optimal." : "Not guaranteed optimal.")}</small>
            </article>
          );
        })}
      </div>
    </section>
  );
}

export function ComparisonTrees({ rows, algoInfo, problem, treeStep }) {
  const available = (rows || []).filter((row) => !row.error && row.tree?.length);
  const [pair, setPair] = useState([]);
  const [activePane, setActivePane] = useState(0);
  const availableKeys = available.map((row) => row.algorithm);
  const normalized = [...new Set([...pair.filter((key) => availableKeys.includes(key)), ...availableKeys])].slice(0, 2);
  const selectedRows = normalized.map((key) => available.find((row) => row.algorithm === key)).filter(Boolean);
  const nameOf = (key) => algoInfo?.[key]?.name || key;

  if (!available.length) return null;

  const changePair = (index, value) => {
    const next = [...normalized];
    next[index] = value;
    if (next[0] === next[1]) next[1 - index] = availableKeys.find((key) => key !== value);
    setPair(next.filter(Boolean));
  };

  const subtitle = (row) => {
    const stats = row.stats || {};
    return `${stats.nodes_expanded ?? "-"} nodes expanded, ${stats.path_length ?? "-"} steps, cost ${stats.cost ?? "-"}, ${stats.time_ms ?? "-"} ms`;
  };

  return (
    <section className="comparison-trees" aria-labelledby="comparison-trees-title">
      <div className="section-heading-row">
        <div>
          <p className="section-kicker">Trace the cause</p>
          <h2 id="comparison-trees-title">Two synchronized search trees</h2>
          <p>Same time step; each tree keeps its own pan and zoom.</p>
        </div>
        {available.length > 2 && (
          <div className="pair-selectors">
            {[0, 1].map((index) => (
              <label key={index}>
                <span>Tree {index + 1}</span>
                <select value={normalized[index] || ""} onChange={(event) => changePair(index, event.target.value)}>
                  {available.map((row) => (
                    <option key={row.algorithm} value={row.algorithm} disabled={normalized[1 - index] === row.algorithm}>
                      {nameOf(row.algorithm)}
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </div>
        )}
      </div>

      {selectedRows.length > 1 && (
        <div className="segmented tree-pane-switch" role="group" aria-label="Active tree">
          {selectedRows.map((row, index) => (
            <button key={row.algorithm} type="button" aria-pressed={activePane === index} onClick={() => setActivePane(index)}>
              {nameOf(row.algorithm)}
            </button>
          ))}
        </div>
      )}

      <div className="comparison-tree-workspace">
        {selectedRows.map((row, index) => (
          <div
            key={row.algorithm}
            className={`tree-slot ${activePane === index ? "is-active" : "is-preview"}`}
            onClick={() => setActivePane(index)}
            onFocusCapture={() => setActivePane(index)}
          >
            <SearchTreePreview
              tree={row.tree}
              title={nameOf(row.algorithm)}
              subtitle={subtitle(row)}
              treeMeta={{ truncated: !!row.tree_truncated, limit: row.tree_limit || 0 }}
              problem={problem}
              step={treeStep}
            />
          </div>
        ))}
      </div>
    </section>
  );
}
