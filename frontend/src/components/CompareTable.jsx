import { buildComparisonInsights } from "./comparisonInsights";

const COLUMNS = [
  ["Cost", "cost"],
  ["Steps", "path_length"],
  ["Nodes expanded", "nodes_expanded"],
  ["Nodes generated", "nodes_generated"],
  ["Max frontier", "max_frontier"],
  ["Time (ms)", "time_ms"],
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
          <p className="section-kicker">Full metrics</p>
          <h2 id="comparison-table-title">Comparison table</h2>
        </div>
      </div>
      <p className="metric-glossary">
        Nodes expanded are states taken out for processing. Max frontier reflects peak memory. Runtime is only a reference on the current machine.
      </p>
      <div className="table-scroll">
        <table className="compare-table">
          <caption>Results of the algorithms on the same map and problem</caption>
          <thead>
            <tr>
              <th scope="col">Algorithm</th>
              <th scope="col">Found</th>
              {COLUMNS.map(([label]) => <th key={label} scope="col">{label}</th>)}
              <th scope="col">Guaranteed optimal</th>
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
                    <td>{row.found === false || row.stats?.found === false ? "No" : "Yes"}</td>
                    {COLUMNS.map(([, key]) => {
                      const value = row.stats?.[key];
                      const best = bestKeys[key];
                      const isBest = best && value === best.value && best.algorithms.includes(nameOf(row.algorithm));
                      return <td key={key} className={isBest ? "is-best" : ""}>{format(value)}</td>;
                    })}
                    <td>{row.optimal ? "Yes" : "No"}</td>
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
