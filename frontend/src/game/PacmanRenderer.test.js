import assert from "node:assert/strict";
import test from "node:test";

import { PacmanRenderer } from "./PacmanRenderer.js";

test("search timeline eats food at each visited cell, monotonically", () => {
  const renderer = Object.assign(Object.create(PacmanRenderer.prototype), {
    map: {
      food: [[1, 1], [1, 2]],
      power_pellets: [[2, 1], [2, 2]],
    },
    pacman: [0, 0],
    food: new Set(["1,1", "1,2"]),
    pellets: new Set(["2,1", "2,2"]),
    _mouthPhase: 0,
  });
  const root = { pos: [0, 0], food: [[1, 1], [1, 2]], power_pellets: [[2, 1], [2, 2]] };
  const branchA = { pos: [0, 1], food: [[1, 2]], power_pellets: [[2, 2]] };
  const branchB = { pos: [1, 0], food: [[1, 1]], power_pellets: [[2, 1]] };

  // Đặt food/pellet TRÙNG ô Pac-man sẽ đứng, để kiểm tra "tới ô nào ăn ô đó".
  renderer.food = new Set(["0,1", "1,0", "9,9"]);
  renderer.pellets = new Set(["0,1"]);

  // Duyệt tới branchA (ô [0,1]): ăn food + pellet tại đó, mất hẳn.
  renderer.setSearchTimeline([root, branchA]);
  assert.deepEqual(renderer.pacman, branchA.pos);
  assert.deepEqual([...renderer.food].sort(), ["1,0", "9,9"]);
  assert.deepEqual([...renderer.pellets].sort(), []);

  // Nhảy tiếp tới branchB (ô [1,0]): ăn thêm ô đó. Ô đã ăn KHÔNG hiện lại.
  renderer.setSearchTimeline([root, branchA, branchB]);
  assert.deepEqual(renderer.pacman, branchB.pos);
  assert.deepEqual([...renderer.food].sort(), ["9,9"]);

  // Lùi lại branchA: dựng lại từ timeline, ăn dồn [0,1] -> [0,1] vẫn mất,
  // [1,0] chưa đi qua nên còn. Đơn điệu, không phụ thuộc food-state của node.
  renderer.food = new Set(["0,1", "1,0", "9,9"]);
  renderer.pellets = new Set(["0,1"]);
  renderer.setSearchTimeline([root, branchA]);
  assert.deepEqual(renderer.pacman, branchA.pos);
  assert.deepEqual([...renderer.food].sort(), ["1,0", "9,9"]);
});

test("keyboard goal cursor moves only to an adjacent walkable cell", () => {
  const renderer = Object.assign(Object.create(PacmanRenderer.prototype), {
    map: { width: 4, height: 3 },
    _walls: new Set(["1,2"]),
    pacman: [1, 1],
  });

  assert.deepEqual(renderer.nextGoalCell(null, "ArrowUp"), [0, 1]);
  assert.deepEqual(renderer.nextGoalCell([1, 1], "ArrowRight"), [1, 1]);
  assert.deepEqual(renderer.nextGoalCell([0, 1], "ArrowUp"), [0, 1]);
});
