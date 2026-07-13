import test from "node:test";
import assert from "node:assert/strict";

import { clampZoom, fitZoom, layoutTree, zoomedScroll } from "./treeViewport.js";

test("zoom stays safe while fit may go below 55%", () => {
  assert.equal(clampZoom(0.1), 0.2);
  assert.equal(clampZoom(2), 1.8);
  assert.equal(fitZoom(500, 400, 1000, 800), 0.48);
});

test("zoom keeps its anchor in the same viewport position", () => {
  assert.equal(zoomedScroll(500, 0, 0.5, 200), 50);
});

test("tree layout keeps node coordinates stable while the timeline reveals nodes", () => {
  const tree = [
    { id: 0, parent: null },
    { id: 1, parent: 0 },
    { id: 2, parent: 0 },
    { id: 3, parent: 1 },
  ];
  const laid = layoutTree(tree, { nodeWidth: 122, nodeHeight: 94, horizontalGap: 30, verticalGap: 50, padding: 16 });
  const positions = new Map(laid.all.map((node) => [node.id, [node.x, node.y]]));

  assert.deepEqual(positions.get(1), [16, 160]);
  assert.deepEqual(positions.get(2), [168, 160]);
  assert.deepEqual(positions.get(3), [16, 304]);
});
