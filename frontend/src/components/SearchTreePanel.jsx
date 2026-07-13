// SearchTreePanel.jsx — Cây duyệt SVG dạng card tọa độ, đồng bộ từng bước.

import { useEffect, useMemo, useRef, useState } from "react";
import { clampZoom, fitZoom, layoutTree, MAX_ZOOM, MIN_ZOOM, ZOOM_STEP, zoomedScroll } from "./treeViewport.js";

const NODE_W = 122;
const NODE_H = 94;
const H_GAP = 30;
const V_GAP = 50;
const PAD = 16;
const NODE_COLOR = {
  closed: "var(--state-closed)",
  current: "var(--state-current)",
  open: "var(--state-open)",
};

const NODE_OPACITY = {
  closed: 0.45,
  current: 1,
  open: 1,
};

function treeState(tree, step) {
  const byId = new Map(tree.map((n) => [n.id, n]));
  const cls = new Map();
  const expandedOrders = tree
    .map((n) => n.expanded_order)
    .filter((n) => n != null);
  const maxStep = expandedOrders.length ? Math.max(...expandedOrders) + 1 : 0;
  const safeStep = Math.max(0, Math.min(step || 0, maxStep));

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
      const parentExpanded = parent && parent.expanded_order != null && parent.expanded_order < safeStep;
      cls.set(n.id, n.parent == null || parentExpanded ? "open" : "hidden");
    }
  }

  return { byId, cls };
}

function fmt(v) {
  return Number.isFinite(v) ? String(Math.round(v * 100) / 100) : "-";
}

function NodeCard({ node, state, problem }) {
  const border = NODE_COLOR[state] || "#8891b8";
  const opacity = NODE_OPACITY[state] ?? 1;
  const [r, c] = node.pos || ["?", "?"];
  const eatAll = problem === "eat_all";
  const foodLeft = node.food?.length ?? 0; // F = số thức ăn còn lại tại node
  const foodSet = (node.food || []).map(([fr, fc]) => `(${fr},${fc})`).join(", ");
  const tooltip = eatAll
    ? `Trạng thái ((${r},${c}), ${foodLeft})\nF là số thức ăn còn lại: ${foodLeft}\n{${foodSet}}`
    : `Trạng thái p=(${r},${c})`;
  const label = state === "current" ? "CURRENT" : state === "open" ? "OPEN" : "CLOSED";
  const visitLabel = state === "closed" && node.expanded_order != null ? `#${node.expanded_order}` : "";

  return (
    <g
      transform={`translate(${node.x},${node.y})`}
      opacity={opacity}
      role="img"
      tabIndex={state === "current" ? 0 : undefined}
      aria-label={tooltip}
    >
      <title>{tooltip}</title>
      <rect width={NODE_W} height={NODE_H} rx="6" fill="var(--tree-node)" stroke={border} strokeWidth={state === "current" ? 2.8 : 1.5} />
      <rect x="0" y="0" width={NODE_W} height="22" rx="6" fill="var(--tree-node-head)" />
      <text x="7" y="14" fontSize="11" fontWeight="800" fontFamily="var(--font-arcade)" fill={border}>
        {visitLabel}
      </text>
      <text x={NODE_W - 7} y="14" textAnchor="end" fontSize="10" fontWeight="800" fontFamily="var(--font-ui)" fill="var(--text-primary)">
        {label}
      </text>
      <text x={NODE_W / 2} y={eatAll ? 46 : 48} textAnchor="middle" fontSize={eatAll ? 18 : 24} fontFamily="var(--font-term)" fill="var(--color-pac)">
        {eatAll ? `((${r},${c}), ${foodLeft})` : `(${r},${c})`}
      </text>
      <text x={NODE_W / 2} y={eatAll ? 64 : 68} textAnchor="middle" fontSize="14" fontFamily="var(--font-term)" fill="var(--color-inky)">
        {node.action || "START"}
      </text>
      <text x={NODE_W / 2} y="90" textAnchor="middle" fontSize="13" fontFamily="var(--font-term)" fill="var(--text-primary)">
        <tspan fill="var(--color-g)">g={fmt(node.g)}</tspan>{"  "}
        <tspan fill="var(--color-h)">h={fmt(node.h)}</tspan>{"  "}
        <tspan fill="var(--color-f)">f={fmt(node.f)}</tspan>
      </text>
    </g>
  );
}

function lastTreeStep(tree) {
  const steps = (tree || [])
    .map((n) => n.expanded_order)
    .filter((n) => n != null);
  return steps.length ? Math.max(...steps) + 1 : 0;
}

