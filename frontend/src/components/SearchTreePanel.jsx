// SearchTreePanel.jsx — Cây tìm kiếm dạng thụt lề (như mockup 8-puzzle).
//
// Nhận tree: list phẳng node {id,parent,pos,g,h,f} theo thứ tự expand. Dựng
// map id -> children rồi render đệ quy. Mỗi node: (r, c)  g:_ h:_ f:_ tô màu.
// Chỉ có ý nghĩa với bài path_to_nearest (tree không rỗng).

function TreeNode({ node, children, depth }) {
  const kids = children.get(node.id) || [];
  return (
    <div style={{ marginLeft: depth === 0 ? 0 : 16 }}>
      <div className="font-term text-[14px] flex gap-2 items-baseline py-0.5">
        <span style={{ color: "var(--color-pac)" }}>
          ({node.pos[0]}, {node.pos[1]})
        </span>
        <span style={{ color: "#8b5cf6" }}>g:{node.g}</span>
        <span style={{ color: "#60a5fa" }}>h:{node.h}</span>
        <span style={{ color: "#34d399" }}>f:{node.f}</span>
      </div>
      {kids.map((c) => (
        <TreeNode key={c.id} node={c} children={children} depth={depth + 1} />
      ))}
    </div>
  );
}

export function SearchTreePanel({ tree, active }) {
  return (
    <div className="crt-panel p-4">
      <h2 className="crt-label mb-3">◢ Cây tìm kiếm (g / h / f)</h2>
      {!active ? (
        <p className="crt-label text-[13px]">
          Chọn bài "Đi tới food gần nhất" (chế độ Tĩnh) để xem cây tìm kiếm.
        </p>
      ) : !tree || tree.length === 0 ? (
        <p className="crt-label text-[13px]">Bấm Run hoặc Step để dựng cây.</p>
      ) : (
        <TreeContent tree={tree} />
      )}
    </div>
  );
}

function TreeContent({ tree }) {
  // Dựng map id -> children giữ đúng thứ tự expand.
  const children = new Map();
  let root = null;
  for (const n of tree) {
    if (n.parent === null || n.parent === undefined) {
      root = n;
    } else {
      if (!children.has(n.parent)) children.set(n.parent, []);
      children.get(n.parent).push(n);
    }
  }
  if (!root) return <p className="crt-label text-[13px]">Không dựng được cây.</p>;

  return (
    <div className="max-h-[420px] overflow-auto">
      <TreeNode node={root} children={children} depth={0} />
    </div>
  );
}
