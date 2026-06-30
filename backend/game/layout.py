"""Đọc bản đồ mê cung từ file text và dựng GameState ban đầu.

Quy ước ký tự trong file layout:
    '%'  -> tường (wall)
    '.'  -> thức ăn (food)
    'o'  -> power pellet
    'P'  -> vị trí xuất phát Pac-man
    'G'  -> vị trí xuất phát ma (ghost)
    ' '  -> ô trống
"""
from __future__ import annotations

import os
from typing import List, Optional

from .state import Direction, GameState, Ghost, Position, Status

WALL = "%"
FOOD = "."
PELLET = "o"
PACMAN = "P"
GHOST = "G"
EMPTY = " "

MAPS_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "maps")


def parse_layout(text: str) -> GameState:
    """Phân tích chuỗi layout thành GameState ban đầu."""
    lines = text.splitlines()
    # Bỏ dòng trống thừa ở đầu/cuối, giữ nguyên nội dung bản đồ.
    while lines and lines[0].strip() == "":
        lines.pop(0)
    while lines and lines[-1].strip() == "":
        lines.pop()

    height = len(lines)
    width = max(len(line) for line in lines) if lines else 0

    walls = set()
    food = set()
    pellets = set()
    pacman: Optional[Position] = None
    ghosts: List[Ghost] = []

    for r, line in enumerate(lines):
        for c, ch in enumerate(line):
            pos = (r, c)
            if ch == WALL:
                walls.add(pos)
            elif ch == FOOD:
                food.add(pos)
            elif ch == PELLET:
                pellets.add(pos)
            elif ch == PACMAN:
                pacman = pos
            elif ch == GHOST:
                ghosts.append(Ghost(pos=pos, direction=Direction.STOP))

    if pacman is None:
        raise ValueError("Layout phải có ký tự 'P' cho vị trí Pac-man.")

    return GameState(
        pacman=pacman,
        food=frozenset(food),
        power_pellets=frozenset(pellets),
        ghosts=tuple(ghosts),
        score=0,
        scared_timer=0,
        status=Status.PLAYING,
        walls=frozenset(walls),
        width=width,
        height=height,
    )


def load_layout(name: str) -> GameState:
    """Nạp bản đồ theo tên (không cần đuôi .txt) từ thư mục maps/."""
    filename = name if name.endswith(".txt") else f"{name}.txt"
    path = os.path.join(MAPS_DIR, filename)
    with open(path, "r", encoding="utf-8") as f:
        return parse_layout(f.read())


def list_maps() -> List[str]:
    """Liệt kê tên các bản đồ khả dụng (bỏ đuôi .txt)."""
    if not os.path.isdir(MAPS_DIR):
        return []
    return sorted(f[:-4] for f in os.listdir(MAPS_DIR) if f.endswith(".txt"))
