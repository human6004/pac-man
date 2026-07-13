"""FastAPI app: expose thuật toán tìm kiếm Pac-man qua REST API.

Endpoints:
    GET  /algorithms   - danh sách thuật toán + heuristic
    GET  /maps         - danh sách bản đồ + dữ liệu bản đồ
    GET  /maps/{name}  - chi tiết 1 bản đồ (để frontend render)
    POST /solve        - chạy 1 thuật toán tĩnh, trả path + visited_order + stats
    POST /compare      - chạy nhiều thuật toán tĩnh, trả bảng so sánh
"""
from __future__ import annotations

from typing import Dict, List

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from ..game.layout import list_maps, load_layout
from ..game.problem import EatAllFoodProblem, PathToPointProblem, farthest_cell
from ..game.state import GameState
from ..search.heuristics import get_heuristic
from ..search.registry import (
    SEARCH_ALGOS,
    is_informed,
    is_optimal,
    list_algorithms,
    list_heuristics,
)
from .schemas import CompareRequest, SolveRequest

app = FastAPI(title="Pac-man AI Search API", version="1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


def serialize_map(s: GameState) -> Dict:
    return {
        "width": s.width,
        "height": s.height,
        "walls": [list(p) for p in sorted(s.walls)],
        "food": [list(p) for p in sorted(s.food)],
        "power_pellets": [list(p) for p in sorted(s.power_pellets)],
        "pacman_start": list(s.pacman),
        "ghosts_start": [list(g.pos) for g in s.ghosts],
    }


def build_problem(start: GameState, kind: str, goal=None):
    if kind == "path_to_cell":
        if goal is not None:
            if (
                not isinstance(goal, (list, tuple))
                or len(goal) != 2
                or not all(isinstance(v, int) for v in goal)
            ):
                raise HTTPException(400, "goal phải có dạng [row, col].")
            r, c = int(goal[0]), int(goal[1])
            if not (0 <= r < start.height and 0 <= c < start.width):
                raise HTTPException(400, f"Ô đích ({r},{c}) nằm ngoài bản đồ.")
            if (r, c) in start.walls:
                raise HTTPException(400, f"Ô đích ({r},{c}) là tường, không thể tới.")
            return PathToPointProblem(start, (r, c))
        # Chưa chọn ô -> mặc định ô trống XA nhất (không nhất thiết có food).
        auto_goal = farthest_cell(start)
        if auto_goal is None:
            raise HTTPException(400, "Bản đồ không có ô trống cho bài toán path_to_cell.")
        return PathToPointProblem(start, auto_goal)
    return EatAllFoodProblem(start)


# Bài "ăn hết food" có không gian trạng thái ~2^(số food) -> chỉ khả thi khi
# food ít. Chặn sớm để tránh treo server trên bản đồ lớn (medium/classic).
EAT_ALL_MAX_FOOD = 25
# Heuristic phải khớp loại bài toán, nếu không nó trả 0 và A*/Greedy suy biến:
#   - goal_manhattan (name "manhattan") chỉ có tác dụng cho path_to_cell.
#   - các heuristic dựa trên food chỉ có tác dụng cho eat_all.
# Nếu người dùng chọn heuristic trả 0 cho bài toán đang chạy, tự thay bằng
# heuristic mặc định hợp lý để A* thật sự dùng thông tin (không lặng lẽ = UCS).
_ZERO_FOR_EAT_ALL = {"manhattan", "null"}
_ZERO_FOR_PATH = {"nearest_food", "farthest_food", "food_count"}


def resolve_heuristic(heuristic_name: str, problem_kind: str) -> str:
    if problem_kind == "eat_all" and heuristic_name in _ZERO_FOR_EAT_ALL:
        return "farthest_food"  # admissible -> A* tối ưu và expand ít hơn UCS
    if problem_kind == "path_to_cell" and heuristic_name in _ZERO_FOR_PATH:
        return "manhattan"
    return heuristic_name


def run_static(map_name: str, algo: str, heuristic_name: str, problem_kind: str, goal=None):
    try:
        start = load_layout(map_name)
    except FileNotFoundError:
        raise HTTPException(404, f"Không tìm thấy bản đồ '{map_name}'.")
    if algo not in SEARCH_ALGOS:
        raise HTTPException(400, f"Thuật toán tĩnh '{algo}' không hợp lệ.")

    # Cây luôn bật cho static, nhưng search layer tự cap để demo không làm nặng UI.
    record_tree = True

    if problem_kind == "eat_all" and start.num_food > EAT_ALL_MAX_FOOD:
        raise HTTPException(
            400,
            f"Bản đồ '{map_name}' có {start.num_food} food -> bài 'ăn hết food' "
            f"có không gian trạng thái ~2^{start.num_food}, không thể giải kịp. "
            f"Hãy chọn bản đồ nhỏ (small) cho 'ăn hết food', hoặc dùng bài "
            f"'đi tới food xa nhất' cho bản đồ lớn.",
        )

    problem = build_problem(start, problem_kind, goal)
    fn = SEARCH_ALGOS[algo]

    if is_informed(algo):
        h = get_heuristic(resolve_heuristic(heuristic_name, problem_kind))
        result = fn(problem, h, record_tree=record_tree)
    else:
        result = fn(problem, record_tree=record_tree)
    return result


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------
@app.get("/algorithms")
def get_algorithms():
    return {"algorithms": list_algorithms(), "heuristics": list_heuristics()}


@app.get("/maps")
def get_maps():
    names = list_maps()
    return {"maps": [{"name": n, **serialize_map(load_layout(n))} for n in names]}


@app.get("/maps/{name}")
def get_map(name: str):
    try:
        return serialize_map(load_layout(name))
    except FileNotFoundError:
        raise HTTPException(404, f"Không tìm thấy bản đồ '{name}'.")


@app.post("/solve")
def solve(req: SolveRequest):
    result = run_static(req.map, req.algorithm, req.heuristic, req.problem, req.goal)
    start = load_layout(req.map)
    return {
        "map": serialize_map(start),
        "algorithm": req.algorithm,
        "heuristic": resolve_heuristic(req.heuristic, req.problem) if is_informed(req.algorithm) else None,
        **result.to_dict(),
    }


@app.post("/compare")
def compare(req: CompareRequest):
    rows: List[Dict] = []
    for algo in req.algorithms:
        try:
            result = run_static(req.map, algo, req.heuristic, req.problem, req.goal)
        except HTTPException as e:
            rows.append({"algorithm": algo, "error": e.detail})
            continue
        rows.append(
            {
                "algorithm": algo,
                "found": result.found,
                "optimal": is_optimal(algo, resolve_heuristic(req.heuristic, req.problem)),
                "tree": result.tree,
                "tree_truncated": result.tree_truncated,
                "tree_limit": result.tree_limit,
                "stats": result.metrics.to_dict() if result.metrics else None,
            }
        )
    return {
        "problem": req.problem,
        "results": rows,
    }
