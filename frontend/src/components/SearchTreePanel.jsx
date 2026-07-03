// SearchTreePanel.jsx — Cây tìm kiếm vẽ bằng SVG (node bầu dục + đường nối).
//
// Nhận tree: list phẳng node {id,parent,pos,g,h,f} theo thứ tự expand. Dựng
// cây rồi layout: lá xếp trái->phải, node cha căn giữa các con (giống mockup
// Priority Search Tree). Mỗi node hiện tọa độ (x, y); hover xem g/h/f.

const NODE_RX = 30; // bán trục ngang oval
const NODE_RY = 16; // bán trục dọc oval
const H_GAP = 74;   // khoảng cách ngang giữa 2 lá
const V_GAP = 72;   // khoảng cách dọc giữa 2 tầng
const PAD = 24;

// Dựng cây + tính toạ độ (x,y) cho mỗi node.
function layout(tree) {
  const nodes = new Map();
  const children = new Map();
  let root = null;
  for (const n of tree) {
    nodes.set(n.id, { ...n, kids: [] });
  }
  for (const n of tree) {
    if (n.parent === null || n.parent === undefined) {
      root = nodes.get(n.id);
    } else if (nodes.has(n.parent)) {
      nodes.get(n.parent).kids.push(nodes.get(n.id));
      if (!children.has(n.parent)) children.set(n.parent, []);
      children.get(n.parent).push(n.id);
    }
  }
  if (!root) return null;

  // Gán x cho lá theo thứ tự duyệt; cha = trung bình con. y theo độ sâu.
  let leafX = 0;
  const place = (node, depth) => {
    node.y = PAD + NODE_RY + depth * V_GAP;
    if (node.kids.length === 0) {
      node.x = PAD + NODE_RX + leafX * H_GAP;
      leafX++;
    } else {
      for (const k of node.kids) place(k, depth + 1);
      node.x = (node.kids[0].x + node.kids[node.kids.length - 1].x) / 2;
    }
  };
  place(root, 0);

  const all = [...nodes.values()];
  const width = PAD * 2 + NODE_RX * 2 + Math.max(0, leafX - 1) * H_GAP;
  const maxDepth = all.reduce((m, n) => Math.max(m, (n.y - PAD - NODE_RY) / V_GAP), 0);
  const height = PAD * 2 + NODE_RY * 2 + maxDepth * V_GAP;
  return { root, all, width, height };
}

function TreeSvg({ tree }) {
  const laid = layout(tree);
  if (!laid) return <p className="crt-label text-[13px]">Không dựng được cây.</p>;
  const { all, width, height } = laid;

  return (
    <div className="max-h-[460px] overflow-auto">
      <svg width={width} height={height} style={{ minWidth: width }}>
        {/* Đường nối cha -> con */}
        {all.map((n) =>
          n.kids.map((k) => (
            <line
              key={n.id + "-" + k.id}
              x1={n.x}
              y1={n.y + NODE_RY}
              x2={k.x}
              y2={k.y - NODE_RY}
              stroke="rgba(120,140,255,.6)"
              strokeWidth="1.5"
            />
          ))
        )}
        {/* Node bầu dục */}
        {all.map((n) => (
          <g key={n.id}>
            <title>{`g:${n.g}  h:${n.h}  f:${n.f}`}</title>
            <ellipse
              cx={n.x}
              cy={n.y}
              rx={NODE_RX}
              ry={NODE_RY}
              fill="#0a0f2a"
              stroke="var(--color-inky)"
              strokeWidth="1.5"
            />
            <text
              x={n.x}
              y={n.y + 4}
              textAnchor="middle"
              fontSize="13"
              fontFamily="var(--font-term)"
              fill="var(--color-pac)"
            >
              {n.pos[0]},{n.pos[1]}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}

export function SearchTreePanel({ tree, active }) {
  return (
    <div className="crt-panel p-4">
      <h2 className="crt-label mb-3">◢ Cây tìm kiếm — node (x, y), hover xem g/h/f</h2>
      {!active ? (
        <p className="crt-label text-[13px]">
          Chọn bài "Đi tới food gần nhất" (chế độ Tĩnh) để xem cây tìm kiếm.
        </p>
      ) : !tree || tree.length === 0 ? (
        <p className="crt-label text-[13px]">Bấm Chạy hoặc Bước tiếp để dựng cây.</p>
      ) : (
        <TreeSvg tree={tree} />
      )}
    </div>
  );
}
