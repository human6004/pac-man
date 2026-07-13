// useRunner.js — Coordinator for running static search algorithms.
//
// Takes a ref to PacmanRenderer. Provides run/pause/step/reset/compare for
// static search + display state (status, stats, compareRows, busy).
//
// The renderer runs imperatively (no re-render through React) for smooth
// animation; the hook only holds the state that needs to show on the panel.

import { useCallback, useRef, useState } from "react";
import { Api } from "../api/client";
import { audio } from "../sound/audio";
import { effects } from "../game/effects";

const EMPTY_TREE_META = { truncated: false, limit: 0 };
const EMPTY_STEP_STATE = { current: 0, total: null, complete: false };

function isAbortError(error) {
  return error?.name === "AbortError";
}

function staticKey(cfg) {
  return JSON.stringify({
    map: cfg.map,
    algorithm: cfg.algorithm,
    heuristic: cfg.heuristic,
    problem: cfg.problem,
    goal: cfg.goal || null,
  });
}

function compareKey(cfg) {
  return JSON.stringify({
    map: cfg.map,
    algorithms: cfg.compareAlgos && cfg.compareAlgos.length ? [...cfg.compareAlgos].sort() : [],
    heuristic: cfg.heuristic,
    problem: cfg.problem,
    goal: cfg.goal || null,
  });
}

function expandedTreeNodes(solve) {
  return (solve?.tree || [])
    .filter((n) => n.expanded_order != null)
    .sort((a, b) => a.expanded_order - b.expanded_order);
}

// Total static steps: one per expanded node + one final step that walks the
// whole solution path to the goal at once (not one click per cell).
function staticTotal(solve) {
  const path = solve?.path || [];
  return expandedTreeNodes(solve).length + (path.length ? 1 : 0);
}

function lastTreeStep(tree) {
  const steps = (tree || [])
    .map((n) => n.expanded_order)
    .filter((n) => n != null);
  return steps.length ? Math.max(...steps) + 1 : 0;
}

function compareTotal(rows) {
  return (rows || []).reduce((max, row) => Math.max(max, lastTreeStep(row.tree)), 0);
}

