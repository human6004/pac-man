// SearchTreePanel.jsx — Cây duyệt SVG dạng card tọa độ, đồng bộ từng bước.

import { useEffect, useRef, useState } from "react";

const NODE_W = 122;
const NODE_H = 94;
const H_GAP = 30;
const V_GAP = 50;
const PAD = 16;
const MIN_ZOOM = 0.55;
const MAX_ZOOM = 1.8;
const ZOOM_STEP = 0.12;

const NODE_COLOR = {
  closed: "#8891b8",
  current: "#FF3B3B",
  open: "#2121DE",
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

function visibleTree(tree, cls) {
  return tree.filter((n) => cls.get(n.id) !== "hidden");
}

function buildTree(nodes) {
  const byId = new Map(nodes.map((n) => [n.id, { ...n, kids: [] }]));
  let root = null;
  for (const n of byId.values()) {
    if (n.parent == null) root = n;
    else byId.get(n.parent)?.kids.push(n);
  }
  return { byId, root };
}

function layout(nodes) {
  const { byId, root } = buildTree(nodes);
  if (!root) return null;
  let leaf = 0;
  const stepX = NODE_W + H_GAP;
  const stepY = NODE_H + V_GAP;

  const place = (node, depth) => {
    node.y = PAD + depth * stepY;
    if (node.kids.length === 0) {
      node.x = PAD + leaf * stepX;
      leaf++;
    } else {
      for (const child of node.kids) place(child, depth + 1);
      node.x = (node.kids[0].x + node.kids[node.kids.length - 1].x) / 2;
    }
  };
  place(root, 0);

  const all = [...byId.values()];
  const maxDepth = all.reduce((max, n) => Math.max(max, (n.y - PAD) / stepY), 0);
  return {
    all,
    width: PAD * 2 + Math.max(1, leaf) * stepX - H_GAP,
    height: PAD * 2 + (maxDepth + 1) * stepY - V_GAP,
  };
}

function fmt(v) {
  return Number.isFinite(v) ? String(Math.round(v * 100) / 100) : "—";
}

function NodeCard({ node, state }) {
  const border = NODE_COLOR[state] || "#8891b8";
  const opacity = NODE_OPACITY[state] ?? 1;
  const [r, c] = node.pos || ["?", "?"];
  const label = state === "current" ? "CURRENT" : state === "open" ? "OPEN" : "CLOSED";
  const visitLabel = state === "closed" && node.expanded_order != null ? `#${node.expanded_order}` : "";

  return (
    <g transform={`translate(${node.x},${node.y})`} opacity={opacity}>
      <rect width={NODE_W} height={NODE_H} rx="6" fill="#07070f" stroke={border} strokeWidth={state === "current" ? 2.8 : 1.5} />
      <rect x="0" y="0" width={NODE_W} height="22" rx="6" fill="#0f1230" />
      <text x="7" y="14" fontSize="11" fontWeight="800" fontFamily="var(--font-arcade)" fill={border}>
        {visitLabel}
      </text>
      <text x={NODE_W - 7} y="14" textAnchor="end" fontSize="10" fontWeight="800" fontFamily="var(--font-arcade)" fill="#cbd0e6">
        {label}
      </text>
      <text x={NODE_W / 2} y="46" textAnchor="middle" fontSize="24" fontFamily="var(--font-term)" fill="var(--color-pac)">
        ({r},{c})
      </text>
      <text x={NODE_W / 2} y="62" textAnchor="middle" fontSize="14" fontFamily="var(--font-term)" fill="var(--color-inky)">
        {node.action || "START"}
      </text>
      <text x={NODE_W / 2} y="75" textAnchor="middle" fontSize="12" fontFamily="var(--font-term)" fill="#ffb852">
        food left: {node.food_left ?? "?"}
      </text>
      <text x={NODE_W / 2} y="90" textAnchor="middle" fontSize="13" fontFamily="var(--font-term)" fill="#cbd0e6">
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

function TreeSvg({ tree, step, heightClass = "h-[460px]" }) {
  const scrollerRef = useRef(null);
  const dragRef = useRef(null);
  const skipFocusScrollRef = useRef(false);
  const [dragging, setDragging] = useState(false);
  const [zoom, setZoom] = useState(1);
  const { cls } = treeState(tree, step);
  const visible = visibleTree(tree, cls);
  const laid = layout(visible);
  const focusNode = laid?.all.find((n) => cls.get(n.id) === "current") || laid?.all[0];
  const focusId = focusNode?.id;
  const focusX = focusNode?.x;
  const focusY = focusNode?.y;

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller || dragRef.current || focusX == null || focusY == null) return;
    if (skipFocusScrollRef.current) {
      skipFocusScrollRef.current = false;
      return;
    }
    scroller.scrollTo({
      left: Math.max(0, focusX * zoom - scroller.clientWidth / 2 + (NODE_W * zoom) / 2),
      top: Math.max(0, focusY * zoom - scroller.clientHeight / 2 + (NODE_H * zoom) / 2),
      behavior: "smooth",
    });
  }, [focusId, focusX, focusY, zoom]);

  if (!laid) return <p className="crt-label text-[13px]">Không dựng được cây.</p>;

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

  const handleWheel = (e) => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    e.preventDefault();

    const rect = scroller.getBoundingClientRect();
    const pointerX = e.clientX - rect.left;
    const pointerY = e.clientY - rect.top;
    const contentX = scroller.scrollLeft + pointerX;
    const contentY = scroller.scrollTop + pointerY;
    const direction = e.deltaY > 0 ? -1 : 1;

    setZoom((current) => {
      const next = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, current + direction * ZOOM_STEP));
      if (next === current) return current;
      const ratio = next / current;
      skipFocusScrollRef.current = true;
      requestAnimationFrame(() => {
        scroller.scrollLeft = contentX * ratio - pointerX;
        scroller.scrollTop = contentY * ratio - pointerY;
      });
      return Math.round(next * 100) / 100;
    });
  };

  return (
    <div
      ref={scrollerRef}
      className={`${heightClass} overflow-auto rounded bg-black/20 select-none touch-none ${
        dragging ? "cursor-grabbing" : "cursor-grab"
      }`}
      onPointerDown={startDrag}
      onPointerMove={drag}
      onPointerUp={stopDrag}
      onPointerCancel={stopDrag}
      onWheel={handleWheel}
    >
      <svg
        width={laid.width * zoom}
        height={laid.height * zoom}
        viewBox={`0 0 ${laid.width} ${laid.height}`}
        style={{ minWidth: laid.width * zoom, display: "block", margin: "0 auto" }}
      >
        {laid.all.flatMap((n) =>
          n.kids.map((child) => (
            <line
              key={`${n.id}-${child.id}`}
              x1={n.x + NODE_W / 2}
              y1={n.y + NODE_H}
              x2={child.x + NODE_W / 2}
              y2={child.y}
              stroke="rgba(120,140,255,.65)"
              strokeWidth="1.5"
            />
          ))
        )}
        {laid.all.map((n) => (
          <NodeCard key={n.id} node={n} state={cls.get(n.id)} />
        ))}
      </svg>
    </div>
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
    <div className="grid grid-cols-2 gap-2 mb-3">
      <div className="rounded border border-[rgba(255,176,0,.28)] bg-[#07070f] px-3 py-2 font-term text-[22px] text-[color:var(--color-amber)]">
        Open list: {open}
      </div>
      <div className="rounded border border-[rgba(255,176,0,.28)] bg-[#07070f] px-3 py-2 font-term text-[22px] text-[color:var(--color-amber)]">
        Closed list: {closed}
      </div>
    </div>
  );
}

