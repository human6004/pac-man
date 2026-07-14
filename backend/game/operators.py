"""Luật di chuyển Pac-man cho các bài toán tìm kiếm tĩnh."""
from __future__ import annotations

from .state import Direction, MOVES, Maze, Position

STEP_COST = 1.0  # chi phí mỗi bước di chuyển

def _next_position(pos: Position, action: Direction) -> Position:
    row_delta, col_delta  = MOVES[action] #cập nhật vector di chuyển theo hướng action
    row, col = pos #lấy tọa độ hiện tại
    return (row + row_delta, col + col_delta) #trả về tọa độ mới sau khi di chuyển

def pacman_legal_actions(maze: Maze, pos: Position) -> list[Direction]:
    """Trả về danh sách các hướng đi hợp lệ từ vị trí `pos`. -> Các hành động có thể thực hiện được từ vị trí hiện tại."""
    actions: list[Direction] = []
    for action in Direction:
        next_pos = _next_position(pos, action)
        if maze.in_bounds(next_pos) and not maze.is_wall(next_pos):
            actions.append(action)
    return actions

def move_pacman(maze: Maze, pos: Position, action: Direction) -> Position:
    """Trả vị trí mới sau một action hợp lệ."""
    next_pos = _next_position(pos, action)
    if not maze.in_bounds(next_pos) or maze.is_wall(next_pos):
        raise ValueError(f"Action {action.value} không hợp lệ tại {pos}.")
    
    return _next_position(pos, action)
