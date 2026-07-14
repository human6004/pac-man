from __future__ import annotations

from dataclasses import dataclass
from enum import Enum
from typing import FrozenSet, Tuple, TypeAlias

Position: TypeAlias  = Tuple[int, int]  # (row, col)

class Direction(str, Enum):
    UP = "UP"
    DOWN = "DOWN"
    LEFT = "LEFT"
    RIGHT = "RIGHT"

# Vector di chuyển (drow, dcol) cho từng hướng.
MOVES = {
    Direction.UP: (-1, 0),
    Direction.DOWN: (1, 0),
    Direction.LEFT: (0, -1),
    Direction.RIGHT: (0, 1),
}

# class Status(str, Enum):
#     PLAYING = "playing"
#     WIN = "win"
    
@dataclass(frozen=True)
class Maze:
    walls: FrozenSet[Position]  # tập hợp các vị trí tường
    width: int  # chiều rộng của mê cung
    height: int  # chiều cao của mê cung
    
    def in_bounds(self, position: Position) -> bool:
        """Kiểm tra xem vị trí có nằm trong biên của mê cung không."""
        row, col = position
        return 0 <= row < self.height and 0 <= col < self.width
    
    def is_wall(self, position: Position) -> bool:
        """Kiểm tra xem vị trí có phải là tường không."""
        return position in self.walls
    
@dataclass(frozen=True)
class GameMap:
    """Dữ liệu map ban đầu đọc từ file.

    Không phải state của thuật toán tìm kiếm.
    Mỗi SearchProblem dùng dữ liệu này để tạo initial state phù hợp.
    """
    maze: Maze  # mê cung
    pacman_start: Position  # vị trí ban đầu của Pacman
    initial_food: FrozenSet[Position]  # tập hợp các vị trí thức ăn ban đầu

#object không thể sửa sau khi tạo -> vì mỗi action tạo state mới
@dataclass(frozen=True)
class PathState:
    """State Pathfinding: chỉ vị trí Pac-man."""
    pacman: Position  # vị trí hiện tại của Pacman

@dataclass(frozen=True)
class EatAllFoodState:
    """State Eat-all-dots: vị trí Pac-man và các vị trí thức ăn còn lại."""
    pacman: Position
    food: FrozenSet[Position]  # tập hợp các vị trí còn lại của thức ăn
    

