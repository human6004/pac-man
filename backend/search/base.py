"""Cấu trúc chung cho kết quả tìm kiếm và tiện ích dựng đường đi.

Mọi thuật toán tìm kiếm tĩnh trả về một SearchResult thống nhất để API và
phần thực nghiệm dùng chung.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import List, Optional

from ..game.state import Direction, Position
from ..metrics.counters import SearchMetrics


@dataclass
class SearchResult:
    """Kết quả của một lần chạy thuật toán tìm kiếm tĩnh."""

    found: bool
    actions: List[Direction] = field(default_factory=list)      # chuỗi hành động từ initial -> goal
    path: List[Position] = field(default_factory=list)           # các ô Pac-man đi qua
    visited_order: List[Position] = field(default_factory=list)  # thứ tự ô được EXPAND (để minh họa)
    metrics: Optional[SearchMetrics] = None

    def to_dict(self) -> dict:
        return {
            "found": self.found,
            "actions": [a.value for a in self.actions],
            "path": [list(p) for p in self.path],
            "visited_order": [list(p) for p in self.visited_order],
            "stats": self.metrics.to_dict() if self.metrics else None,
        }


@dataclass
class Node:
    """Node trên cây tìm kiếm: lưu state, cha, action dẫn tới nó, và g(n)."""

    state: object
    parent: Optional["Node"] = None
    action: Optional[Direction] = None
    cost: float = 0.0  # g(n): chi phí tích lũy từ gốc

    def reconstruct(self):
        """Lần ngược về gốc -> trả (actions, path các vị trí Pac-man)."""
        actions: List[Direction] = []
        positions: List[Position] = []
        node = self
        while node is not None:
            positions.append(node.state.pacman)
            if node.action is not None:
                actions.append(node.action)
            node = node.parent
        actions.reverse()
        positions.reverse()
        return actions, positions
