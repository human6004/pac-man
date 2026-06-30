"""Mô hình trạng thái (State) cho bài toán Pac-man.

GameState là trạng thái BẤT BIẾN (immutable) để dùng trong tìm kiếm:
mỗi lần result(s, a) tạo ra một GameState mới, không sửa state cũ.
Nhờ vậy state có thể băm (hash) và đưa vào tập `visited` của các thuật toán.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from typing import FrozenSet, Tuple, Optional

Position = Tuple[int, int]  # (row, col)


class Direction(str, Enum):
    UP = "UP"
    DOWN = "DOWN"
    LEFT = "LEFT"
    RIGHT = "RIGHT"
    STOP = "STOP"


# Vector di chuyển (drow, dcol) cho từng hướng.
MOVES = {
    Direction.UP: (-1, 0),
    Direction.DOWN: (1, 0),
    Direction.LEFT: (0, -1),
    Direction.RIGHT: (0, 1),
    Direction.STOP: (0, 0),
}


class Status(str, Enum):
    PLAYING = "playing"
    WIN = "win"
    LOSE = "lose"


@dataclass(frozen=True)
class Ghost:
    pos: Position
    direction: Direction = Direction.STOP
    scared: bool = False


@dataclass(frozen=True)
class GameState:
    """Trạng thái đầy đủ của trò chơi.

    `walls` và `width/height` là cố định theo bản đồ; ta vẫn lưu trong state
    để các hàm transition tự chứa thông tin, nhưng KHÔNG đưa vào hash/eq
    (chúng giống nhau với mọi state của cùng bản đồ).
    """

    pacman: Position
    food: FrozenSet[Position]
    power_pellets: FrozenSet[Position]
    ghosts: Tuple[Ghost, ...] = ()
    score: int = 0
    scared_timer: int = 0
    status: Status = Status.PLAYING

    # Thông tin bản đồ — loại khỏi so sánh để hash nhanh và đúng ngữ nghĩa.
    walls: FrozenSet[Position] = field(default=frozenset(), compare=False, hash=False)
    width: int = field(default=0, compare=False, hash=False)
    height: int = field(default=0, compare=False, hash=False)

    def is_wall(self, pos: Position) -> bool:
        return pos in self.walls

    def in_bounds(self, pos: Position) -> bool:
        r, c = pos
        return 0 <= r < self.height and 0 <= c < self.width

    @property
    def num_food(self) -> int:
        return len(self.food)

    def search_key(self) -> Tuple:
        """Khóa rút gọn cho bài toán TĨNH (single-agent).

        Trong tìm kiếm tĩnh, hai state tương đương khi cùng vị trí Pac-man và
        cùng tập food còn lại; ma/score không ảnh hưởng tới lời giải đường đi.
        """
        return (self.pacman, self.food)
