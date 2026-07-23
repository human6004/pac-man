// SearchTreePanel.jsx — SVG search tree with coordinate cards, synced step by step.

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  clampZoom,
  fitZoom,
  layoutTree,
  MAX_ZOOM,
  MIN_ZOOM,
  ZOOM_STEP,
  zoomedScroll,
} from "./treeViewport.js";
import { treeMetricsFor } from "./treeMetrics.js";

export const TREE_FULLSCREEN_STORAGE_KEY = "pacman-search-tree-fullscreen";

const NODE_W = 122;
const NODE_H = 94;
const H_GAP = 22;
const V_GAP = 40;
const PAD = 16;
const NODE_COLOR = {
  closed: "var(--state-closed)",
  current: "var(--state-current)",
  open: "var(--state-open)",
  path: "var(--state-path)",
};

const NODE_OPACITY = {
  closed: 0.45,
  current: 1,
  open: 1,
  path: 1,
};

const METRIC_COLOR = {
  depth: "var(--text-primary)",
  g: "var(--color-g)",
  h: "var(--color-h)",
  f: "var(--color-f)",
};

const METRIC_DESCRIPTION = {
  depth: "depth = search depth",
  g: "g = cost so far",
  h: "h = estimated cost",
  f: "f = g + h",
};

// Tập id các node nằm trên đường đi từ goal ngược lên root (đường lời giải).
function solutionPathIds(tree, byId) {
  const goal = tree.find((n) => n.goal);
  if (!goal) return new Set();
  const ids = new Set();
  let node = goal;
  while (node) {
    ids.add(node.id);
    node = node.parent == null ? null : byId.get(node.parent);
  }
  return ids;
}

function treeState(tree, step) {
  const byId = new Map(tree.map((n) => [n.id, n]));
  const cls = new Map();
  const expandedOrders = tree
    .map((n) => n.expanded_order)
    .filter((n) => n != null);
  const maxStep = expandedOrders.length ? Math.max(...expandedOrders) + 1 : 0;
  const safeStep = Math.max(0, Math.min(step || 0, maxStep + 1));

  // Chỉ tô đường lời giải khi goal đã được expand tại bước hiện tại.
  const goal = tree.find((n) => n.goal);
  const goalReached =
    goal && goal.expanded_order != null && safeStep - 1 >= goal.expanded_order;
  const pathIds = goalReached ? solutionPathIds(tree, byId) : new Set();

  for (const n of tree) {
    const expanded = n.expanded_order;
    if (safeStep === 0) {
      cls.set(n.id, n.parent == null ? "open" : "hidden");
    } else if (expanded != null && expanded < safeStep - 1) {
      cls.set(n.id, "closed");
    } else if (expanded != null && expanded === safeStep - 1) {
      cls.set(n.id, "current");
    } else {
      const parent = byId.get(n.parent);
      const parentExpanded =
        parent &&
        parent.expanded_order != null &&
        parent.expanded_order < safeStep;
      cls.set(n.id, n.parent == null || parentExpanded ? "open" : "hidden");
    }
    // Node đã expand nằm trên đường lời giải -> tô màu path.
    if (pathIds.has(n.id) && cls.get(n.id) !== "hidden") {
      cls.set(n.id, "path");
    }
  }

  return { byId, cls };
}

function fmt(v) {
  return Number.isFinite(v) ? String(Math.round(v * 100) / 100) : "-";
}

