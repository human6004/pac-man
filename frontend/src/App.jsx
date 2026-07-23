import { useEffect, useRef, useState } from "react";
import { Api } from "./api/client";
import { Cabinet } from "./components/Cabinet";
import { CompareCharts } from "./components/CompareCharts";
import { CompareTable } from "./components/CompareTable";
import { ComparisonTrees, ComparisonView } from "./components/ComparisonView";
import { ControlDeck } from "./components/ControlDeck";
import { CRTScreen } from "./components/CRTScreen";
import { ProblemModelPanel } from "./components/ProblemModelPanel";
import { SearchTreePanel } from "./components/SearchTreePanel";
import { StatsPanel } from "./components/StatsPanel";
import { effects } from "./game/effects";
import { PacmanRenderer } from "./game/PacmanRenderer";
import { useMetadata } from "./hooks/useMetadata";
import { useRunner } from "./hooks/useRunner";
import { readImportedMap } from "./mapImport";
import { audio } from "./sound/audio";
import { applyTheme, getInitialTheme, persistTheme } from "./theme";

const DEFAULT_CFG = {
  map: "small",
  problem: "eat_all",
  algorithm: "astar",
  heuristic: "farthest_food",
  speed: 12,
  runMode: "auto",
  compareGroup: "informed",
  compareAlgos: ["greedy", "astar"],
  goal: null,
};

const PHASE_LABEL = {
  idle: "Ready",
  solving: "Solving",
  replaying: "Replaying",
  paused: "Paused",
  complete: "Complete",
  error: "Error",
};

const formatCost = (value) => Number.isFinite(value) ? Math.round(value * 100) / 100 : "-";

function StatusStrip({ runner, progress, problem }) {
  const node = progress?.current;
  const position = node?.pos ? `(${node.pos[0]}, ${node.pos[1]})` : "-";
  const foodSet = `{${(node?.food || []).map(([row, col]) => `(${row}, ${col})`).join(", ")}}`;
  const current = node?.pos && problem === "eat_all" ? `(${position}; ` : position;
  return (
    <section className={`status-strip phase-${runner.phase}`} aria-live="polite" aria-atomic="true">
      <div className="status-main">
        <span>{PHASE_LABEL[runner.phase] || "Ready"}</span>
        <strong>{runner.status}</strong>
      </div>
      <div>
        <span>CURRENT</span>
        <strong>{node?.pos && problem === "eat_all" ? <>{current}<em className="current-food-set">{foodSet}</em>)</> : current}</strong>
      </div>
      <div><span>Action</span><strong>{node?.action || "-"}</strong></div>
      <div><span>Food</span><strong>{node?.food?.length ?? "-"}</strong></div>
      <div className="status-costs">
        <span style={{ color: "var(--color-g)" }}>g={formatCost(node?.g)}</span>
        <span style={{ color: "var(--color-h)" }}>h={formatCost(node?.h)}</span>
        <span style={{ color: "var(--color-f)" }}>f={formatCost(node?.f)}</span>
      </div>
    </section>
  );
}

