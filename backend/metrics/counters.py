"""Bộ đếm chỉ số cho thuật toán tìm kiếm: số node expand, thời gian, độ dài đường đi."""
from __future__ import annotations

import time
from dataclasses import dataclass, field, asdict
from typing import Dict


# Ước lượng bộ nhớ mỗi node lưu trong frontier/explored (bytes). Dùng để
# quy đổi max_frontier -> memory_kb cho bảng so sánh.
NODE_BYTES = 256


@dataclass
class SearchMetrics:
    nodes_expanded: int = 0
    nodes_generated: int = 0
    max_frontier: int = 0
    time_ms: float = 0.0
    path_length: int = 0
    cost: float = 0.0
    memory_kb: float = 0.0
    search_depth: int = 0
    found: bool = False

    _t0: float = field(default=0.0, repr=False)

    def start(self) -> "SearchMetrics":
        self._t0 = time.perf_counter()
        return self

    def stop(self) -> "SearchMetrics":
        self.time_ms = round((time.perf_counter() - self._t0) * 1000, 3)
        # ponytail: ước lượng cố định từ frontier, đo thật bằng tracemalloc nếu cần chính xác
        self.memory_kb = round(self.max_frontier * NODE_BYTES / 1024, 1)
        return self

    def expand(self) -> None:
        self.nodes_expanded += 1

    def generate(self, n: int = 1) -> None:
        self.nodes_generated += n

    def observe_frontier(self, size: int) -> None:
        if size > self.max_frontier:
            self.max_frontier = size

    def observe_depth(self, depth: float) -> None:
        d = int(depth)
        if d > self.search_depth:
            self.search_depth = d

    def to_dict(self) -> Dict:
        d = asdict(self)
        d.pop("_t0", None)
        return d
