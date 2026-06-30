"""Hàm đánh giá (evaluation function) cho tìm kiếm đối kháng.

Khi cây Minimax/Expectimax bị cắt ở độ sâu giới hạn (depth-limited), ta không
đi tới được trạng thái terminal nên cần một hàm `evaluate(state)` ước lượng
"độ tốt" của trạng thái cho Pac-man (MAX). Giá trị càng lớn càng có lợi.

Công thức tuyến tính (kết hợp các đặc trưng):
    eval(s) = score
              - W_FOOD_DIST   * (khoảng cách tới food gần nhất)
              - W_FOOD_LEFT   * (số food còn lại)
              + W_GHOST_NEAR  * (phạt khi ở gần ma KHÔNG sợ)
              + W_SCARED      * (thưởng khi ở gần ma ĐANG sợ -> ăn được)
"""
from __future__ import annotations

from ..game.state import GameState, Status

W_FOOD_DIST = 1.0
W_FOOD_LEFT = 10.0
W_GHOST_DANGER = 200.0   # phạt nặng khi sát ma nguy hiểm
W_SCARED_BONUS = 20.0


def _manhattan(a, b) -> int:
    return abs(a[0] - b[0]) + abs(a[1] - b[1])


def evaluate(state: GameState) -> float:
    """Ước lượng giá trị trạng thái cho Pac-man (MAX). Lớn = tốt."""
    if state.status == Status.WIN:
        return float("inf")
    if state.status == Status.LOSE:
        return float("-inf")

    value = float(state.score)

    # 1) Gần food thì tốt -> trừ khoảng cách tới food gần nhất.
    if state.food:
        nearest = min(_manhattan(state.pacman, f) for f in state.food)
        value -= W_FOOD_DIST * nearest

    # 2) Càng ít food còn lại càng tốt.
    value -= W_FOOD_LEFT * len(state.food)

    # 3) Ma: nguy hiểm thì tránh, đang sợ thì lao tới.
    for g in state.ghosts:
        dist = _manhattan(state.pacman, g.pos)
        if g.scared and state.scared_timer > 0:
            value += W_SCARED_BONUS / (dist + 1)          # gần ma sợ -> thưởng
        else:
            if dist <= 1:
                value -= W_GHOST_DANGER                    # sát ma -> phạt nặng
            else:
                value -= W_GHOST_DANGER / (dist * dist)    # gần ma -> phạt nhẹ dần
    return value