export default function App() {
  const canvasRef = useRef(null);
  const rendererRef = useRef(null);
  const meta = useMetadata();
  const runner = useRunner(rendererRef);

  const [cfg, setCfg] = useState(DEFAULT_CFG);
  const [tab, setTab] = useState("play");
  const [activePane, setActivePane] = useState("map");
  const [soundOn, setSoundOn] = useState(true);
  const [poweron, setPoweron] = useState(true);
  const [mapError, setMapError] = useState(null);
  const [mapImporting, setMapImporting] = useState(false);
  const [rendererReady, setRendererReady] = useState(false);
  const [goalCursor, setGoalCursor] = useState(null);
  const [theme, setTheme] = useState(getInitialTheme);

  useEffect(() => applyTheme(theme), [theme]);

  useEffect(() => {
    if (tab !== "play") return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const renderer = new PacmanRenderer(canvas);
    const motionQuery = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    const syncMotion = () => { renderer.reducedMotion = !!motionQuery?.matches; };
    syncMotion();
    motionQuery?.addEventListener?.("change", syncMotion);
    rendererRef.current = renderer;
    setRendererReady(true);

    let frame;
    const loop = () => {
      if (!renderer.reducedMotion) effects.update();
      renderer.draw();
      if (!renderer.reducedMotion) effects.draw(renderer.ctx);
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(frame);
      motionQuery?.removeEventListener?.("change", syncMotion);
      rendererRef.current = null;
    };
  }, [tab]);

  useEffect(() => {
    const timer = setTimeout(() => setPoweron(false), 700);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (tab !== "play") return;
    const renderer = rendererRef.current;
    if (!rendererReady || !renderer || meta.loading) return;
    const controller = new AbortController();
    (async () => {
      try {
        const map = await Api.getMap(cfg.map, { signal: controller.signal });
        renderer.setMap(map);
        renderer.setProblem(cfg.problem);
        if (cfg.problem === "path_to_cell" && cfg.goal) renderer.setGoal(cfg.goal);
        else renderer.clearGoal();
        effects.clear();
        runner.reset();
        setMapError(null);
      } catch (error) {
        if (error?.name !== "AbortError") setMapError(error.message);
      }
    })();
    return () => controller.abort();
    // runner changes on every state update; map loading only follows these values.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cfg.map, meta.loading, rendererReady, tab]);

  useEffect(() => {
    audio.setEnabled(soundOn);
  }, [soundOn]);

  useEffect(() => {
    const renderer = rendererRef.current;
    if (!renderer) return;
    renderer.setProblem(cfg.problem);
    if (cfg.problem !== "path_to_cell") {
      renderer.clearGoal();
    } else if (cfg.goal) {
      renderer.setGoal(cfg.goal);
    }
  }, [cfg.problem, cfg.goal, tab]);

  const handleRun = () => tab === "compare" ? runner.runCompareTree(cfg) : runner.runStatic(cfg);
  const handleStep = () => tab === "compare" ? runner.stepCompareTree(cfg, 1) : runner.stepStatic(cfg, 1);
  const handleStepBack = () => tab === "compare" ? runner.stepCompareTree(cfg, -1) : runner.stepStatic(cfg, -1);

  const commitGoal = (cell) => {
    if (!cell) return;
    rendererRef.current?.setGoal(cell);
    setGoalCursor(cell);
    runner.reset();
    setCfg((current) => ({ ...current, goal: cell }));
  };

  const handleCanvasClick = (event) => {
    const cell = rendererRef.current?.pixelToCell(event.clientX, event.clientY);
    commitGoal(cell);
  };

  const handleCanvasKeyDown = (event) => {
    if (cfg.problem !== "path_to_cell" || runner.busy) return;
    const renderer = rendererRef.current;
    if (!renderer) return;
    if (event.key.startsWith("Arrow")) {
      event.preventDefault();
      const next = renderer.nextGoalCell(goalCursor || cfg.goal, event.key);
      if (next) {
        renderer.setGoal(next);
        setGoalCursor(next);
      }
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      commitGoal(goalCursor || renderer.goal || renderer.pacman);
    }
    if (event.key === "Escape") {
      event.preventDefault();
      renderer.clearGoal();
      setGoalCursor(null);
      runner.reset();
      setCfg((current) => ({ ...current, goal: null }));
    }
  };

  const handleTabChange = (nextTab) => {
    if (runner.busy) runner.reset();
    setTab(nextTab);
  };

  const handleProblemChange = () => {
    rendererRef.current?.clearGoal();
    setGoalCursor(null);
  };

  const handleMapImport = async (file) => {
    setMapImporting(true);
    setMapError(null);
    try {
      await readImportedMap(file);
      const imported = await Api.importMap(file);
      if (!imported.name || !imported.map) throw new Error("Backend did not return the imported map.");
      runner.reset();
      handleProblemChange();
      rendererRef.current?.setMap(imported.map);
      rendererRef.current?.setProblem(cfg.problem);
      meta.addMap(imported.name);
      setCfg((current) => ({ ...current, map: imported.name, goal: null }));
    } catch (error) {
      setMapError(error.message);
    } finally {
      setMapImporting(false);
    }
  };

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    persistTheme(next);
  };

  const deckProps = {
    maps: meta.maps,
    algorithms: meta.algorithms,
    heuristics: meta.heuristics,
    algoInfo: meta.algoInfo,
    cfg,
    setCfg,
    busy: runner.busy,
    paused: runner.paused,
    canStepBack: tab === "compare" ? runner.compareCanStepBack : runner.canStepBack,
    canStepNext: tab === "compare" ? runner.compareCanStepNext : runner.canStepNext,
    onRun: handleRun,
    onPause: runner.pause,
    onStep: handleStep,
    onStepBack: handleStepBack,
    onReset: runner.reset,
    onProblemChange: handleProblemChange,
    mapImporting,
    onImportMap: handleMapImport,
  };

  const error = meta.error || mapError;
  const goalEnabled = tab === "play" && cfg.problem === "path_to_cell" && !runner.busy;

  return (
    <Cabinet
      tab={tab}
      onTabChange={handleTabChange}
      soundOn={soundOn}
      onToggleSound={() => setSoundOn((value) => !value)}
      theme={theme}
      onToggleTheme={toggleTheme}
    >
      {error && (
        <div className="inline-error" role="alert">
          {meta.error ? `Cannot connect to backend at ${Api.baseUrl}.` : mapError}
        </div>
      )}

      {tab === "play" && (
        <div className="play-page">
          <ControlDeck {...deckProps} tab="play" section="settings" />

          <div className="segmented pane-switch" role="group" aria-label="Active pane">
            <button type="button" aria-pressed={activePane === "map"} onClick={() => setActivePane("map")}>Map</button>
            <button type="button" aria-pressed={activePane === "tree"} onClick={() => setActivePane("tree")}>Search tree</button>
          </div>

          <div className="run-workspace">
            <section
              className={`workspace-pane map-pane ${activePane === "map" ? "is-active" : "is-preview"}`}
              onClick={() => setActivePane("map")}
              onFocusCapture={() => setActivePane("map")}
            >
              <div className="panel-heading game-heading">
                <div>
                  <h2>Game map</h2>
                </div>
                {goalEnabled && <span className="status-note">Selecting target</span>}
                <div className="map-target">
                  <span>Target</span>
                  <strong>{cfg.problem === "eat_all" ? "All food" : cfg.goal ? `(${cfg.goal[0]}, ${cfg.goal[1]})` : "Farthest cell"}</strong>
                </div>
              </div>
              <CRTScreen
                ref={canvasRef}
                poweron={poweron}
                onCanvasClick={goalEnabled ? handleCanvasClick : undefined}
                onCanvasKeyDown={goalEnabled ? handleCanvasKeyDown : undefined}
                goalEnabled={goalEnabled}
                goal={goalCursor || cfg.goal}
              />
            </section>

            <div
              className={`workspace-pane tree-pane ${activePane === "tree" ? "is-active" : "is-preview"}`}
              onClick={() => setActivePane("tree")}
              onFocusCapture={() => setActivePane("tree")}
            >
              <SearchTreePanel
                tree={runner.tree}
                active
                step={runner.searchStep}
                treeMeta={runner.treeMeta}
                problem={cfg.problem}
                algorithm={cfg.algorithm}
                smoothFocus={cfg.runMode === "step"}
              />
            </div>
          </div>

          <ControlDeck {...deckProps} tab="play" section="run" progress={runner.progress} />
          <StatusStrip runner={runner} progress={runner.progress} problem={cfg.problem} />
          <StatsPanel stats={runner.stats} />
          <ProblemModelPanel problem={cfg.problem} />
        </div>
      )}

      {tab === "compare" && (
        <div className="compare-page">
          <ControlDeck {...deckProps} tab="compare" />
          {runner.compareRows.length > 0 ? (
            <>
              <ComparisonTrees
                rows={runner.compareRows}
                algoInfo={meta.algoInfo}
                problem={cfg.problem}
                treeStep={runner.compareTreeStep}
              >
                <ControlDeck {...deckProps} tab="compare" section="compare-playback" progress={runner.compareProgress} />
              </ComparisonTrees>
              <CompareTable rows={runner.compareRows} algoInfo={meta.algoInfo} />
              <CompareCharts rows={runner.compareRows} algoInfo={meta.algoInfo} />
              <ComparisonView rows={runner.compareRows} algoInfo={meta.algoInfo} />

            </>
          ) : (
            <section className="lab-panel empty-compare">
              <h2>Explained comparison</h2>
              <p>Select at least two algorithms. Results will show the path, node count, frontier, time, and why they differ.</p>
            </section>
          )}
        </div>
      )}
    </Cabinet>
  );
}
