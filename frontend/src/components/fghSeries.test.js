import test from "node:test";
import assert from "node:assert/strict";
import { buildFghSeries, nearestSeriesPoint } from "./fghSeries.js";

test("only take expanded nodes and sort by expanded_order", () => {
  const rows = [{
    algorithm: "bfs",
    tree: [
      { created_order: 0, expanded_order: 2, f: 2, g: 2, h: 0 },
      { created_order: 1, expanded_order: null, f: 99, g: 99, h: 99 },
      { created_order: 2, expanded_order: 0, f: 0, g: 0, h: 0 },
    ],
  }];

  const series = buildFghSeries(rows, "f", (key) => key)[0];
  assert.deepEqual(series.orders, [0, 2]);
  assert.deepEqual(series.values, [0, 2]);
});

test("keep h=0 and allow series of different lengths", () => {
  const rows = [
    { algorithm: "bfs", tree: [{ expanded_order: 0, h: 0 }, { expanded_order: 1, h: 0 }] },
    { algorithm: "astar", tree: [{ expanded_order: 0, h: 4 }] },
  ];

  assert.deepEqual(buildFghSeries(rows, "h", (key) => key).map((s) => s.values), [[0, 0], [4]]);
});

test("pick the nearest expanded node on a line", () => {
  const points = [{ order: 0 }, { order: 4 }, { order: 9 }];
  assert.equal(nearestSeriesPoint(points, 6).order, 4);
  assert.equal(nearestSeriesPoint(points, 8).order, 9);
});
