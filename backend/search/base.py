"""Cấu trúc chung cho kết quả tìm kiếm và tiện ích dựng đường đi.

Mọi thuật toán tìm kiếm tĩnh trả về một SearchResult thống nhất để API và
phần thực nghiệm dùng chung.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import List, Optional

from ..game.state import Direction, EatAllFoodState, PathState, Position
from ..metrics.counters import SearchMetrics

TREE_LIMIT = 250

@dataclass
class SearchResult:
    """Kết quả của một lần chạy thuật toán tìm kiếm tĩnh."""

    found: bool
    actions: List[Direction] = field(default_factory=list)      # chuỗi hành động từ initial -> goal
    path: List[Position] = field(default_factory=list)           # các ô Pac-man đi qua
    visited_order: List[Position] = field(default_factory=list)  # thứ tự ô được EXPAND (để minh họa)
    tree: List[dict] = field(default_factory=list)               # node đã expand: {id,parent,pos,g,h,f}
    metrics: Optional[SearchMetrics] = None
    tree_truncated: bool = False
    tree_limit: int = 0

    def to_dict(self) -> dict:
        return {
            "found": self.found,
            "actions": [a.value for a in self.actions],
            "path": [list(p) for p in self.path],
            "visited_order": [list(p) for p in self.visited_order],
            "tree": self.tree,
            "tree_truncated": self.tree_truncated,
            "tree_limit": self.tree_limit,
            "stats": self.metrics.to_dict() if self.metrics else None,
        }


@dataclass
class Node:
    """Node trên cây tìm kiếm: lưu state, cha, action dẫn tới nó, và g(n)."""

    state: PathState | EatAllFoodState
    parent: "Node | None" = None
    action: Direction | None = None
    cost: float = 0.0  # g(n): chi phí tích lũy từ gốc
    depth: int = 0
    nid: int = 0       # id chạy (để dựng cây tìm kiếm cho FE)

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


class TreeRecorder:
    """Ghi cây tìm kiếm cho UI, có cap để thuật toán vẫn giải tiếp khi cây quá lớn."""

    def __init__(self, enabled: bool, limit: int = TREE_LIMIT):
        self.enabled = enabled
        self.limit = limit if enabled else 0
        self.nodes: List[dict] = []
        self.truncated = False
        self._by_id: dict[int, dict] = {}
        self._expanded = 0

    def created(self, node: "Node", h_val: float) -> None:
        if not self.enabled:
            return
        if node.nid in self._by_id:
            return
        if len(self.nodes) >= self.limit:
            self.truncated = True
            return
        item = {
            "id": node.nid,
            "parent": node.parent.nid if node.parent else None,
            "pos": list(node.state.pacman),
            "action": node.action.value if node.action else None,
            "food_left": len(getattr(node.state, "food", ())),
            "food": [list(p) for p in sorted(getattr(node.state, "food", ()))],
            "g": node.cost,
            "h": h_val,
            "f": node.cost + h_val,
            "depth": node.depth,
            "created_order": len(self.nodes),
            "expanded_order": None,
        }
        self.nodes.append(item)
        self._by_id[node.nid] = item

    def expanded(self, node: "Node", h_val: float) -> None:
        if not self.enabled:
            return
        if node.nid not in self._by_id:
            self.created(node, h_val)
        item = self._by_id.get(node.nid)
        if item and item["expanded_order"] is None:
            item["expanded_order"] = self._expanded
            self._expanded += 1


def success_result(node: Node, metrics: SearchMetrics, visited_order, tree: TreeRecorder) -> SearchResult:
    actions, path = node.reconstruct()
    metrics.path_length = len(actions)
    metrics.cost = node.cost
    metrics.goal_depth = node.depth
    metrics.found = True
    metrics.stop()
    return SearchResult(True, actions, path, visited_order, tree.nodes, metrics, tree.truncated, tree.limit)


def failure_result(metrics: SearchMetrics, visited_order, tree: TreeRecorder) -> SearchResult:
    metrics.found = False
    metrics.stop()
    return SearchResult(False, [], [], visited_order, tree.nodes, metrics, tree.truncated, tree.limit)
