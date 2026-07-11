"""Chạy benchmark các thuật toán tìm kiếm tĩnh trên mọi bản đồ, xuất CSV.

Sinh ra file results.csv với các cột: map, problem, algorithm, heuristic,
found, path_length, cost, nodes_expanded, nodes_generated, max_frontier, time_ms.
Dùng số liệu này để vẽ bảng/biểu đồ so sánh trong báo cáo.

Chạy:  py -3.12 experiments/run_benchmark.py
"""
from __future__ import annotations

import csv
import os
import sys

# Cho phép import package backend khi chạy file trực tiếp.
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Console Windows mặc định cp1252 không in được tiếng Việt -> ép UTF-8.
try:
    sys.stdout.reconfigure(encoding="utf-8")
except (AttributeError, ValueError):
    pass

from backend.game.layout import list_maps, load_layout  # noqa: E402
from backend.game.problem import EatAllFoodProblem, PathToPointProblem, farthest_food  # noqa: E402
from backend.search.heuristics import get_heuristic  # noqa: E402
from backend.search.registry import SEARCH_ALGOS, SEARCH_INFO, is_informed  # noqa: E402

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "results.csv")

# Heuristic mặc định theo loại bài toán.
HEURISTIC_FOR = {
    "eat_all": "farthest_food",
    "path_to_farthest": "manhattan",
}


def build_problem(start, kind):
    if kind == "path_to_farthest":
        goal = farthest_food(start)
        return PathToPointProblem(start, goal) if goal else None
    return EatAllFoodProblem(start)


def run_one(map_name, problem_kind, algo):
    start = load_layout(map_name)
    problem = build_problem(start, problem_kind)
    if problem is None:
        return None
    fn = SEARCH_ALGOS[algo]
    if is_informed(algo):
        h = get_heuristic(HEURISTIC_FOR[problem_kind])
        result = fn(problem, h)
        hname = HEURISTIC_FOR[problem_kind]
    else:
        result = fn(problem)
        hname = "-"
    m = result.metrics
    return {
        "map": map_name,
        "problem": problem_kind,
        "algorithm": algo,
        "heuristic": hname,
        "found": result.found,
        "path_length": m.path_length,
        "cost": m.cost,
        "nodes_expanded": m.nodes_expanded,
        "nodes_generated": m.nodes_generated,
        "max_frontier": m.max_frontier,
        "time_ms": m.time_ms,
    }


def main():
    rows = []
    maps = list_maps()
    algos = list(SEARCH_INFO.keys())  # bfs, dfs, ucs, ids, greedy, astar

    # Không gian trạng thái của bài "ăn hết food" là 2^(số food). Chỉ map nhỏ
    # (small ~ 2^21) là khả thi; medium (~2^70) và classic (~2^96) sẽ bùng nổ
    # nên các map đó chỉ chạy bài "đi tới food gần nhất" (state space = số ô đi được).
    EAT_ALL_MAPS = {"small"}

    for map_name in maps:
        problems = ["path_to_farthest"]
        if map_name in EAT_ALL_MAPS:
            problems.append("eat_all")
        for problem_kind in problems:
            for algo in algos:
                row = run_one(map_name, problem_kind, algo)
                if row is None:
                    continue
                rows.append(row)
                print(
                    f"{map_name:8} {problem_kind:16} {algo:7} "
                    f"len={row['path_length']:4} expanded={row['nodes_expanded']:7} "
                    f"time={row['time_ms']:8.2f}ms"
                )

    with open(OUT, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
        writer.writeheader()
        writer.writerows(rows)
    print(f"\nĐã ghi {len(rows)} dòng vào {OUT}")


if __name__ == "__main__":
    main()