function NodeCard({ node, state, problem, algorithm }) {
  const border = NODE_COLOR[state] || "#8891b8";
  const opacity = NODE_OPACITY[state] ?? 1;
  const borderWidth =
    state === "current"
      ? 2.8
      : state === "path"
        ? 2.6
        : state === "open"
          ? 2.2
          : 1.7;
  const [r, c] = node.pos || ["?", "?"];
  const eatAll = problem === "eat_all";
  const foodLeft = node.food?.length ?? 0; // F = food remaining at this node
  const foodSet = (node.food || [])
    .map(([fr, fc]) => `(${fr},${fc})`)
    .join(", ");
  const tooltip = eatAll
    ? `State ((${r},${c}), ${foodLeft})\nF is the food remaining: ${foodLeft}\n{${foodSet}}`
    : `State p=(${r},${c})`;
  const label =
    state === "current"
      ? "CURRENT"
      : state === "path"
        ? "PATH"
        : state === "open"
          ? "OPEN"
          : "CLOSED";
  const visitLabel =
    state === "closed" && node.expanded_order != null
      ? `#${node.expanded_order}`
      : "";
  const metrics = treeMetricsFor(algorithm);

  return (
    <g
      transform={`translate(${node.x},${node.y})`}
      opacity={opacity}
      role="img"
      tabIndex={state === "current" ? 0 : undefined}
      aria-label={tooltip}
    >
      <title>{tooltip}</title>
      <rect width={NODE_W} height={NODE_H} rx="8" fill="var(--tree-node)" />
      <path
        d={`M 8 0 H ${NODE_W - 8} A 8 8 0 0 1 ${NODE_W} 8 V 22 H 0 V 8 A 8 8 0 0 1 8 0 Z`}
        fill="var(--tree-node-head)"
      />
      <text
        x="7"
        y="14"
        fontSize="11"
        fontWeight="800"
        fontFamily="var(--font-arcade)"
        fill={border}
      >
        {visitLabel}
      </text>
      <text
        x={NODE_W - 7}
        y="14"
        textAnchor="end"
        fontSize="10"
        fontWeight="800"
        fontFamily="var(--font-ui)"
        fill="var(--text-primary)"
      >
        {label}
      </text>
      <text
        x={NODE_W / 2}
        y={eatAll ? 46 : 48}
        textAnchor="middle"
        fontSize={eatAll ? 18 : 24}
        fontFamily="var(--font-term)"
        fill="#000"
      >
        {eatAll ? `((${r},${c}), ${foodLeft})` : `(${r},${c})`}
      </text>
      <text
        x={NODE_W / 2}
        y={eatAll ? 64 : 68}
        textAnchor="middle"
        fontSize="14"
        fontFamily="var(--font-term)"
        fill="var(--color-inky)"
      >
        {node.action || "START"}
      </text>
      <text
        x={NODE_W / 2}
        y="90"
        textAnchor="middle"
        fontSize="13"
        fontFamily="var(--font-term)"
        fill="var(--text-primary)"
      >
        {metrics.map((metric, index) => (
          <tspan
            key={metric}
            dx={index ? 8 : undefined}
            fill={METRIC_COLOR[metric]}
          >
            {metric}={fmt(node[metric])}
          </tspan>
        ))}
      </text>
      <rect
        width={NODE_W}
        height={NODE_H}
        rx="8"
        fill="none"
        stroke={border}
        strokeWidth={borderWidth}
        vectorEffect="non-scaling-stroke"
        shapeRendering="geometricPrecision"
      />
    </g>
  );
}

function lastTreeStep(tree) {
  const steps = (tree || [])
    .map((n) => n.expanded_order)
    .filter((n) => n != null);
  return steps.length ? Math.max(...steps) + 1 : 0;
}

function scrollNodeToCenter(scroller, x, y, zoom, smoothFocus) {
  if (!scroller || x == null || y == null) return;

  scroller.scrollTo({
    left: Math.max(
      0,
      x * zoom - scroller.clientWidth / 2 + (NODE_W * zoom) / 2,
    ),
    top: Math.max(
      0,
      y * zoom - scroller.clientHeight / 2 + (NODE_H * zoom) / 2,
    ),
    behavior:
      smoothFocus &&
      !window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
        ? "smooth"
        : "auto",
  });
}

