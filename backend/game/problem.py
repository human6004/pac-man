"""Đóng gói bài toán tìm kiếm TĨNH (single-agent) cho Pac-man.

Một SearchProblem chuẩn AIMA gồm:
    - initial_state()         : trạng thái ban đầu
    - is_goal(state)          : kiểm tra đích
    - actions(state)          : các hành động hợp lệ
    - result(state, action)   : trạng thái kế tiếp
    - step_cost(s, a, s2)     : chi phí 1 bước

Hai biến thể bài toán tĩnh:
    - PathToPointProblem : đi từ Pac-man tới MỘT ô đích (minh họa rõ BFS/A*).
    - EatAllFoodProblem  : ăn HẾT thức ăn (không gian trạng thái lớn hơn).
"""
from __future__ import annotations

from abc import ABC, abstractmethod
from typing import FrozenSet

from .operators import move_pacman, pacman_legal_actions, STEP_COST
from .state import Direction, EatAllFoodState, Maze, PathState, Position

class SearchProblem(ABC):
    """Giao diện chung cho các bài toán tìm kiếm Pac-man tĩnh."""
    
    @abstractmethod
    def initial_state(self) -> PathState | EatAllFoodState:
        """Trả về trạng thái đầu."""
        
    @abstractmethod
    def is_goal(self, state: PathState | EatAllFoodState) -> bool:
        """Kiểm tra state có phải goal."""
        
    @abstractmethod
    def actions(self, state: PathState | EatAllFoodState) -> list[Direction]:
        """Trả về các action hợp lệ."""

    @abstractmethod
    def result(self, state: PathState | EatAllFoodState, action: Direction) -> PathState | EatAllFoodState:
        """Tạo state mới sau action."""

    def step_cost(self, _state, _action, _next) -> float:
        """Mọi action có cost bằng 1."""
        return STEP_COST


class EatAllFoodProblem(SearchProblem):
    """Mục tiêu: ăn hết toàn bộ food. State là FoodState(pacman, food)."""

    def __init__(
        self,
        maze: Maze,
        pacman_start: Position,
        initial_food: FrozenSet[Position],
    ):
        self.maze = maze
        self._start = EatAllFoodState(pacman=pacman_start, food=initial_food)

    def initial_state(self) -> EatAllFoodState:
        return self._start

    def is_goal(self, state: EatAllFoodState) -> bool:
        return not state.food  # hết food -> win

    def actions(self, state: EatAllFoodState) -> list[Direction]:
        return pacman_legal_actions(self.maze, state.pacman)

    def result(self, state: EatAllFoodState, action: Direction) -> EatAllFoodState:
        pacman = move_pacman(self.maze, state.pacman, action)
        food = state.food - {pacman}  # ăn food nếu có
        return EatAllFoodState(pacman=pacman, food=food)


class PathToPointProblem(SearchProblem):
    """Mục tiêu: Pac-man đi tới ô `goal`. State = vị trí Pac-man (PathState). """

    def __init__(self, maze: Maze, pacman_start: Position, goal: Position):
        self.maze = maze
        self._start = PathState(pacman_start)
        self.goal = goal


    def initial_state(self) -> PathState:
        return self._start

    def is_goal(self, state: PathState) -> bool:
        return state.pacman == self.goal

    def actions(self, state: PathState) -> list[Direction]:
        return pacman_legal_actions(self.maze, state.pacman)

    def result(self, state: PathState, action: Direction) -> PathState:
        pacman = move_pacman(self.maze, state.pacman, action)
        return PathState(pacman=pacman)

# def nearest_food(state: EatAllDotsState) -> Position | None:
#     """Trả về ô food gần nhất theo Manhattan (tiện tạo PathToPointProblem)."""
#     if not state.food:
#         return None
#     pr, pc = state.pacman
#     return min(state.food, key=lambda f: abs(f[0] - pr) + abs(f[1] - pc))


# def farthest_food(state: EatAllDotsState) -> Position | None:
#     """Trả về ô food XA nhất theo Manhattan.

#     Dùng cho bài minh họa "đi tới 1 ô đích": food xa nhất tạo đường đi dài, nhờ đó
#     phân biệt rõ đặc tính các thuật toán (BFS/UCS/A* tối ưu, DFS/Greedy có thể dài hơn).
#     Ngược lại food gần nhất trên các bản đồ này thường kề ngay Pac-man -> mọi thuật
#     toán chỉ đi 1 bước, không so sánh được gì.
#     """
#     if not state.food:
#         return None
#     pr, pc = state.pacman
#     return max(state.food, key=lambda f: abs(f[0] - pr) + abs(f[1] - pc))

def nearest_food(food: FrozenSet[Position], pacman: Position) -> Position | None:
    """Trả về food gần Pac-man nhất theo Manhattan."""
    if not food:
        return None

    row, col = pacman
    return min(food, key=lambda pos: abs(pos[0] - row) + abs(pos[1] - col))


def farthest_food(food: FrozenSet[Position], pacman: Position) -> Position | None:
    """Trả về food xa Pac-man nhất theo Manhattan."""
    if not food:
        return None

    row, col = pacman
    return max(food, key=lambda pos: abs(pos[0] - row) + abs(pos[1] - col))