export function useRunner(rendererRef) {
  const [status, setStatus] = useState("Ready");
  const [phase, setPhase] = useState("idle");
  const [stats, setStats] = useState(null);     // {nodes_expanded, time_ms, ...}
  const [compareRows, setCompareRows] = useState([]);
  const [compareTreeStep, setCompareTreeStep] = useState(null);
  const [tree, setTree] = useState([]);
  const [treeMeta, setTreeMeta] = useState(EMPTY_TREE_META);
  const [searchStep, setSearchStep] = useState(0); // number of tree nodes shown so far (synced with board)
  const [busy, setBusy] = useState(false);
  const [paused, setPaused] = useState(false);
  const [stepState, setStepState] = useState(EMPTY_STEP_STATE);
  const [compareStepState, setCompareStepState] = useState(EMPTY_STEP_STATE);

  // Animation control flags (refs so they don't trigger re-renders).
  const stopRef = useRef(false);
  const pausedRef = useRef(false);
  const runningRef = useRef(false);
  const abortRef = useRef(null);
  const operationRef = useRef(0);

  // Store the result of the latest run for "Step by step" mode.
  const lastSolveRef = useRef(null);
  const lastSolveKeyRef = useRef(null);
  const lastCompareKeyRef = useRef(null);
  // Counter for total steps taken (deterministic) for step forward/back in static mode.
  const staticStepRef = useRef(0);
  const compareStepRef = useRef(0);
  const compareTotalRef = useRef(0);

  const stepDelay = useCallback((speed) => {
    const sps = Math.max(1, speed || 12);
    return Math.round(1000 / sps);
  }, []);

  const shouldStop = useCallback(() => stopRef.current, []);
  const shouldPause = useCallback(() => pausedRef.current, []);
  const isCurrentOperation = useCallback((id) => operationRef.current === id, []);

  const beginOperation = useCallback(() => {
    abortRef.current?.abort();
    const id = operationRef.current + 1;
    const controller = new AbortController();
    operationRef.current = id;
    abortRef.current = controller;
    return { id, signal: controller.signal };
  }, []);

  const finishOperation = useCallback((id) => {
    if (!isCurrentOperation(id)) return;
    abortRef.current = null;
    runningRef.current = false;
    setBusy(false);
  }, [isCurrentOperation]);

  const stopAnimation = useCallback(() => {
    stopRef.current = true;
    pausedRef.current = false;
    runningRef.current = false;
    setPaused(false);
  }, []);

  // Wire the food-eating effect hook into the renderer (called once when renderer is available).
  const wireRenderer = useCallback(() => {
    const r = rendererRef.current;
    if (!r) return;
    r.onEat = (cx, cy, isPellet) => {
      effects.spawnBurst(cx, cy, isPellet ? "#FFF04D" : "#FFE600", isPellet ? 14 : 8);
      if (isPellet) audio.pellet();
      else audio.eat();
    };
  }, [rendererRef]);

  // ---- Run static mode ----
  const solveAndAnimate = useCallback(
    async (cfg, operation) => {
      const r = rendererRef.current;
      setStatus(`Preparing ${cfg.algorithm.toUpperCase()}`);
      const result = await Api.solve({
        map: cfg.map,
        algorithm: cfg.algorithm,
        heuristic: cfg.heuristic,
        problem: cfg.problem,
        goal: cfg.goal || null,
      }, { signal: operation.signal });
      if (!isCurrentOperation(operation.id)) return;
      lastSolveRef.current = result;
      lastSolveKeyRef.current = staticKey(cfg);
      setTree(result.tree || []);
      setTreeMeta({ truncated: !!result.tree_truncated, limit: result.tree_limit || 0 });
      setPhase("replaying");
      setStatus("Traversing search tree");

      if (!result.found) {
        setStats(result.stats);
        setStatus("No solution found");
        setPhase("complete");
        const lastNode = expandedTreeNodes(result).at(-1);
        r.visited = [];
        r.path = [];
        if (lastNode) r.setSearchNode(lastNode);
        r.draw();
        return;
      }

      const delay = stepDelay(cfg.speed);
      await r.animateSearch(
        result.tree,
        Math.max(4, delay / 4),
        shouldStop,
        (step) => {
          if (isCurrentOperation(operation.id)) setSearchStep(step);
        },
        shouldPause
      );
      if (shouldStop() || !isCurrentOperation(operation.id)) return;
      r.reset();
      setStatus("Replaying path");
      await r.animatePath(result.path, delay, shouldStop, shouldPause);
      if (shouldStop() || !isCurrentOperation(operation.id)) return;

      setStats(result.stats);
      setStatus("Complete");
      setPhase("complete");
      audio.win();
    },
    [rendererRef, shouldStop, shouldPause, stepDelay, isCurrentOperation]
  );

  // ---- Public actions ----
  const runStatic = useCallback(
    async (cfg) => {
      if (runningRef.current) return;
      const r = rendererRef.current;
      if (!r) return;
      wireRenderer();
      r.reset();
      effects.clear();
      const operation = beginOperation();
      stopRef.current = false;
      pausedRef.current = false;
      runningRef.current = true;
      staticStepRef.current = 0;
      setStepState(EMPTY_STEP_STATE);
      setSearchStep(0);
      setBusy(true);
      setPhase("solving");
      setCompareRows([]);
      setCompareTreeStep(null);
      setCompareStepState(EMPTY_STEP_STATE);
      lastCompareKeyRef.current = null;
      compareStepRef.current = 0;
      compareTotalRef.current = 0;
      audio.start();
      try {
        await solveAndAnimate(cfg, operation);
      } catch (e) {
        if (isCurrentOperation(operation.id) && !isAbortError(e)) {
          setStatus("Error: " + e.message);
          setPhase("error");
          console.error(e);
        }
      } finally {
        finishOperation(operation.id);
      }
    },
    [rendererRef, wireRenderer, solveAndAnimate, beginOperation, finishOperation, isCurrentOperation]
  );

  const pause = useCallback(() => {
    if (!runningRef.current) return;
    pausedRef.current = !pausedRef.current;
    setPaused(pausedRef.current);
    setPhase(pausedRef.current ? "paused" : "replaying");
    setStatus(pausedRef.current ? "Paused" : "Running");
  }, []);

  const reset = useCallback(() => {
    operationRef.current += 1;
    abortRef.current?.abort();
    abortRef.current = null;
    stopAnimation();
    const r = rendererRef.current;
    if (r) r.reset();
    effects.clear();
    lastSolveRef.current = null;
    lastSolveKeyRef.current = null;
    staticStepRef.current = 0;
    setStepState(EMPTY_STEP_STATE);
    setSearchStep(0);
    setStats(null);
    setCompareRows([]);
    setCompareTreeStep(null);
    lastCompareKeyRef.current = null;
    compareStepRef.current = 0;
    compareTotalRef.current = 0;
    setCompareStepState(EMPTY_STEP_STATE);
    setTree([]);
    setTreeMeta(EMPTY_TREE_META);
    setBusy(false);
    setPhase("idle");
    setStatus("Ready");
  }, [rendererRef, stopAnimation]);

  // Redraw the DETERMINISTIC static state at a specific step (used for step forward/back).
  // step in [0, treeNodes.length + path.length]:
  //   0..treeNodes.length   -> phase where Pac-man stands on the selected tree node
  //   >treeNodes.length      -> phase walking along the path
  const renderStaticAt = useCallback(
    (step) => {
      const r = rendererRef.current;
      const solve = lastSolveRef.current;
      if (!r || !solve) return;
      const treeNodes = expandedTreeNodes(solve);
      const path = solve.path || [];
      const total = staticTotal(solve);
      const s = Math.max(0, Math.min(step, total));
      staticStepRef.current = s;
      setStepState({ current: s, total, complete: s === total });
      setSearchStep(Math.min(s, treeNodes.length)); // tree only grows during the reveal phase

      // Rebuild from scratch so we can step back (food/pellets reset to initial state).
      r.reset();

      if (s <= treeNodes.length) {
        // Phase 1: Pac-man stands on the currently selected tree node.
        const node = treeNodes[s - 1];
        r.visited = [];
        r.path = [];
        if (node) {
          r.setSearchTimeline(treeNodes.slice(0, s));
        }
        r.draw();
        setStatus(s === 0 ? "Start" : `Traversing node ${s}/${treeNodes.length}`);
        setPhase(s === total ? "complete" : "paused");
        return;
      }

      // Phase 2 (single step): go straight to the goal. Draw the full route from
      // the start to the target and move Pac-man there at once, eating every
      // food/pellet along the way.
      r.visited = [];
      r.path = path.slice();
      for (let i = 1; i < path.length; i++) {
        r.food.delete(r._key(path[i]));
        r.pellets.delete(r._key(path[i]));
      }
      const goal = path.at(-1);
      const dir = path.length > 1 ? r._dirOf(path.at(-2), goal) : "RIGHT";
      r.setPacman(goal, dir);
      r._mouthPhase += 0.9;
      r.draw();
      setStatus("Solution path");
      setPhase("complete");
    },
    [rendererRef]
  );

  const stepStatic = useCallback(
    async (cfg, dir = 1) => {
      if (runningRef.current) return; // auto-run in progress -> don't allow overlapping step
      const r = rendererRef.current;
      const key = staticKey(cfg);
      if (lastSolveKeyRef.current && lastSolveKeyRef.current !== key) {
        lastSolveRef.current = null;
        lastSolveKeyRef.current = null;
        staticStepRef.current = 0;
        setStepState(EMPTY_STEP_STATE);
        setSearchStep(0);
        setTree([]);
        setTreeMeta(EMPTY_TREE_META);
      }
      // First time (not solved yet): call the API, build the tree, land on step 0.
      if (!lastSolveRef.current) {
        if (dir < 0) return; // nothing to step back to yet
        const operation = beginOperation();
        setBusy(true);
        setPhase("solving");
        setStatus("Preparing first step");
        try {
          const result = await Api.solve({
            map: cfg.map,
            algorithm: cfg.algorithm,
            heuristic: cfg.heuristic,
            problem: cfg.problem,
            goal: cfg.goal || null,
          }, { signal: operation.signal });
          if (!isCurrentOperation(operation.id)) return;
          lastSolveRef.current = result;
          lastSolveKeyRef.current = key;
          staticStepRef.current = 0;
          const total = staticTotal(result);
          setStepState({ current: 0, total, complete: !result.found });
          setSearchStep(0);
          setTree(result.tree || []);
          setTreeMeta({ truncated: !!result.tree_truncated, limit: result.tree_limit || 0 });
          r.reset();
          if (!result.found) {
            setStats(result.stats);
            setStatus("No solution found");
            setPhase("complete");
            return;
          }
          setStats(result.stats);
          renderStaticAt(1);
        } catch (e) {
          if (isCurrentOperation(operation.id) && !isAbortError(e)) {
            setStatus("Error: " + e.message);
            setPhase("error");
            console.error(e);
          }
        } finally {
          finishOperation(operation.id);
        }
        return;
      }

      const solve = lastSolveRef.current;
      const total = staticTotal(solve);
      const next = staticStepRef.current + dir;
      if (next < 0) {
        setStatus("Already at first step");
        return;
      }
      if (next > total) {
        setStatus("Reached end of path");
        return;
      }
      renderStaticAt(next);
      if (dir > 0 && next > expandedTreeNodes(solve).length) audio.eat();
    },
    [rendererRef, renderStaticAt, beginOperation, finishOperation, isCurrentOperation]
  );

  const compare = useCallback(async (cfg) => {
    const algos = cfg.compareAlgos || [];
    if (algos.length < 2) {
      setStatus("Select at least 2 algorithms to compare");
      setPhase("error");
      return;
    }
    const operation = beginOperation();
    setBusy(true);
    setPhase("solving");
    setStatus(`Comparing ${algos.length} algorithms`);
    try {
      const result = await Api.compare({
        map: cfg.map,
        algorithms: algos,
        heuristic: cfg.heuristic,
        problem: cfg.problem,
        goal: cfg.goal || null,
      }, { signal: operation.signal });
      if (!isCurrentOperation(operation.id)) return;
      setCompareRows(result.results);
      lastCompareKeyRef.current = compareKey(cfg);
      compareTotalRef.current = compareTotal(result.results);
      compareStepRef.current = compareTotalRef.current;
      setCompareStepState({ current: compareStepRef.current, total: compareTotalRef.current, complete: true });
      setCompareTreeStep(null);
      setStatus("Comparison complete");
      setPhase("complete");
    } catch (e) {
      if (isCurrentOperation(operation.id) && !isAbortError(e)) {
        setStatus("Comparison error: " + e.message);
        setPhase("error");
        console.error(e);
      }
    } finally {
      finishOperation(operation.id);
    }
  }, [beginOperation, finishOperation, isCurrentOperation]);

  const loadCompareRows = useCallback(async (cfg, operation) => {
    const algos = cfg.compareAlgos || [];
    if (algos.length < 2) throw new Error("Select at least 2 algorithms to compare");
    const result = await Api.compare({
      map: cfg.map,
      algorithms: algos,
      heuristic: cfg.heuristic,
      problem: cfg.problem,
      goal: cfg.goal || null,
    }, { signal: operation.signal });
    if (!isCurrentOperation(operation.id)) return null;
    setCompareRows(result.results);
    lastCompareKeyRef.current = compareKey(cfg);
    compareTotalRef.current = compareTotal(result.results);
    return result.results;
  }, [isCurrentOperation]);

  const waitForCompareTick = useCallback(async (delay) => {
    let remaining = delay;
    let last = Date.now();
    while (!shouldStop() && remaining > 0) {
      if (shouldPause()) {
        await new Promise((resolve) => setTimeout(resolve, 60));
        last = Date.now();
        continue;
      }
      const now = Date.now();
      remaining -= now - last;
      last = now;
      await new Promise((resolve) => setTimeout(resolve, 20));
    }
  }, [shouldStop, shouldPause]);

  const renderCompareAt = useCallback((step) => {
    const total = compareTotalRef.current;
    const s = Math.max(0, Math.min(step, total));
    compareStepRef.current = s;
    setCompareTreeStep(s);
    setCompareStepState({ current: s, total, complete: s === total });
    setStatus(s === 0 ? "Start comparison tree" : `Comparison tree step ${s}/${total}`);
  }, []);

  const runCompareTree = useCallback(async (cfg) => {
    if (runningRef.current) return;
    stopRef.current = false;
    pausedRef.current = false;
    const operation = beginOperation();
    runningRef.current = true;
    setPaused(false);
    setBusy(true);
    setPhase("solving");
    setStatus("Preparing comparison tree");
    try {
      const rows = await loadCompareRows(cfg, operation);
      if (!rows || !isCurrentOperation(operation.id)) return;
      compareStepRef.current = 0;
      setCompareTreeStep(0);
      setCompareStepState({ current: 0, total: compareTotalRef.current, complete: compareTotalRef.current === 0 });
      setPhase("replaying");
      const delay = stepDelay(cfg.speed);
      for (let s = 1; s <= compareTotalRef.current; s++) {
        if (shouldStop() || !isCurrentOperation(operation.id)) return;
        renderCompareAt(s);
        await waitForCompareTick(delay);
      }
      if (!isCurrentOperation(operation.id)) return;
      setStatus("Comparison tree complete");
      setPhase("complete");
      audio.win();
    } catch (e) {
      if (isCurrentOperation(operation.id) && !isAbortError(e)) {
        setStatus("Comparison error: " + e.message);
        setPhase("error");
        console.error(e);
      }
    } finally {
      finishOperation(operation.id);
    }
  }, [beginOperation, finishOperation, isCurrentOperation, loadCompareRows, renderCompareAt, shouldStop, stepDelay, waitForCompareTick]);

  const stepCompareTree = useCallback(async (cfg, dir = 1) => {
    if (runningRef.current) return;
    const key = compareKey(cfg);
    if (lastCompareKeyRef.current !== key || !compareTotalRef.current) {
      if (dir < 0) return;
      const operation = beginOperation();
      setBusy(true);
      setPhase("solving");
      setStatus("Preparing comparison tree");
      try {
        const rows = await loadCompareRows(cfg, operation);
        if (!rows || !isCurrentOperation(operation.id)) return;
        compareStepRef.current = 0;
        setCompareTreeStep(0);
        setCompareStepState({ current: 0, total: compareTotalRef.current, complete: compareTotalRef.current === 0 });
      } catch (e) {
        if (isCurrentOperation(operation.id) && !isAbortError(e)) {
          setStatus("Comparison error: " + e.message);
          setPhase("error");
          console.error(e);
        }
      } finally {
        finishOperation(operation.id);
      }
    }
    const next = compareStepRef.current + dir;
    if (next < 0) {
      setStatus("Already at first comparison step");
      return;
    }
    if (next > compareTotalRef.current) {
      setStatus("Comparison tree complete");
      return;
    }
    renderCompareAt(next);
    setPhase(next === compareTotalRef.current ? "complete" : "paused");
  }, [beginOperation, finishOperation, isCurrentOperation, loadCompareRows, renderCompareAt]);

  const treeTotal = lastTreeStep(tree);
  const currentNode = tree.find((node) => node.expanded_order === Math.max(0, searchStep - 1)) || null;
  const progress = {
    step: stepState.total == null ? searchStep : stepState.current,
    total: stepState.total ?? treeTotal,
    current: currentNode,
  };
  const compareProgress = {
    step: compareStepState.current,
    total: compareStepState.total ?? 0,
    current: null,
  };

  return {
    status, phase, progress, compareProgress, stats, compareRows, compareTreeStep, tree, treeMeta, searchStep, busy, paused,
    canStepBack: stepState.current > 0,
    canStepNext: !stepState.complete,
    compareCanStepBack: compareStepState.current > 0,
    compareCanStepNext: !compareStepState.complete,
    isComplete: phase === "complete" || stepState.complete,
    runStatic, pause, stepStatic, reset, compare, runCompareTree, stepCompareTree, stopAnimation, setStatus,
  };
}
