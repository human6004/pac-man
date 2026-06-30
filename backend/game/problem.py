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
from typing import List, Tuple

from .state import Direction, GameState, Position
from .rules import move_pacman, pacman_legal_actions, STEP_COST


class SearchProblem(ABC):
    @abstractmethod
    def initial_state(self) -> GameState: ...

    @abstractmethod
    def is_goal(self, state: GameState) -> bool: ...

    @abstractmethod
    def actions(self, state: GameState) -> List[Direction]: ...

    @abstractmethod
    def result(self, state: GameState, action: Direction) -> GameState: ...

    def step_cost(self, state: GameState, action: Direction, nxt: GameState) -> float:
        return 1.0

    def state_key(self, state: GameState):
        """Khóa định danh state để bỏ vào tập đã thăm."""
        return state.search_key()


class EatAllFoodProblem(SearchProblem):
    """Mục tiêu: ăn hết toàn bộ food. Khóa state = (pacman, food)."""

    def __init__(self, start: GameState):
        self._start = start

    def initial_state(self) -> GameState:
        return self._start

    def is_goal(self, state: GameState) -> bool:
        return len(state.food) == 0

    def actions(self, state: GameState) -> List[Direction]:
        return pacman_legal_actions(state)

    def result(self, state: GameState, action: Direction) -> GameState:
        return move_pacman(state, action)

    def step_cost(self, state, action, nxt) -> float:
        return float(STEP_COST)


class PathToPointProblem(SearchProblem):
    """Mục tiêu: Pac-man đi tới ô `goal`. Khóa state = vị trí Pac-man."""

    def __init__(self, start: GameState, goal: Position):
        self._start = start
        self._goal = goal

    def initial_state(self) -> GameState:
        return self._start

    def is_goal(self, state: GameState) -> bool:
        return state.pacman == self._goal

    def actions(self, state: GameState) -> List[Direction]:
        return pacman_legal_actions(state)

    def result(self, state: GameState, action: Direction) -> GameState:
        return move_pacman(state, action)

    def step_cost(self, state, action, nxt) -> float:
        return 1.0

    def state_key(self, state: GameState) -> Position:
        return state.pacman

    @property
    def goal(self) -> Position:
        return self._goal


def nearest_food(state: GameState) -> Position | None:
    """Trả về ô food gần nhất theo Manhattan (tiện tạo PathToPointProblem)."""
    if not state.food:
        return None
    pr, pc = state.pacman
    return min(state.food, key=lambda f: abs(f[0] - pr) + abs(f[1] - pc))
