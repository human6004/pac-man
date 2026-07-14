"""Các hàm heuristic cho tìm kiếm có thông tin (Greedy, A*).

Một heuristic h(state) ước lượng chi phí còn lại tới đích. Heuristic được gọi là
ADMISSIBLE nếu không bao giờ ước lượng vượt quá chi phí thực — điều kiện để A* tối ưu.

Các heuristic ở đây phục vụ 2 loại bài toán:
- PathToPointProblem: đi tới 1 ô đích  -> manhattan(pacman, goal)
- EatAllFoodProblem : ăn hết food      -> dựa trên food còn lại
"""
from __future__ import annotations

from typing import Callable

from ..game.problem import EatAllFoodProblem, PathToPointProblem, SearchProblem
from ..game.state import EatAllFoodState, PathState, Position

SearchState = EatAllFoodState | PathState

Heuristic = Callable[[SearchState, SearchProblem], float]


def manhattan(a: Position, b: Position) -> int:
    return abs(a[0] - b[0]) + abs(a[1] - b[1])


def null_heuristic(state: SearchState, problem: SearchProblem) -> float:
    """h = 0 -> A* suy biến thành UCS (tiện so sánh)."""
    return 0.0


def goal_manhattan(state: SearchState, problem: SearchProblem) -> float:
    """Khoảng cách Manhattan tới ô đích (chỉ dùng cho PathToPointProblem).

    Admissible vì mỗi bước đi chỉ giảm khoảng cách Manhattan tối đa 1.
    """
    if isinstance(problem, PathToPointProblem):
        return float(manhattan(state.pacman, problem.goal))
    return 0.0


def nearest_food_dist(state: SearchState, problem: SearchProblem) -> float:
    """Khoảng cách Manhattan tới food GẦN nhất.

    Dùng cho EatAllFoodProblem. ADMISSIBLE (để ăn hết food thì ít nhất phải đi tới
    được miếng gần nhất, nên chi phí thực >= khoảng cách này) nhưng YẾU — đánh giá
    thấp hơn nhiều so với thực tế, nên A* với nó vẫn tối ưu nhưng expand nhiều;
    phù hợp làm heuristic của Greedy hoặc A* "nhanh".
    """
    if not isinstance(state, EatAllFoodState) or not state.food:
        return 0.0
    return float(min(manhattan(state.pacman, food) for food in state.food))


def farthest_food_dist(state: SearchState, problem: SearchProblem) -> float:
    """Khoảng cách tới food XA nhất.

    ADMISSIBLE cho bài toán ăn hết food: muốn ăn hết thì ít nhất phải đi tới được
    miếng xa nhất, nên chi phí thực >= khoảng cách tới miếng xa nhất.
    """
    if not isinstance(state, EatAllFoodState) or not state.food:
        return 0.0
    
    if not state.food:
        return 0.0
    return float(max(manhattan(state.pacman, f) for f in state.food))


def food_count(state: SearchState, problem: SearchProblem) -> float:
    """Số food còn lại. Admissible (mỗi food cần >=1 bước để ăn)."""
    if not isinstance(state, EatAllFoodState):
        return 0.0
    return float(len(state.food))


# Đăng ký để API/benchmark chọn theo tên.
REGISTRY: dict[str, Heuristic] = {
    "null": null_heuristic,
    "manhattan": goal_manhattan,
    "nearest_food": nearest_food_dist,
    "farthest_food": farthest_food_dist,
    "food_count": food_count,
}


def get_heuristic(name: str) -> Heuristic:
    if name not in REGISTRY:
        raise KeyError(f"Heuristic '{name}' không tồn tại. Có: {list(REGISTRY)}")
    return REGISTRY[name]