export function SearchTreePanel({ tree, active, step, treeMeta }) {
  return (
    <div className="crt-panel p-4 min-h-[420px]">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="crt-label">◢ Cây duyệt từng bước</h2>
        {treeMeta?.truncated && (
          <span className="crt-label text-[11px]" style={{ color: "var(--color-clyde)" }}>
            Giới hạn {treeMeta.limit} node
          </span>
        )}
      </div>
      {!active ? (
        <p className="crt-label text-[13px]">Cây duyệt hiện dành cho chế độ Tĩnh.</p>
      ) : !tree || tree.length === 0 ? (
        <p className="crt-label text-[13px]">Bấm Chạy hoặc Bước tiếp để dựng cây.</p>
      ) : (
        <>
          <TreeCounters tree={tree} step={step} />
          <TreeSvg tree={tree} step={step} />
          <TreeLegend />
        </>
      )}
    </div>
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

function TreeLegend() {
  return (
    <div className="mt-3 flex flex-col gap-1.5 font-term text-[12px] text-[color:var(--color-amber-dim)]">
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        <LegendItem color="var(--color-maze)">OPEN — trong frontier (chờ xét)</LegendItem>
        <LegendItem color="#FF3B3B">CURRENT — đang được expand</LegendItem>
        <LegendItem color="#8891b8">CLOSED — đã expand xong</LegendItem>
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        <span style={{ color: "var(--color-g)" }}>g = chi phí từ start</span>
        <span style={{ color: "var(--color-h)" }}>h = ước lượng tới đích</span>
        <span style={{ color: "var(--color-f)" }}>f = g + h</span>
      </div>
    </div>
  );
}

export function SearchTreePreview({ tree, title, subtitle, treeMeta }) {
  if (!tree || tree.length === 0) {
    return (
      <div className="crt-panel p-3">
        <h3 className="crt-label" style={{ color: "var(--color-pac)" }}>{title}</h3>
        {subtitle && <div className="crt-label text-[12px] mt-1">{subtitle}</div>}
        <p className="crt-label text-[13px] mt-3">Không có cây duyệt.</p>
      </div>
    );
  }

  const step = lastTreeStep(tree);

  return (
    <div className="crt-panel p-3 flex flex-col gap-2">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="crt-label" style={{ color: "var(--color-pac)" }}>{title}</h3>
          {subtitle && <div className="crt-label text-[12px] mt-1">{subtitle}</div>}
        </div>
        {treeMeta?.truncated && (
          <span className="crt-label text-[10px]" style={{ color: "var(--color-clyde)" }}>
            {treeMeta.limit} node
          </span>
        )}
      </div>
      <TreeCounters tree={tree} step={step} />
      <TreeSvg tree={tree} step={step} heightClass="h-[340px]" />
    </div>
  );
}
