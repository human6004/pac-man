"""Đăng ký (registry) các thuật toán để API và benchmark gọi theo tên.

Tách 2 nhóm:
- SEARCH_ALGOS  : thuật toán tìm kiếm tĩnh (nhận SearchProblem -> SearchResult).
- ADVERSARIAL   : thuật toán đối kháng (nhận state, depth -> action, value, metrics).
"""
from __future__ import annotations

from typing import Callable, Dict, List

from . import adversarial, informed, uninformed
from .heuristics import REGISTRY as HEURISTICS

# --- Thông tin mô tả từng thuật toán (để FE hiển thị) ---
SEARCH_INFO = {
    "bfs": {"name": "Breadth-First Search", "group": "uninformed", "uses_heuristic": False},
    "dfs": {"name": "Depth-First Search", "group": "uninformed", "uses_heuristic": False},
    "ucs": {"name": "Uniform-Cost Search", "group": "uninformed", "uses_heuristic": False},
    "ids": {"name": "Iterative Deepening Search", "group": "uninformed", "uses_heuristic": False},
    "greedy": {"name": "Greedy Best-First Search", "group": "informed", "uses_heuristic": True},
    "astar": {"name": "A* Search", "group": "informed", "uses_heuristic": True},
}

ADVERSARIAL_INFO = {
    "minimax": {"name": "Minimax (depth-limited)", "group": "adversarial"},
    "alphabeta": {"name": "Alpha-Beta Pruning", "group": "adversarial"},
    "expectimax": {"name": "Expectimax", "group": "adversarial"},
}

# --- Hàm dựng lời giải tĩnh ---
SEARCH_ALGOS: Dict[str, Callable] = {
    "bfs": uninformed.bfs,
    "dfs": uninformed.dfs,
    "ucs": uninformed.ucs,
    "ids": uninformed.ids,
    "greedy": informed.greedy,
    "astar": informed.astar,
}

ADVERSARIAL_ALGOS: Dict[str, Callable] = {
    "minimax": adversarial.minimax,
    "alphabeta": adversarial.alphabeta,
    "expectimax": adversarial.expectimax,
}


# Thuật toán luôn tối ưu (cost đều = 1), không phụ thuộc heuristic.
OPTIMAL_ALGOS = {"bfs", "ucs", "ids"}

# A* chỉ tối ưu khi heuristic ADMISSIBLE. Liệt kê tường minh để nếu sau này thêm
# heuristic non-admissible thì cột "Optimal" không dán nhãn sai.
ADMISSIBLE_HEURISTICS = {"null", "manhattan", "nearest_food", "farthest_food", "food_count"}


def is_informed(algo: str) -> bool:
    return SEARCH_INFO.get(algo, {}).get("uses_heuristic", False)


def is_optimal(algo: str, heuristic: str = "") -> bool:
    """Thuật toán có đảm bảo lời giải tối ưu không (cột Optimal trong bảng).

    A* tối ưu <=> heuristic admissible; Greedy không bao giờ tối ưu.
    """
    if algo == "astar":
        return heuristic in ADMISSIBLE_HEURISTICS
    return algo in OPTIMAL_ALGOS


def list_algorithms() -> List[dict]:
    """Danh sách thuật toán (cho GET /algorithms)."""
    out = []
    for key, info in {**SEARCH_INFO, **ADVERSARIAL_INFO}.items():
        out.append({"key": key, **info})
    return out


def list_heuristics() -> List[str]:
    return list(HEURISTICS.keys())