function TreeSvg({ tree, step, problem, heightClass = "tree-viewport", smoothFocus = false, compact = false }) {
  const scrollerRef = useRef(null);
  const svgRef = useRef(null);
  const dragRef = useRef(null);
  const skipFocusScrollRef = useRef(false);
  const zoomRef = useRef(1);
  const [dragging, setDragging] = useState(false);
  const [followCurrent, setFollowCurrent] = useState(true);
  const [zoom, setZoom] = useState(1);
  const { cls } = treeState(tree, step);
  const laid = useMemo(() => layoutTree(tree, {
    nodeWidth: NODE_W,
    nodeHeight: NODE_H,
    horizontalGap: H_GAP,
    verticalGap: V_GAP,
    padding: PAD,
  }), [tree]);
  const focusNode = laid?.all.find((n) => cls.get(n.id) === "current") || laid?.all[0];
  const focusId = focusNode?.id;
  const focusX = focusNode?.x;
  const focusY = focusNode?.y;

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller || !followCurrent || dragRef.current || focusX == null || focusY == null) return;
    if (skipFocusScrollRef.current) {
      skipFocusScrollRef.current = false;
      return;
    }
    scroller.scrollTo({
      left: Math.max(0, focusX * zoom - scroller.clientWidth / 2 + (NODE_W * zoom) / 2),
      top: Math.max(0, focusY * zoom - scroller.clientHeight / 2 + (NODE_H * zoom) / 2),
      behavior: smoothFocus && !window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ? "smooth" : "auto",
    });
  }, [focusId, focusX, focusY, zoom, followCurrent, smoothFocus]);

  if (!laid) return <p className="empty-state">Không thể dựng cây tìm kiếm.</p>;

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
      if (anchorX < 0 || anchorX > scroller.clientWidth || anchorY < 0 || anchorY > scroller.clientHeight) {
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
      const nextOriginX = nextSvgRect.left - nextScrollerRect.left + nextScroller.scrollLeft;
      const nextOriginY = nextSvgRect.top - nextScrollerRect.top + nextScroller.scrollTop;
      nextScroller.scrollLeft = zoomedScroll(contentX, nextOriginX, nextZoom, anchorX);
      nextScroller.scrollTop = zoomedScroll(contentY, nextOriginY, nextZoom, anchorY);
    });
  };

  const handleWheel = (e) => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    e.preventDefault();
    setFollowCurrent(false);

    const rect = scroller.getBoundingClientRect();
    const pointerX = e.clientX - rect.left;
    const pointerY = e.clientY - rect.top;
    const direction = e.deltaY > 0 ? -1 : 1;
    zoomAround(zoomRef.current + direction * ZOOM_STEP, { x: pointerX, y: pointerY });
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
      "0": () => zoomAround(1),
    };
    if (!actions[e.key]) return;
    e.preventDefault();
    setFollowCurrent(false);
    actions[e.key]();
  };

  const fit = () => zoomAround(fitZoom(
    scrollerRef.current?.clientWidth || 0,
    scrollerRef.current?.clientHeight || 0,
    laid.width,
    laid.height
  ));

  return (
    <>
      {!compact && <div className="tree-toolbar" role="toolbar" aria-label="Điều khiển cây tìm kiếm">
        <button type="button" className="tool-btn" aria-label="Thu nhỏ cây" disabled={zoom <= MIN_ZOOM} onClick={() => zoomAround(zoomRef.current - ZOOM_STEP)}>
          −
        </button>
        <output className="tree-zoom" aria-live="polite">
          {Math.round(zoom * 100)}%
        </output>
        <button type="button" className="tool-btn" aria-label="Phóng to cây" disabled={zoom >= MAX_ZOOM} onClick={() => zoomAround(zoomRef.current + ZOOM_STEP)}>
          +
        </button>
        <button type="button" className="tool-btn tool-btn-text" onClick={fit}>
          Vừa khung
        </button>
        <button type="button" className="tool-btn tool-btn-text" onClick={() => zoomAround(1)}>
          100%
        </button>
        <button
          type="button"
          className={`tool-btn tool-btn-text ${followCurrent ? "is-active" : ""}`}
          aria-pressed={followCurrent}
          onClick={() => setFollowCurrent(true)}
        >
          Theo CURRENT
        </button>
      </div>}
      <div
        ref={scrollerRef}
        className={`${heightClass} tree-scroller select-none touch-none ${
          dragging ? "cursor-grabbing" : "cursor-grab"
        }`}
        tabIndex={0}
        role="region"
        aria-label="Cây tìm kiếm. Dùng phím mũi tên để di chuyển, cộng hoặc trừ để thu phóng."
        onPointerDown={startDrag}
        onPointerMove={drag}
        onPointerUp={stopDrag}
        onPointerCancel={stopDrag}
        onWheel={handleWheel}
        onKeyDown={handleKeyDown}
      >
        <svg
          ref={svgRef}
          width={laid.width * zoom}
          height={laid.height * zoom}
          viewBox={`0 0 ${laid.width} ${laid.height}`}
          style={{ minWidth: laid.width * zoom, display: "block", margin: "0 auto" }}
        >
          <title>Cây duyệt theo từng bước</title>
          <desc>Node được giữ nguyên vị trí. OPEN đang chờ, CURRENT đang được mở rộng, CLOSED đã xử lý xong.</desc>
          {laid.all.flatMap((n) =>
            n.kids.filter((child) => cls.get(n.id) !== "hidden" && cls.get(child.id) !== "hidden").map((child) => (
              <line
                key={`${n.id}-${child.id}`}
                x1={n.x + NODE_W / 2}
                y1={n.y + NODE_H}
                x2={child.x + NODE_W / 2}
                y2={child.y}
                stroke="var(--tree-edge)"
                strokeWidth="1.5"
              />
            ))
          )}
          {laid.all.filter((n) => cls.get(n.id) !== "hidden").map((n) => (
            <NodeCard key={n.id} node={n} state={cls.get(n.id)} problem={problem} />
          ))}
        </svg>
      </div>
    </>
  );
}

