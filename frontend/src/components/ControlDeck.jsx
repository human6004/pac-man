const GROUP_LABEL = {
  uninformed: "Uninformed search",
  informed: "Informed search",
};

const COMPARE_GROUPS = {
  uninformed: {
    label: "Uninformed search",
    description: "Compare BFS, DFS and UCS",
    algorithms: ["bfs", "dfs", "ucs"],
  },

  informed: {
    label: "Informed search",
    description: "Compare Greedy and A*",
    algorithms: ["greedy", "astar"],
  },
};

const HEURISTIC_LABEL = {
  manhattan: "Manhattan distance",
  nearest_food: "Nearest food",
  farthest_food: "Farthest food",
  food_count: "Remaining food count",
};

function problemPatch(problem) {
  return {
    problem,
    heuristic: problem === "eat_all" ? "farthest_food" : "manhattan",
    goal: null,
  };
}

function formatMapLabel(map) {
  return map ? map.charAt(0).toUpperCase() + map.slice(1) : map;
}

function Field({ label, hint, children, className = "" }) {
  return (
    <label className={`field ${className}`}>
      <span>{label}</span>
      {children}
      {hint && <small>{hint}</small>}
    </label>
  );
}

function PlaybackDock({
  cfg,
  busy,
  paused,
  progress,
  onRun,
  onPause,
  onStep,
  onStepBack,
  canStepBack,
  canStepNext,
  onReset,
}) {
  const auto = cfg.runMode !== "step";
  const primaryAction = auto && busy ? onPause : auto ? onRun : onStep;
  const primaryLabel = auto && busy ? (paused ? "Resume" : "Pause") : auto ? "Start" : "Next step";
  const primaryDisabled = auto ? (!busy && !onRun) : (busy || !canStepNext || !onStep);

  return (
    <section className="playback-dock" aria-label="Playback controls">
      <div className="playback-progress" aria-live="polite">
        <span>Progress</span>
        <strong>{progress?.step ?? 0}/{progress?.total ?? 0}</strong>
      </div>
      <div className="playback-actions">
        <button className="button secondary" disabled={busy || !canStepBack || !onStepBack} onClick={onStepBack}>
          Step back
        </button>
        <button className="button primary" disabled={primaryDisabled} onClick={primaryAction}>
          {primaryLabel}
        </button>
        <button className={`button ${busy ? "danger" : "ghost"}`} disabled={!onReset} onClick={onReset}>
          {busy ? "Stop" : "Reset"}
        </button>
      </div>
    </section>
  );
}

