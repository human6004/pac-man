"""Luật chơi: legal actions, transition model, terminal test.

Tách thành 2 nhóm hàm:
- Nhóm dùng chung: legal_actions, move (di chuyển Pac-man, ăn food/pellet).
- Nhóm đối kháng: result_with_ghosts (Pac-man đi rồi ma đi), dùng cho game thực
  và cho Minimax/Expectimax.
"""
from __future__ import annotations

from dataclasses import replace
from typing import List

from .state import Direction, GameState, Ghost, MOVES, Position, Status

FOOD_REWARD = 10
PELLET_REWARD = 50
EAT_GHOST_REWARD = 200
STEP_COST = 1          # phạt mỗi bước (score game thực trừ 1 mỗi bước)
LOSE_PENALTY = 500
WIN_REWARD = 500
SCARED_DURATION = 20   # số bước ma sợ sau khi ăn power pellet


def _add(pos: Position, d: Direction) -> Position:
    dr, dc = MOVES[d]
    r, c = pos
    return (r + dr, c + dc)


def legal_actions(state: GameState, pos: Position, include_stop: bool = False) -> List[Direction]:
    """Các hướng đi không đâm vào tường / không ra ngoài bản đồ, tính từ `pos`."""
    actions: List[Direction] = []
    for d in (Direction.UP, Direction.DOWN, Direction.LEFT, Direction.RIGHT):
        nxt = _add(pos, d)
        if state.in_bounds(nxt) and not state.is_wall(nxt):
            actions.append(d)
    if include_stop:
        actions.append(Direction.STOP)
    return actions


def pacman_legal_actions(state: GameState, include_stop: bool = False) -> List[Direction]:
    return legal_actions(state, state.pacman, include_stop)


def move_pacman(state: GameState, action: Direction) -> GameState:
    """Di chuyển Pac-man 1 bước, xử lý ăn food/pellet và cập nhật điểm.

    Chưa xử lý ma — dùng cho bài toán TĨNH và làm nửa đầu của bước đối kháng.
    """
    new_pos = _add(state.pacman, action)
    if not state.in_bounds(new_pos) or state.is_wall(new_pos):
        new_pos = state.pacman  # action không hợp lệ -> đứng yên

    food = state.food
    pellets = state.power_pellets
    score = state.score - STEP_COST
    scared_timer = max(0, state.scared_timer - 1)
    ghosts = state.ghosts

    if new_pos in food:
        food = food - {new_pos}
        score += FOOD_REWARD
    if new_pos in pellets:
        pellets = pellets - {new_pos}
        score += PELLET_REWARD
        scared_timer = SCARED_DURATION
        ghosts = tuple(replace(g, scared=True) for g in ghosts)

    status = state.status
    if not food:
        status = Status.WIN
        score += WIN_REWARD

    return replace(
        state,
        pacman=new_pos,
        food=food,
        power_pellets=pellets,
        ghosts=ghosts,
        score=score,
        scared_timer=scared_timer,
        status=status,
    )


def is_terminal(state: GameState) -> bool:
    return state.status in (Status.WIN, Status.LOSE)


def is_goal_static(state: GameState) -> bool:
    """Goal của bài toán tĩnh: ăn hết thức ăn."""
    return len(state.food) == 0


def _check_collision(state: GameState) -> GameState:
    """Kiểm tra Pac-man va chạm ma. Trả về state đã cập nhật status/score."""
    new_ghosts = list(state.ghosts)
    score = state.score
    for i, g in enumerate(new_ghosts):
        if g.pos == state.pacman:
            if state.scared_timer > 0 and g.scared:
                # Ăn ma: ma hồi sinh (ở đây đơn giản là loại trạng thái sợ, giữ vị trí)
                score += EAT_GHOST_REWARD
                new_ghosts[i] = replace(g, scared=False)
            else:
                return replace(state, status=Status.LOSE, score=score - LOSE_PENALTY)
    return replace(state, ghosts=tuple(new_ghosts), score=score)


def ghost_legal_actions(state: GameState, ghost: Ghost) -> List[Direction]:
    """Hướng đi hợp lệ của 1 con ma (không quay đầu trừ khi bí đường)."""
    actions = legal_actions(state, ghost.pos)
    if not actions:
        return [Direction.STOP]
    reverse = {
        Direction.UP: Direction.DOWN,
        Direction.DOWN: Direction.UP,
        Direction.LEFT: Direction.RIGHT,
        Direction.RIGHT: Direction.LEFT,
    }.get(ghost.direction)
    non_reverse = [a for a in actions if a != reverse]
    return non_reverse if non_reverse else actions


def move_ghost(state: GameState, index: int, action: Direction) -> GameState:
    """Di chuyển con ma thứ `index` theo `action`."""
    g = state.ghosts[index]
    new_pos = _add(g.pos, action)
    if not state.in_bounds(new_pos) or state.is_wall(new_pos):
        new_pos = g.pos
        action = Direction.STOP
    new_g = replace(g, pos=new_pos, direction=action)
    ghosts = state.ghosts[:index] + (new_g,) + state.ghosts[index + 1 :]
    return replace(state, ghosts=ghosts)


def result_pacman(state: GameState, action: Direction) -> GameState:
    """Bước đối kháng phía Pac-man: di chuyển rồi kiểm tra va chạm ngay."""
    moved = move_pacman(state, action)
    if is_terminal(moved):
        return moved
    return _check_collision(moved)


def result_ghost(state: GameState, index: int, action: Direction) -> GameState:
    """Bước đối kháng phía ma thứ `index`: di chuyển rồi kiểm tra va chạm."""
    moved = move_ghost(state, index, action)
    return _check_collision(moved)