function TreeCounters({ tree, step }) {
  const { cls } = treeState(tree, step);
  let open = 0;
  let closed = 0;
  for (const state of cls.values()) {
    if (state === "open") open++;
    if (state === "closed") closed++;
  }
  return (
    <div className="tree-counters">
      <div>
        <span>OPEN</span>
        <strong>{open}</strong>
      </div>
      <div>
        <span>CLOSED</span>
        <strong>{closed}</strong>
      </div>
    </div>
  );
}

export function SearchTreePanel({ tree, active, step, treeMeta, problem, smoothFocus = false, compact = false }) {
  return (
    <section className={`lab-panel tree-panel ${compact ? "is-compact" : ""}`} aria-labelledby="tree-title">
      <div className="panel-heading">
        <div>
          <p className="section-kicker">Không gian tìm kiếm</p>
          <h2 id="tree-title">Cây duyệt từng bước</h2>
        </div>
        {treeMeta?.truncated && (
          <span className="status-note">
            Giới hạn {treeMeta.limit} node
          </span>
        )}
      </div>
      {!active ? (
        <p className="empty-state">Cây tìm kiếm chỉ có trong chế độ tìm kiếm tĩnh.</p>
      ) : !tree || tree.length === 0 ? (
        <p className="empty-state">Chọn cấu hình rồi bấm Bắt đầu hoặc Bước tiếp để dựng cây.</p>
      ) : (
        <>
          <TreeCounters tree={tree} step={step} />
          <TreeSvg tree={tree} step={step} problem={problem} smoothFocus={smoothFocus} compact={compact} />
          {!compact && <TreeLegend problem={problem} />}
        </>
      )}
    </section>
  );
}

// Chú giải ý nghĩa màu node + g/h/f cho người xem không chuyên.
function LegendItem({ color, children }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <i className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: color }} />
      {children}
    </span>
  );
}

function TreeLegend({ problem }) {
  return (
    <div className="tree-legend">
      <div>
        <LegendItem color="var(--state-open)">OPEN: đang chờ</LegendItem>
        <LegendItem color="var(--state-current)">CURRENT: đang mở rộng</LegendItem>
        <LegendItem color="var(--state-closed)">CLOSED: đã xử lý</LegendItem>
      </div>
      <div>
        <span style={{ color: "var(--color-g)" }}>g = chi phí đã đi</span>
        <span style={{ color: "var(--color-h)" }}>h = chi phí ước lượng</span>
        <span style={{ color: "var(--color-f)" }}>f = g + h</span>
        {problem === "eat_all" && <span>F = số thức ăn còn lại; focus node để xem đầy đủ</span>}
      </div>
    </div>
  );
}

export function SearchTreePreview({ tree, title, subtitle, treeMeta, problem, step, compact = false }) {
  if (!tree || tree.length === 0) {
    return (
      <section className="lab-panel tree-preview">
        <h3>{title}</h3>
        {subtitle && <p>{subtitle}</p>}
        <p className="empty-state">Không có cây tìm kiếm.</p>
      </section>
    );
  }

  const displayStep = step == null ? lastTreeStep(tree) : step;

  return (
    <section className={`lab-panel tree-preview ${compact ? "is-compact" : ""}`}>
      <div className="panel-heading compact-heading">
        <div>
          <h3>{title}</h3>
          {subtitle && <p>{subtitle}</p>}
        </div>
        {treeMeta?.truncated && (
          <span className="status-note">
            {treeMeta.limit} node
          </span>
        )}
      </div>
      {!compact && <TreeCounters tree={tree} step={displayStep} />}
      <TreeSvg tree={tree} step={displayStep} problem={problem} heightClass={compact ? "tree-viewport-mini" : "tree-viewport-compare"} compact={compact} />
    </section>
  );
}
