"""FastAPI app: expose thuật toán tìm kiếm Pac-man qua REST API.

Endpoints:
    GET  /algorithms   - danh sách thuật toán + heuristic
    GET  /maps         - danh sách bản đồ + dữ liệu bản đồ
    GET  /maps/{name}  - chi tiết 1 bản đồ (để frontend render)
    POST /solve        - chạy 1 thuật toán tĩnh, trả path + visited_order + stats
    POST /compare      - chạy nhiều thuật toán tĩnh, trả bảng so sánh
    POST /adversarial  - mô phỏng cả ván với Minimax/Alpha-Beta/Expectimax, trả các frame
"""
from __future__ import annotations

from typing import Dict, List

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

import random

from ..game.layout import list_maps, load_layout
from ..game.problem import EatAllFoodProblem, PathToPointProblem, farthest_food
from ..game.rules import ghost_legal_actions, is_terminal, result_ghost, result_pacman
from ..game.state import GameState
from ..search.heuristics import get_heuristic
from ..search.registry import (
    ADVERSARIAL_ALGOS,
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


# ---------------------------------------------------------------------------
# Serialize GameState -> JSON cho frontend render
# ---------------------------------------------------------------------------
def serialize_state(s: GameState) -> Dict:
    return {
        "pacman": list(s.pacman),
        "food": [list(p) for p in sorted(s.food)],
        "power_pellets": [list(p) for p in sorted(s.power_pellets)],
        "ghosts": [
            {"pos": list(g.pos), "direction": g.direction.value, "scared": g.scared}
            for g in s.ghosts
        ],
        "score": s.score,
        "scared_timer": s.scared_timer,
        "status": s.status.value,
    }


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


def build_problem(start: GameState, kind: str):
    if kind == "path_to_farthest":
        goal = farthest_food(start)
        if goal is None:
            raise HTTPException(400, "Bản đồ không có food cho bài toán path_to_farthest.")
        return PathToPointProblem(start, goal)
    return EatAllFoodProblem(start)


# Bài "ăn hết food" có không gian trạng thái ~2^(số food) -> chỉ khả thi khi
# food ít. Chặn sớm để tránh treo server trên bản đồ lớn (medium/classic).
EAT_ALL_MAX_FOOD = 25
# IDS trên eat_all rất tốn node (cây lặp lại) -> chặn để khỏi đợi lâu.
EAT_ALL_SLOW_ALGOS = {"ids"}

# Heuristic phải khớp loại bài toán, nếu không nó trả 0 và A*/Greedy suy biến:
#   - goal_manhattan (name "manhattan") chỉ có tác dụng cho path_to_farthest.
#   - các heuristic dựa trên food chỉ có tác dụng cho eat_all.
# Nếu người dùng chọn heuristic trả 0 cho bài toán đang chạy, tự thay bằng
# heuristic mặc định hợp lý để A* thật sự dùng thông tin (không lặng lẽ = UCS).
_ZERO_FOR_EAT_ALL = {"manhattan", "null"}
_ZERO_FOR_PATH = {"nearest_food", "farthest_food", "food_count"}


def resolve_heuristic(heuristic_name: str, problem_kind: str) -> str:
    if problem_kind == "eat_all" and heuristic_name in _ZERO_FOR_EAT_ALL:
        return "farthest_food"  # admissible -> A* tối ưu và expand ít hơn UCS
    if problem_kind == "path_to_farthest" and heuristic_name in _ZERO_FOR_PATH:
        return "manhattan"
    return heuristic_name


def run_static(map_name: str, algo: str, heuristic_name: str, problem_kind: str):
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

    if problem_kind == "eat_all" and algo in EAT_ALL_SLOW_ALGOS:
        raise HTTPException(
            400,
            f"Thuật toán '{algo}' chạy bài 'ăn hết food' rất chậm (lặp lại nhiều "
            f"lần nên expand hàng trăm nghìn node). Hãy chọn thuật toán khác "
            f"(bfs/ucs/astar) cho 'ăn hết food', hoặc dùng '{algo}' với bài "
            f"'đi tới food xa nhất'.",
        )

    problem = build_problem(start, problem_kind)
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
    result = run_static(req.map, req.algorithm, req.heuristic, req.problem)
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
            result = run_static(req.map, algo, req.heuristic, req.problem)
        except HTTPException as e:
            rows.append({"algorithm": algo, "error": e.detail})
            continue
        rows.append(
            {
                "algorithm": algo,
                "found": result.found,
                "optimal": is_optimal(algo, resolve_heuristic(req.heuristic, req.problem)),
                "path": [list(p) for p in result.path],
                "visited_order": [list(p) for p in result.visited_order],
                "tree": result.tree,
                "tree_truncated": result.tree_truncated,
                "tree_limit": result.tree_limit,
                "stats": result.metrics.to_dict() if result.metrics else None,
            }
        )
    return {
        "map": serialize_map(load_layout(req.map)),
        "problem": req.problem,
        "results": rows,
    }


@app.post("/adversarial")
def adversarial(req: dict):
    """Mô phỏng cả ván đối kháng. Body: {map, algorithm, depth, max_steps}.

    Trả về danh sách frame (state qua từng bước) + thống kê tổng.
    """
    map_name = req.get("map", "small")
    algo = req.get("algorithm", "alphabeta")
    depth = int(req.get("depth", 3))
    max_steps = int(req.get("max_steps", 200))

    if algo not in ADVERSARIAL_ALGOS:
        raise HTTPException(400, f"Thuật toán đối kháng '{algo}' không hợp lệ.")
    try:
        state = load_layout(map_name)
    except FileNotFoundError:
        raise HTTPException(404, f"Không tìm thấy bản đồ '{map_name}'.")

    fn = ADVERSARIAL_ALGOS[algo]
    frames = [serialize_state(state)]
    total_expanded = 0
    total_time = 0.0
    steps = 0

    for _ in range(max_steps):
        if is_terminal(state) or not state.food:
            break
        # Pac-man chọn nước đi bằng thuật toán đối kháng.
        action, _value, metrics = fn(state, depth)
        total_expanded += metrics.nodes_expanded
        total_time += metrics.time_ms
        if action is None:
            break
        state = result_pacman(state, action)
        steps += 1
        frames.append(serialize_state(state))
        if is_terminal(state):
            break
        # Ma di chuyển ngẫu nhiên (môi trường), từng con một.
        for idx in range(len(state.ghosts)):
            actions = ghost_legal_actions(state, state.ghosts[idx])
            state = result_ghost(state, idx, random.choice(actions))
            if is_terminal(state):
                break
        frames.append(serialize_state(state))
        if is_terminal(state):
            break

    return {
        "map": serialize_map(load_layout(map_name)),
        "algorithm": algo,
        "depth": depth,
        "frames": frames,
        "stats": {
            "steps": steps,
            "nodes_expanded": total_expanded,
            "time_ms": round(total_time, 3),
            "final_score": state.score,
            "status": state.status.value,
        },
    }