function TreeSvg({
  tree,
  step,
  problem,
  algorithm,
  heightClass = "tree-viewport",
  smoothFocus = false,
  compact = false,
  autoFit = false,
  onOpenFullscreen = null,
}) {
  const scrollerRef = useRef(null);
  const svgRef = useRef(null);
  const dragRef = useRef(null);
  const skipFocusScrollRef = useRef(false);
  const zoomRef = useRef(1);
  const initialAutoFitDoneRef = useRef(false);
  /* Lưu vị trí hai thanh cuộn trước khi zoom bằng con lăn */
  const wheelScrollRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [followCurrent, setFollowCurrent] = useState(true);
  const [zoom, setZoom] = useState(1);

  /*
   * Chỉ dùng các node đã xuất hiện ở bước hiện tại để tính layout.
   *
   * Trước đây toàn bộ cây được dùng để tính tọa độ rồi mới ẩn node,
   * khiến các node đang hiển thị vẫn cách nhau theo kích thước cây cuối.
   */
  const { cls, laid } = useMemo(() => {
    const state = treeState(tree, step);

    const visibleTree = (tree || []).filter(
      (node) => state.cls.get(node.id) !== "hidden",
    );

    const currentLayout = layoutTree(visibleTree, {
      nodeWidth: NODE_W,
      nodeHeight: NODE_H,
      horizontalGap: H_GAP,
      verticalGap: V_GAP,
      padding: PAD,
    });

    return {
      cls: state.cls,
      laid: currentLayout,
    };
  }, [tree, step]);

  const focusNode =
    laid?.all.find((n) => cls.get(n.id) === "current") || laid?.all[0];
  const focusId = focusNode?.id;
  const focusX = focusNode?.x;
  const focusY = focusNode?.y;

  useEffect(() => {
    const scroller = scrollerRef.current;

    if (!followCurrent || dragRef.current) return;

    if (skipFocusScrollRef.current) {
      skipFocusScrollRef.current = false;
      return;
    }

    scrollNodeToCenter(scroller, focusX, focusY, zoom, smoothFocus);
  }, [focusId, focusX, focusY, zoom, followCurrent, smoothFocus]);

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return undefined;

    const handleNativeWheel = (event) => {
      event.preventDefault();
      event.stopPropagation();

      if (event.deltaY === 0) return;

      const scroller = scrollerRef.current;
      if (!scroller) return;

      // Giữ nguyên vị trí quan sát hiện tại
      wheelScrollRef.current = {
        left: scroller.scrollLeft,
        top: scroller.scrollTop,
      };

      const direction = event.deltaY < 0 ? 1 : -1;

      const nextZoom = clampZoom(zoomRef.current + direction * ZOOM_STEP);

      if (nextZoom === zoomRef.current) return;

      setFollowCurrent(false);
      zoomRef.current = nextZoom;
      setZoom(nextZoom);
    };

    scroller.addEventListener("wheel", handleNativeWheel, {
      passive: false,
    });

    return () => {
      scroller.removeEventListener("wheel", handleNativeWheel);
    };
  }, [laid]);

  useLayoutEffect(() => {
    const scroller = scrollerRef.current;
    const saved = wheelScrollRef.current;

    if (!scroller || !saved) return;

    scroller.scrollLeft = saved.left;
    scroller.scrollTop = saved.top;

    wheelScrollRef.current = null;
  }, [zoom]);

  const handleFollowCurrent = () => {
    skipFocusScrollRef.current = false;
    setFollowCurrent(true);

    scrollNodeToCenter(
      scrollerRef.current,
      focusX,
      focusY,
      zoomRef.current,
      smoothFocus,
    );
  };

  useEffect(() => {
    if (!autoFit || !laid || initialAutoFitDoneRef.current) {
      return undefined;
    }

    const frame = requestAnimationFrame(() => {
      const scroller = scrollerRef.current;
      if (!scroller) return;

      const nextZoom = fitZoom(
        scroller.clientWidth,
        scroller.clientHeight,
        laid.width,
        laid.height,
      );

      initialAutoFitDoneRef.current = true;

      // Tab mới chỉ tự Fit một lần.
      setFollowCurrent(false);
      zoomRef.current = nextZoom;
      setZoom(nextZoom);

      requestAnimationFrame(() => {
        const currentScroller = scrollerRef.current;
        if (!currentScroller) return;

        currentScroller.scrollTo({
          left: 0,
          top: 0,
          behavior: "auto",
        });
      });
    });

    return () => {
      cancelAnimationFrame(frame);
    };
  }, [autoFit, laid]);

  if (!laid) {
    return <p className="empty-state">Cannot build the search tree.</p>;
  }

  const counts = treeCounts(tree || [], step);

  const startDrag = (e) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    const scroller = scrollerRef.current;
    if (!scroller) return;
    dragRef.current = {
      x: e.clientX,
      y: e.clientY,
      left: scroller.scrollLeft,
      top: scroller.scrollTop,
    };
    setFollowCurrent(false);
    setDragging(true);
    scroller.setPointerCapture?.(e.pointerId);
    e.preventDefault();
  };

  const drag = (e) => {
    const scroller = scrollerRef.current;
    const start = dragRef.current;
    if (!scroller || !start) return;
    scroller.scrollLeft = start.left - (e.clientX - start.x);
    scroller.scrollTop = start.top - (e.clientY - start.y);
  };

  const stopDrag = (e) => {
    const scroller = scrollerRef.current;
    dragRef.current = null;
    setDragging(false);
    scroller?.releasePointerCapture?.(e.pointerId);
  };

  const zoomAround = (requestedZoom, pointer) => {
    const scroller = scrollerRef.current;
    const svg = svgRef.current;
    if (!scroller || !svg) return;

    const currentZoom = zoomRef.current;
    const nextZoom = clampZoom(requestedZoom);
    if (nextZoom === currentZoom) return;
    const scrollerRect = scroller.getBoundingClientRect();
    const svgRect = svg.getBoundingClientRect();
    const originX = svgRect.left - scrollerRect.left + scroller.scrollLeft;
    const originY = svgRect.top - scrollerRect.top + scroller.scrollTop;

    let contentX;
    let contentY;
    let anchorX;
    let anchorY;

    if (pointer) {
      anchorX = pointer.x;
      anchorY = pointer.y;
      contentX = (scroller.scrollLeft + anchorX - originX) / currentZoom;
      contentY = (scroller.scrollTop + anchorY - originY) / currentZoom;
    } else if (focusX != null && focusY != null) {
      contentX = focusX + NODE_W / 2;
      contentY = focusY + NODE_H / 2;
      anchorX = originX + contentX * currentZoom - scroller.scrollLeft;
      anchorY = originY + contentY * currentZoom - scroller.scrollTop;
      if (
        anchorX < 0 ||
        anchorX > scroller.clientWidth ||
        anchorY < 0 ||
        anchorY > scroller.clientHeight
      ) {
        anchorX = scroller.clientWidth / 2;
        anchorY = scroller.clientHeight / 2;
      }
    } else {
      anchorX = scroller.clientWidth / 2;
      anchorY = scroller.clientHeight / 2;
      contentX = (scroller.scrollLeft + anchorX - originX) / currentZoom;
      contentY = (scroller.scrollTop + anchorY - originY) / currentZoom;
    }

    skipFocusScrollRef.current = !dragRef.current;
    zoomRef.current = nextZoom;
    setZoom(nextZoom);
    requestAnimationFrame(() => {
      const nextSvg = svgRef.current;
      const nextScroller = scrollerRef.current;
      if (!nextSvg || !nextScroller) return;
      const nextScrollerRect = nextScroller.getBoundingClientRect();
      const nextSvgRect = nextSvg.getBoundingClientRect();
      const nextOriginX =
        nextSvgRect.left - nextScrollerRect.left + nextScroller.scrollLeft;
      const nextOriginY =
        nextSvgRect.top - nextScrollerRect.top + nextScroller.scrollTop;
      nextScroller.scrollLeft = zoomedScroll(
        contentX,
        nextOriginX,
        nextZoom,
        anchorX,
      );
      nextScroller.scrollTop = zoomedScroll(
        contentY,
        nextOriginY,
        nextZoom,
        anchorY,
      );
    });
  };

  const handleKeyDown = (e) => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const pan = 48;
    const actions = {
      ArrowUp: () => scroller.scrollBy({ top: -pan }),
      ArrowDown: () => scroller.scrollBy({ top: pan }),
      ArrowLeft: () => scroller.scrollBy({ left: -pan }),
      ArrowRight: () => scroller.scrollBy({ left: pan }),
      "+": () => zoomAround(zoomRef.current + ZOOM_STEP),
      "=": () => zoomAround(zoomRef.current + ZOOM_STEP),
      "-": () => zoomAround(zoomRef.current - ZOOM_STEP),
      0: () => zoomAround(1),
    };
    if (!actions[e.key]) return;
    e.preventDefault();
    setFollowCurrent(false);
    actions[e.key]();
  };

  const fit = () => {
    const scroller = scrollerRef.current;
    if (!scroller) return;

    const nextZoom = Math.min(
      1,
      fitZoom(
        scroller.clientWidth,
        scroller.clientHeight,
        laid.width,
        laid.height,
      ),
    );

    // Fit thủ công không được Track current ghi đè.
    setFollowCurrent(false);
    skipFocusScrollRef.current = true;

    zoomRef.current = nextZoom;
    setZoom(nextZoom);

    requestAnimationFrame(() => {
      const currentScroller = scrollerRef.current;
      if (!currentScroller) return;

      currentScroller.scrollTo({
        left: 0,
        top: 0,
        behavior: "auto",
      });
    });
  };

  const handleManualZoom = (nextZoom) => {
    // Khi người dùng tự zoom thì tắt chế độ bám CURRENT.
    setFollowCurrent(false);

    zoomAround(nextZoom);
  };

  return (
    <>
      {!compact && (
        <div
          className="tree-toolbar"
          role="toolbar"
          aria-label="Search tree controls"
        >
          <div
            className="tree-toolbar-counts"
            aria-label="Search tree node counts"
          >
            <span>
              OPEN: <strong>{counts.open}</strong>
            </span>
            <span>
              CLOSED: <strong>{counts.closed}</strong>
            </span>
          </div>
          <button
            type="button"
            className="tool-btn tool-btn-zoom"
            aria-label="Zoom out tree"
            disabled={zoom <= MIN_ZOOM}
            onClick={() => handleManualZoom(zoomRef.current - ZOOM_STEP)}
          >
            −
          </button>

          <output className="tree-zoom" aria-live="polite">
            {Math.round(zoom * 100)}%
          </output>

          <button
            type="button"
            className="tool-btn tool-btn-zoom"
            aria-label="Zoom in tree"
            disabled={zoom >= MAX_ZOOM}
            onClick={() => handleManualZoom(zoomRef.current + ZOOM_STEP)}
          >
            +
          </button>

          <button
            type="button"
            className="tool-btn tool-btn-text"
            onClick={fit}
          >
            Fit
          </button>

          <button
            type="button"
            className="tool-btn tool-btn-text"
            onClick={() => handleManualZoom(1)}
          >
            100%
          </button>

          <button
            type="button"
            className={`tool-btn tool-btn-text ${
              followCurrent ? "is-active" : ""
            }`}
            aria-pressed={followCurrent}
            onClick={handleFollowCurrent}
          >
            Track current
          </button>

          {onOpenFullscreen && (
            <button
              type="button"
              className="tool-btn tree-open-fullscreen"
              aria-label="Open search tree in a new tab"
              title="Open in new tab"
              onClick={onOpenFullscreen}
            >
              ⛶
            </button>
          )}
        </div>
      )}
      <div
        ref={scrollerRef}
        className={`${heightClass} tree-scroller select-none touch-none ${
          dragging ? "cursor-grabbing" : "cursor-grab"
        }`}
        tabIndex={0}
        role="region"
        aria-label="Search tree. Use arrow keys to pan, plus or minus to zoom."
        onPointerDown={startDrag}
        onPointerMove={drag}
        onPointerUp={stopDrag}
        onPointerCancel={stopDrag}
        onKeyDown={handleKeyDown}
      >
        <svg
          ref={svgRef}
          width={laid.width * zoom}
          height={laid.height * zoom}
          viewBox={`0 0 ${laid.width} ${laid.height}`}
          style={{
            minWidth: laid.width * zoom,
            display: "block",
            margin: "0 auto",
          }}
        >
          <title>search tree</title>
          <desc>
            Nodes keep their position. OPEN is waiting, CURRENT is being
            expanded, CLOSED is done.
          </desc>
          {laid.all.flatMap((node) =>
            node.kids.map((child) => {
              // Cạnh nằm trên đường lời giải khi cả cha lẫn con đều là path.
              const onPath =
                cls.get(node.id) === "path" && cls.get(child.id) === "path";
              return (
                <line
                  key={`${node.id}-${child.id}`}
                  x1={node.x + NODE_W / 2}
                  y1={node.y + NODE_H}
                  x2={child.x + NODE_W / 2}
                  y2={child.y}
                  stroke={onPath ? "var(--state-path)" : "var(--tree-edge)"}
                  strokeWidth={onPath ? 3 : 1.5}
                />
              );
            }),
          )}
          {laid.all.map((node) => (
            <NodeCard
              key={node.id}
              node={node}
              state={cls.get(node.id)}
              problem={problem}
              algorithm={algorithm}
            />
          ))}
        </svg>
      </div>
    </>
  );
}

