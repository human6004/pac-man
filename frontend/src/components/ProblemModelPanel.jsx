const MODELS = {
  eat_all: {
    rows: [
      ["Initial state", "((1,1), F₀)"],
      ["Goal state", "((x,y), ∅)"],
      ["Actions", "Move up, down, left, right if no wall"],
      ["Cost", "Each step costs 1; optimal means fewest steps"],
    ],
    key: "state_key = ((x,y), F)",
    dedup: "Only prune a state when the full state_key has appeared. Same position p but different food set F are still two distinct states.",
    note: "p is the Pac-Man cell; F₀ is the initial food set; ∅ means no food left.",
  },
  path_to_cell: {
    rows: [
      ["Initial state", "p = (1,1)"],
      ["Goal state", "p = (x_goal, y_goal)"],
      ["Actions", "Move up, down, left, right if no wall"],
      ["Cost", "Each step costs 1; optimal means shortest path"],
    ],
    key: "state_key = p = (x,y)",
    dedup: "Prune a child state when position p already appeared in the explored or closed list.",
    note: "If no target is chosen, the backend uses the farthest valid cell as default.",
  },
};

export function ProblemModelPanel({ problem }) {
  const model = MODELS[problem] || MODELS.eat_all;
  return (
    <details className="lab-panel model-details">
      <summary>How the problem is modeled</summary>
      <div className="model-body">
        <dl>
          {model.rows.map(([label, value]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
        <div className="model-dedup">
          <strong>Duplicate-state pruning</strong>
          <code>{model.key}</code>
          <p>{model.dedup}</p>
        </div>
        <p>{model.note}</p>
      </div>
    </details>
  );
}
