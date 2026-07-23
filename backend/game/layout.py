"""Đọc bản đồ mê cung từ file text và dựng GameMap ban đầu.

Quy ước ký tự trong file layout:
    '%'  -> tường (wall)
    '.'  -> thức ăn (food)
    'P'  -> vị trí xuất phát Pac-man
    ' '  -> ô trống
"""
from __future__ import annotations

import os
from typing import List, Optional

from .state import GameMap, Position, Maze

WALL = "%"
FOOD = "."
PACMAN = "P"
EMPTY = " "
VALID_SYMBOLS = {WALL, FOOD, PACMAN, EMPTY}
BACKEND_DIR = os.path.dirname(os.path.dirname(__file__))
MAPS_DIR = os.path.join(BACKEND_DIR, "maps")
def parse_layout(text: str) -> GameMap:
    """Phân tích chuỗi layout thành GameMap ban đầu."""
    lines = text.splitlines()

    # Bỏ dòng trống thừa ở đầu/cuối, giữ nguyên nội dung bản đồ.
    while lines and lines[0].strip() == "":
        lines.pop(0)
    while lines and lines[-1].strip() == "":
        lines.pop()

    if not lines:
        raise ValueError("Layout không được rỗng.")
    
    height = len(lines)
    width = len(lines[0])
    if not 4 <= height <= 9 or not 4 <= width <= 9:
        raise ValueError("Map phải có kích thước từ 4x4 đến 9x9.")

    # Kiểm tra tính hợp lệ của layout
    for row, line in enumerate(lines):
        for col, char in enumerate(line):
            if char not in VALID_SYMBOLS:
                raise ValueError(
                    f"Ký tự {char!r} không hợp lệ tại hàng {row}, cột {col}."
                )
            
    if any(len(line) != width for line in lines):
        raise ValueError("Các dòng layout phải có cùng chiều rộng.")

    pacman_count = sum(line.count(PACMAN) for line in lines)
    
    if pacman_count != 1:
        raise ValueError(
            f"Layout phải có đúng một ký tự 'P'; tìm thấy {pacman_count}."
        )

    #Kiểm tra viền ma trận
    top_or_bottom_open = any(
        char != WALL
        for line in (lines[0], lines[-1])
        for char in line
    )
    left_or_right_open = any(
        line[0] != WALL or line[-1] != WALL
        for line in lines
    )
    
    if top_or_bottom_open or left_or_right_open:
        raise ValueError("Viền ngoài phải kín bằng ký tự '%'.")

    walls = set()
    food = set()
    pacman: Optional[Position] = None

    for r, line in enumerate(lines):
        for c, ch in enumerate(line):
            pos = (r, c)
            if ch == WALL:
                walls.add(pos)
            elif ch == FOOD:
                food.add(pos)
            elif ch == PACMAN:
                pacman = pos

    if pacman is None:
        raise ValueError("Layout phải có một Pac-man.")

    if len(food) > 7:
        raise ValueError("Map chỉ được có tối đa 7 thức ăn.")

    return GameMap(
        maze=Maze(
            walls=frozenset(walls),
            width=width,
            height=height,
        ),
        pacman_start=pacman,
        initial_food=frozenset(food),
    )

def load_layout(name: str) -> GameMap:
    """Nạp bản đồ theo tên (có hoặc không cần đuôi .txt) từ thư mục maps/."""
    filename = name if name.endswith(".txt") else f"{name}.txt"
    path = os.path.join(MAPS_DIR, filename)
    with open(path, "r", encoding="utf-8") as f:
        return parse_layout(f.read())


def list_maps() -> List[str]:
    """Liệt kê các bản đồ dùng trong demo UI."""
    if not os.path.isdir(MAPS_DIR):
        return []
    return [name for name in ("tiny", "small") if os.path.isfile(os.path.join(MAPS_DIR, f"{name}.txt"))]