function treeCounts(tree, step) {
  const { cls } = treeState(tree, step);
  let open = 0;
  let closed = 0;
  for (const state of cls.values()) {
    if (state === "open") open++;
    if (state === "closed") closed++;
  }
  return { open, closed };
}

function openTreeFullscreen({ tree, step, treeMeta, problem, algorithm }) {
  if (!tree || tree.length === 0) return;

  try {
    window.localStorage.setItem(
      TREE_FULLSCREEN_STORAGE_KEY,
      JSON.stringify({ tree, step, treeMeta, problem, algorithm }),
    );

    const url = new URL(window.location.href);
    url.search = "";
    url.hash = "";
    url.searchParams.set("treeFullscreen", "1");
    window.open(url.toString(), "_blank", "noopener,noreferrer");
  } catch (error) {
    console.error("Cannot open the full search tree view.", error);
  }
}

export function SearchTreePanel({
  tree,
  active,
  step,
  treeMeta,
  problem,
  algorithm,
  smoothFocus = false,
  compact = false,
  fullscreen = false,
}) {
  const openFullscreenTree = () => {
    if (!tree || tree.length === 0) return;

    try {
      // Lưu ảnh chụp cây tại bước hiện tại.
      window.localStorage.setItem(
        TREE_FULLSCREEN_STORAGE_KEY,
        JSON.stringify({
          tree,
          step,
          treeMeta,
          problem,
          algorithm,
        }),
      );

      const url = new URL(window.location.href);

      // Xóa query hiện tại và chuyển sang chế độ xem cây.
      url.search = "";
      url.hash = "";
      url.searchParams.set("treeFullscreen", "1");

      window.open(url.toString(), "_blank", "noopener,noreferrer");
    } catch (error) {
      console.error("Cannot open the full search tree view.", error);
    }
  };
  return (
    <section
      className={`lab-panel tree-panel ${compact ? "is-compact" : ""}${fullscreen ? "is-fullscreen" : ""}`}
      aria-labelledby="tree-title"
    >
      <div className="panel-heading">
        <div>
          <h2 id="tree-title">Search tree</h2>
        </div>
        {treeMeta?.truncated && (
          <span className="status-note">Limited to {treeMeta.limit} nodes</span>
        )}
      </div>
      {!active ? (
        <p className="empty-state">
          The search tree is only available in static search mode.
        </p>
      ) : !tree || tree.length === 0 ? (
        <p className="empty-state">
          Choose a configuration then press Start or Next step to build the
          tree.
        </p>
      ) : (
        <>
          <TreeSvg
            tree={tree}
            step={step}
            problem={problem}
            algorithm={algorithm}
            smoothFocus={smoothFocus}
            compact={compact}
            autoFit={fullscreen}
            onOpenFullscreen={fullscreen ? null : openFullscreenTree}
          />
          {!compact && <TreeLegend problem={problem} algorithm={algorithm} />}
        </>
      )}
    </section>
  );
}

