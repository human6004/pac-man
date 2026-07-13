export const MIN_ZOOM = 0.2;
export const MAX_ZOOM = 1.8;
export const ZOOM_STEP = 0.12;

export function layoutTree(nodes, {
  nodeWidth,
  nodeHeight,
  horizontalGap,
  verticalGap,
  padding,
}) {
  const byId = new Map((nodes || []).map((node) => [node.id, { ...node, kids: [] }]));
  let root = null;
  for (const node of byId.values()) {
    if (node.parent == null) root = node;
    else byId.get(node.parent)?.kids.push(node);
  }
  if (!root) return null;

  let leaf = 0;
  const stepX = nodeWidth + horizontalGap;
  const stepY = nodeHeight + verticalGap;
  const place = (node, depth) => {
    node.y = padding + depth * stepY;
    if (node.kids.length === 0) {
      node.x = padding + leaf * stepX;
      leaf += 1;
      return;
    }
    node.kids.forEach((child) => place(child, depth + 1));
    node.x = (node.kids[0].x + node.kids.at(-1).x) / 2;
  };
  place(root, 0);

  const all = [...byId.values()];
  const maxDepth = all.reduce((max, node) => Math.max(max, (node.y - padding) / stepY), 0);
  return {
    all,
    width: padding * 2 + Math.max(1, leaf) * stepX - horizontalGap,
    height: padding * 2 + (maxDepth + 1) * stepY - verticalGap,
  };
}

export function clampZoom(zoom) {
  return Math.round(Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom)) * 100) / 100;
}

export function fitZoom(viewportWidth, viewportHeight, treeWidth, treeHeight) {
  const gutter = 16;
  if (viewportWidth <= gutter || viewportHeight <= gutter || treeWidth <= 0 || treeHeight <= 0) return 1;
  return clampZoom(Math.min((viewportWidth - gutter) / treeWidth, (viewportHeight - gutter) / treeHeight));
}

export function zoomedScroll(contentCoordinate, contentOrigin, zoom, anchorInViewport) {
  return contentOrigin + contentCoordinate * zoom - anchorInViewport;
}
