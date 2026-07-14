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
from ..game.problem import EatAllFoodProblem, PathToPointProblem, farthest_food
from ..game.state import GameMap
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


def serialize_map(game_map: GameMap) -> Dict:
    return {
        "width": game_map.maze.width,
        "height": game_map.maze.height,
        "walls": [list(pos) for pos in sorted(game_map.maze.walls)],
        "food": [list(pos) for pos in sorted(game_map.initial_food)],
        "pacman_start": list(game_map.pacman_start),
        "ghosts_start": [],
    }


def build_problem(
    game_map: GameMap,
    kind: str,
    goal: list[int] | None = None,
) -> EatAllFoodProblem | PathToPointProblem:
    if kind == "eat_all":
        return EatAllFoodProblem(
            game_map.maze,
            game_map.pacman_start,
            game_map.initial_food,
        )

    if kind != "path_to_cell":
        raise HTTPException(400, f"Bài toán '{kind}' không hợp lệ.")

    if goal is None:
        target = farthest_food(
            game_map.initial_food,
            game_map.pacman_start,
        )
        if target is None:
            raise HTTPException(400, "Bản đồ không có food để chọn goal.")
    else:
        if len(goal) != 2:
            raise HTTPException(400, "Goal phải có dạng [row, col].")
        target = (goal[0], goal[1])

    if not game_map.maze.in_bounds(target):
        raise HTTPException(400, "Goal nằm ngoài bản đồ.")
    if game_map.maze.is_wall(target):
        raise HTTPException(400, "Goal không được nằm trên tường.")

    return PathToPointProblem(
        game_map.maze,
        game_map.pacman_start,
        target,
    )

# Bài "ăn hết food" có không gian trạng thái ~2^(số food) -> chỉ khả thi khi
# food ít. Chặn sớm để tránh treo server trên bản đồ lớn (medium/classic).
EAT_ALL_MAX_FOOD = 25
# Heuristic phải khớp loại bài toán, nếu không nó trả 0 và A*/Greedy suy biến:
#   - goal_manhattan (name "manhattan") chỉ có tác dụng cho path_to_cell.
#   - các heuristic dựa trên food chỉ có tác dụng cho eat_all.
# Nếu người dùng chọn heuristic trả 0 cho bài toán đang chạy, tự thay bằng
# heuristic mặc định hợp lý để A* thật sự dùng thông tin (không lặng lẽ = UCS).
_ZERO_FOR_EAT_ALL = {"manhattan"}
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

    food_count = len(start.initial_food)

    if problem_kind == "eat_all" and food_count > EAT_ALL_MAX_FOOD:
        raise HTTPException(
            400,
            f"Bản đồ '{map_name}' có {food_count} food; hãy chọn bản đồ nhỏ hơn.",
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