// Legend explaining node colors + g/h/f for non-expert viewers.
function LegendItem({ color, children }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <i
        className="inline-block w-2.5 h-2.5 rounded-sm"
        style={{ background: color }}
      />
      {children}
    </span>
  );
}

function TreeLegend({ problem, algorithm }) {
  const metrics = treeMetricsFor(algorithm);
  return (
    <div className="tree-legend">
      <div className="tree-legend-text">
        <div>
          <LegendItem color="var(--state-open)">OPEN: waiting</LegendItem>
          <LegendItem color="var(--state-current)">
            CURRENT: expanding
          </LegendItem>
          <LegendItem color="var(--state-closed)">CLOSED: done</LegendItem>
          <LegendItem color="var(--state-path)">PATH: solution</LegendItem>
        </div>

        <div>
          {metrics.map((metric) => (
            <span key={metric} style={{ color: METRIC_COLOR[metric] }}>
              {METRIC_DESCRIPTION[metric]}
            </span>
          ))}
        </div>

        {problem === "eat_all" && (
          <div className="tree-legend-food">
            F = food remaining; focus a node to see full detail
          </div>
        )}
      </div>
    </div>
  );
}

export function SearchTreePreview({
  tree,
  title,
  subtitle,
  treeMeta,
  problem,
  algorithm,
  step,
  compact = false,
}) {
  if (!tree || tree.length === 0) {
    return (
      <section className="lab-panel tree-preview">
        <h3>{title}</h3>
        {subtitle && <p>{subtitle}</p>}
        <p className="empty-state">No search tree.</p>
      </section>
    );
  }

  const displayStep = step == null ? lastTreeStep(tree) : step;
  const openFullscreenTree = () =>
    openTreeFullscreen({
      tree,
      step: displayStep,
      treeMeta,
      problem,
      algorithm,
    });

  return (
    <section
      className={`lab-panel tree-preview ${compact ? "is-compact" : ""}`}
    >
      <div className="panel-heading compact-heading">
        <div>
          <h3>{title}</h3>
          {subtitle && <p>{subtitle}</p>}
        </div>
        {treeMeta?.truncated && (
          <span className="status-note">{treeMeta.limit} node</span>
        )}
      </div>
      <TreeSvg
        tree={tree}
        step={displayStep}
        problem={problem}
        algorithm={algorithm}
        heightClass={compact ? "tree-viewport-mini" : "tree-viewport-compare"}
        compact={compact}
        onOpenFullscreen={compact ? null : openFullscreenTree}
      />
      {!compact && <TreeLegend problem={problem} algorithm={algorithm} />}
    </section>
  );
}
