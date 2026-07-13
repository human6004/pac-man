// useRunner.js — Máy điều phối chạy thuật toán tìm kiếm tĩnh.
//
// Nhận một ref tới PacmanRenderer. Cung cấp chạy/pause/step/reset/compare cho
// tìm kiếm tĩnh + state hiển thị (status, stats, compareRows, busy).
//
// Renderer chạy imperative (không re-render qua React) để animation mượt; hook
// chỉ giữ các state cần hiển thị trên panel.

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
  const [status, setStatus] = useState("Sẵn sàng");
  const [phase, setPhase] = useState("idle");
  const [stats, setStats] = useState(null);     // {nodes_expanded, time_ms, ...}
  const [compareRows, setCompareRows] = useState([]);
  const [compareTreeStep, setCompareTreeStep] = useState(null);
  const [tree, setTree] = useState([]);
  const [treeMeta, setTreeMeta] = useState(EMPTY_TREE_META);
  const [searchStep, setSearchStep] = useState(0); // số node cây đã hiện (đồng bộ board)
  const [busy, setBusy] = useState(false);
  const [paused, setPaused] = useState(false);
  const [stepState, setStepState] = useState(EMPTY_STEP_STATE);
  const [compareStepState, setCompareStepState] = useState(EMPTY_STEP_STATE);

  // Cờ điều khiển animation (ref để không gây re-render).
  const stopRef = useRef(false);
  const pausedRef = useRef(false);
  const runningRef = useRef(false);
  const abortRef = useRef(null);
  const operationRef = useRef(0);

  // Lưu kết quả lần chạy gần nhất cho chế độ "Từng bước".
  const lastSolveRef = useRef(null);
  const lastSolveKeyRef = useRef(null);
  const lastCompareKeyRef = useRef(null);
  // Bộ đếm tổng số bước đã đi (tất định) cho step tới/lui ở chế độ tĩnh.
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

  // Gắn hook hiệu ứng ăn food vào renderer (gọi 1 lần khi có renderer).
  const wireRenderer = useCallback(() => {
    const r = rendererRef.current;
    if (!r) return;
    r.onEat = (cx, cy, isPellet) => {
      effects.spawnBurst(cx, cy, isPellet ? "#FFF04D" : "#FFE600", isPellet ? 14 : 8);
      if (isPellet) audio.pellet();
      else audio.eat();
    };
  }, [rendererRef]);

  // ---- Chạy chế độ tĩnh ----
  const solveAndAnimate = useCallback(
    async (cfg, operation) => {
      const r = rendererRef.current;
      setStatus(`Đang chuẩn bị ${cfg.algorithm.toUpperCase()}`);
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
      setStatus("Đang duyệt cây tìm kiếm");

      if (!result.found) {
        setStats(result.stats);
        setStatus("Không tìm thấy lời giải");
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
      setStatus("Đang mô phỏng đường đi");
      await r.animatePath(result.path, delay, shouldStop, shouldPause);
      if (shouldStop() || !isCurrentOperation(operation.id)) return;

      setStats(result.stats);
      setStatus("Hoàn tất");
      setPhase("complete");
      audio.win();
    },
    [rendererRef, shouldStop, shouldPause, stepDelay, isCurrentOperation]
  );

  // ---- Các hành động công khai ----
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
          setStatus("Lỗi: " + e.message);
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
    setStatus(pausedRef.current ? "Tạm dừng" : "Đang chạy");
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
    setStatus("Sẵn sàng");
  }, [rendererRef, stopAnimation]);

  // Vẽ lại trạng thái tĩnh TẤT ĐỊNH tại một bước cụ thể (dùng cho tới/lui).
  // step trong [0, treeNodes.length + path.length]:
  //   0..treeNodes.length   -> pha Pac-man đứng trên node đang chọn trong cây
  //   >treeNodes.length      -> pha đi dọc path
  const renderStaticAt = useCallback(
    (step) => {
      const r = rendererRef.current;
      const solve = lastSolveRef.current;
      if (!r || !solve) return;
      const treeNodes = expandedTreeNodes(solve);
      const path = solve.path || [];
      const total = treeNodes.length + path.length;
      const s = Math.max(0, Math.min(step, total));
      staticStepRef.current = s;
      setStepState({ current: s, total, complete: s === total });
      setSearchStep(Math.min(s, treeNodes.length)); // cây chỉ mọc trong pha reveal

      // Dựng lại từ đầu để lùi được (food/pellet reset về ban đầu).
      r.reset();

      if (s <= treeNodes.length) {
        // Pha 1: Pac-man đứng trên node đang được chọn trong cây.
        const node = treeNodes[s - 1];
        r.visited = [];
        r.path = [];
        if (node) {
          r.setSearchTimeline(treeNodes.slice(0, s));
        }
        r.draw();
        setStatus(s === 0 ? "Bắt đầu" : `Đang duyệt node ${s}/${treeNodes.length}`);
        setPhase(s === total ? "complete" : "paused");
        return;
      }

      // Pha 2: đã expand hết, đi dọc path tới ô thứ (walk).
      const walk = s - treeNodes.length; // số ô path đã đi (1..path.length)
      r.visited = [];
      r.path = [];
      const idx = walk - 1;
      const cur = path[idx];
      // Ăn food/pellet dọc các ô đã đi qua.
      for (let i = 1; i <= idx; i++) {
        r.food.delete(r._key(path[i]));
        r.pellets.delete(r._key(path[i]));
      }
      const dir = idx > 0 ? r._dirOf(path[idx - 1], cur) : "RIGHT";
      r.setPacman(cur, dir);
      r._mouthPhase += 0.9;
      r.draw();
      setStatus(`Đang chạy đường đi ${walk}/${path.length}`);
      setPhase(s === total ? "complete" : "paused");
    },
    [rendererRef]
  );

  const stepStatic = useCallback(
    async (cfg, dir = 1) => {
      if (runningRef.current) return; // đang chạy auto -> không cho step chồng
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
      // Lần đầu (chưa solve): gọi API, dựng cây, đứng ở bước 0.
      if (!lastSolveRef.current) {
        if (dir < 0) return; // chưa có gì để lùi
        const operation = beginOperation();
        setBusy(true);
        setPhase("solving");
        setStatus("Đang chuẩn bị bước đầu");
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
          const total = expandedTreeNodes(result).length + (result.path || []).length;
          setStepState({ current: 0, total, complete: !result.found });
          setSearchStep(0);
          setTree(result.tree || []);
          setTreeMeta({ truncated: !!result.tree_truncated, limit: result.tree_limit || 0 });
          r.reset();
          if (!result.found) {
            setStats(result.stats);
            setStatus("Không tìm thấy lời giải");
            setPhase("complete");
            return;
          }
          setStats(result.stats);
          renderStaticAt(1);
        } catch (e) {
          if (isCurrentOperation(operation.id) && !isAbortError(e)) {
            setStatus("Lỗi: " + e.message);
            setPhase("error");
            console.error(e);
          }
        } finally {
          finishOperation(operation.id);
        }
        return;
      }

      const solve = lastSolveRef.current;
      const total = expandedTreeNodes(solve).length + (solve.path || []).length;
      const next = staticStepRef.current + dir;
      if (next < 0) {
        setStatus("Đã ở bước đầu tiên");
        return;
      }
      if (next > total) {
        setStatus("Đã đến cuối đường đi");
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
      setStatus("Chọn ít nhất 2 thuật toán để so sánh");
      setPhase("error");
      return;
    }
    const operation = beginOperation();
    setBusy(true);
    setPhase("solving");
    setStatus(`Đang so sánh ${algos.length} thuật toán`);
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
      setStatus("So sánh hoàn tất");
      setPhase("complete");
    } catch (e) {
      if (isCurrentOperation(operation.id) && !isAbortError(e)) {
        setStatus("Lỗi so sánh: " + e.message);
        setPhase("error");
        console.error(e);
      }
    } finally {
      finishOperation(operation.id);
    }
  }, [beginOperation, finishOperation, isCurrentOperation]);

  const loadCompareRows = useCallback(async (cfg, operation) => {
    const algos = cfg.compareAlgos || [];
    if (algos.length < 2) throw new Error("Chọn ít nhất 2 thuật toán để so sánh");
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
    setStatus(s === 0 ? "Bắt đầu so sánh cây" : `Bước cây so sánh ${s}/${total}`);
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
    setStatus("Đang chuẩn bị cây so sánh");
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
      setStatus("Cây so sánh hoàn tất");
      setPhase("complete");
      audio.win();
    } catch (e) {
      if (isCurrentOperation(operation.id) && !isAbortError(e)) {
        setStatus("Lỗi so sánh: " + e.message);
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
      setStatus("Đang chuẩn bị cây so sánh");
      try {
        const rows = await loadCompareRows(cfg, operation);
        if (!rows || !isCurrentOperation(operation.id)) return;
        compareStepRef.current = 0;
        setCompareTreeStep(0);
        setCompareStepState({ current: 0, total: compareTotalRef.current, complete: compareTotalRef.current === 0 });
      } catch (e) {
        if (isCurrentOperation(operation.id) && !isAbortError(e)) {
          setStatus("Lỗi so sánh: " + e.message);
          setPhase("error");
          console.error(e);
        }
      } finally {
        finishOperation(operation.id);
      }
    }
    const next = compareStepRef.current + dir;
    if (next < 0) {
      setStatus("Đã ở bước so sánh đầu tiên");
      return;
    }
    if (next > compareTotalRef.current) {
      setStatus("Cây so sánh hoàn tất");
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
