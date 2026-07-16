import assert from "node:assert/strict";
import test from "node:test";

import { PacmanRenderer } from "./PacmanRenderer.js";

test("search step restores the exact food state of each branch", () => {
  const renderer = Object.assign(Object.create(PacmanRenderer.prototype), {
    problem: "eat_all",
    map: {
      food: [[1, 1], [1, 2]],
    },
    pacman: [0, 0],
    food: new Set(["1,1", "1,2"]),
    _mouthPhase: 0,
  });
  const branchA = { pos: [0, 1], food: [[1, 2]] };
  const branchB = { pos: [1, 0], food: [[1, 1]] };

  renderer.setSearchNode(branchA);
  assert.deepEqual(renderer.pacman, branchA.pos);
  assert.deepEqual([...renderer.food], ["1,2"]);

  renderer.setSearchNode(branchB);
  assert.deepEqual(renderer.pacman, branchB.pos);
  assert.deepEqual([...renderer.food], ["1,1"]);

  renderer.setSearchNode(branchA);
  assert.deepEqual(renderer.pacman, branchA.pos);
  assert.deepEqual([...renderer.food], ["1,2"]);
});

test("pathfinding hides food and never consumes it", () => {
  let drewFood = false;
  const renderer = Object.assign(Object.create(PacmanRenderer.prototype), {
    problem: "path_to_cell",
    food: new Set(["0,1"]),
    map: {},
    canvas: { width: 10, height: 10 },
    ctx: { clearRect() {} },
    _drawVisited() {},
    _drawWalls() {},
    _drawFood() { drewFood = true; },
    _drawGoal() {},
    _drawPath() {},
    _drawGhosts() {},
    _drawPacman() {},
  });

  renderer._eatAt([0, 1]);
  renderer.draw();

  assert.deepEqual([...renderer.food], ["0,1"]);
  assert.equal(drewFood, false);
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