export function ControlDeck({
  tab = "play",
  section = "all",
  maps = [],
  algorithms = [],
  heuristics = [],
  algoInfo = {},
  cfg,
  setCfg,
  busy,
  paused,
  progress,
  canStepBack,
  canStepNext,
  onRun,
  onPause,
  onStep,
  onStepBack,
  onReset,
  onProblemChange,
}) {
  const set = (patch, resetCached = false) => {
    if (resetCached) onReset?.();
    setCfg((current) => ({ ...current, ...patch }));
  };
  const groups = { uninformed: [], informed: [] };
  algorithms.forEach((algorithm) => groups[algorithm.group]?.push(algorithm));
  const visibleHeuristics = heuristics.filter((heuristic) => heuristic !== "null");
  const heuristicDisabled = (heuristic) => (
    cfg.problem === "eat_all" ? heuristic === "manhattan" : heuristic !== "manhattan"
  );

  if (section === "run" || section === "compare-playback") {
    return (
      <PlaybackDock
        cfg={cfg}
        busy={busy}
        paused={paused}
        progress={progress}
        onRun={onRun}
        onPause={onPause}
        onStep={onStep}
        onStepBack={onStepBack}
        canStepBack={canStepBack}
        canStepNext={canStepNext}
        onReset={onReset}
      />
    );
  }

  if (tab === "compare") {
    const selectedGroup = cfg.compareGroup || "informed";

    const selected = cfg.compareAlgos || [];

    const compareUsesHeuristic = selected.some(
      (key) => algoInfo[key]?.uses_heuristic
    );

    const validSelection =
      selectedGroup === "uninformed"
        ? selected.length === 3
        : selected.length === 2;

    return (
      <section className="lab-panel compare-config" aria-labelledby="compare-config-title">
        <div className="panel-heading">
          <div>
            <p className="section-kicker">Experiment setup</p>
            <h2 id="compare-config-title">Select search type</h2>
          </div>
        </div>

        <div className="config-grid compare-fields">
          <Field label="Map">
            <select value={cfg.map} disabled={busy} onChange={(event) => {
              onProblemChange?.();
              set({ map: event.target.value, goal: null }, true);
            }}>
              {maps.map((map) => <option key={map} value={map}>{formatMapLabel(map)}</option>)}
            </select>
          </Field>
          <Field label="Problem">
            <select value={cfg.problem} disabled={busy} onChange={(event) => {
              onProblemChange?.(event.target.value);
              set(problemPatch(event.target.value), true);
            }}>
              <option value="eat_all">Eat-all-dots</option>
              <option value="path_to_cell">Pathfinding</option>
            </select>
          </Field>
          {cfg.problem === "eat_all" && compareUsesHeuristic && (
            <Field label="Heuristic">
              <select value={cfg.heuristic} disabled={busy} onChange={(event) => set({ heuristic: event.target.value }, true)}>
                {visibleHeuristics.map((heuristic) => (
                  <option key={heuristic} value={heuristic} disabled={heuristicDisabled(heuristic)}>
                    {HEURISTIC_LABEL[heuristic] || heuristic}
                  </option>
                ))}
              </select>
            </Field>
          )}
          <div className="field">
            <span id="compare-run-mode-label">Run mode</span>
            <div className="segmented" role="group" aria-labelledby="compare-run-mode-label">
              <button type="button" aria-pressed={cfg.runMode !== "step"} disabled={busy} onClick={() => cfg.runMode === "step" && set({ runMode: "auto" }, true)}>Auto</button>
              <button type="button" aria-pressed={cfg.runMode === "step"} disabled={busy} onClick={() => cfg.runMode !== "step" && set({ runMode: "step" }, true)}>Step</button>
            </div>
          </div>
          {cfg.runMode !== "step" && (
            <Field label={`Speed: ${cfg.speed} steps/sec`}>
              <input type="range" min="1" max="60" value={cfg.speed} disabled={busy} onChange={(event) => set({ speed: Number(event.target.value) })} />
            </Field>
          )}
        </div>

        <div className="compare-selection-row">
          <fieldset className="algorithm-picker">
            <legend>Search type to compare</legend>

            <div>
              {Object.entries(COMPARE_GROUPS).map(
                ([groupKey, group]) => {
                  const checked = selectedGroup === groupKey;

                  return (
                    <label
                      key={groupKey}
                      className={checked ? "is-selected" : ""}
                    >
                      <input
                        type="radio"
                        name="compare-search-group"
                        checked={checked}
                        disabled={busy}
                        onChange={() => {
                          /*
                           * Radio button hoạt động giống lựa chọn duy nhất:
                           * tại một thời điểm chỉ được chọn một nhóm.
                           */
                          set(
                            {
                              compareGroup: groupKey,
                              compareAlgos: group.algorithms,
                            },
                            true
                          );
                        }}
                      />

                      <span>{group.label}</span>

                      <small>{group.description}</small>
                    </label>
                  );
                }
              )}
            </div>
          </fieldset>

          <div className="compare-submit-row">
            <button
              className="button primary compare-submit"
              disabled={busy || !validSelection || (cfg.runMode === "step" && !canStepNext)}
              onClick={cfg.runMode === "step" ? onStep : onRun}
            >
              {busy
                ? "Comparing"
                : selectedGroup === "uninformed"
                  ? "Uninformed Compare"
                  : "Informed Compare"}
            </button>
            {busy && <button className="button danger" onClick={onReset}>Stop</button>}
          </div>
        </div>
      </section>
    );
  }

  const configLocked = busy || (cfg.runMode === "step" && canStepBack);
  const usesHeuristic = algoInfo?.[cfg.algorithm]?.uses_heuristic;

  return (
    <section className="lab-panel experiment-bar" aria-labelledby="experiment-title" aria-disabled={configLocked}>
      <div className="panel-heading compact-heading">
        <div>
          <h2 id="experiment-title">Search configuration</h2>
        </div>
        {configLocked && <span className="status-note">Reset to change configuration</span>}
      </div>
      <div className="config-grid">
        <Field label="Map">
          <select value={cfg.map} disabled={configLocked} onChange={(event) => {
            onProblemChange?.();
            set({ map: event.target.value, goal: null }, true);
          }}>
            {maps.map((map) => <option key={map} value={map}>{formatMapLabel(map)}</option>)}
          </select>
        </Field>
        <Field label="Problem">
          <select value={cfg.problem} disabled={configLocked} onChange={(event) => {
            onProblemChange?.(event.target.value);
            set(problemPatch(event.target.value), true);
          }}>
            <option value="eat_all">Eat-all-dots</option>
            <option value="path_to_cell">Pathfinding</option>
          </select>
        </Field>
        <Field label="Algorithm">
          <select value={cfg.algorithm} disabled={configLocked} onChange={(event) => set({ algorithm: event.target.value }, true)}>
            {["uninformed", "informed"].map((group) => groups[group].length ? (
              <optgroup key={group} label={GROUP_LABEL[group]}>
                {groups[group].map((algorithm) => <option key={algorithm.key} value={algorithm.key}>{algorithm.name}</option>)}
              </optgroup>
            ) : null)}
          </select>
        </Field>
        {usesHeuristic && (
          <Field label="Heuristic">
            <select value={cfg.heuristic} disabled={configLocked} onChange={(event) => set({ heuristic: event.target.value }, true)}>
              {visibleHeuristics.map((heuristic) => (
                <option
                  key={heuristic}
                  value={heuristic}
                  disabled={heuristicDisabled(heuristic)}
                >
                  {HEURISTIC_LABEL[heuristic] || heuristic}
                </option>
              ))}
            </select>
          </Field>
        )}
        <div className="field">
          <span id="run-mode-label">Run mode</span>
          <div className="segmented" role="group" aria-labelledby="run-mode-label">
            <button type="button" aria-pressed={cfg.runMode !== "step"} disabled={configLocked} onClick={() => set({ runMode: "auto" })}>Auto</button>
            <button type="button" aria-pressed={cfg.runMode === "step"} disabled={configLocked} onClick={() => set({ runMode: "step" })}>Step</button>
          </div>
        </div>
        {cfg.runMode !== "step" && (
          <Field label={`Speed: ${cfg.speed} steps/sec`}>
            <input type="range" min="1" max="60" value={cfg.speed} disabled={configLocked} onChange={(event) => set({ speed: Number(event.target.value) })} />
          </Field>
        )}
      </div>
    </section>
  );
}
