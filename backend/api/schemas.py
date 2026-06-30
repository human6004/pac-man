"""Pydantic schemas cho request/response của API."""
from __future__ import annotations

from typing import List, Optional

from pydantic import BaseModel, Field


class SolveRequest(BaseModel):
    map: str = Field("small", description="Tên bản đồ trong thư mục maps/")
    algorithm: str = Field("bfs", description="bfs|dfs|ucs|ids|greedy|astar")
    heuristic: str = Field("manhattan", description="Tên heuristic (chỉ dùng cho greedy/astar)")
    problem: str = Field("eat_all", description="eat_all | path_to_nearest")


class CompareRequest(BaseModel):
    map: str = "small"
    algorithms: List[str] = Field(default_factory=lambda: ["bfs", "ucs", "astar"])
    heuristic: str = "manhattan"
    problem: str = "eat_all"


class StepRequest(BaseModel):
    """Một bước của chế độ đối kháng. Gửi state hiện tại (dạng tối giản) hoặc
    để trống để bắt đầu từ bản đồ; backend trả action Pac-man kế tiếp + state mới."""

    map: str = "small"
    algorithm: str = Field("alphabeta", description="minimax|alphabeta|expectimax")
    depth: int = Field(3, ge=1, le=6)
    # state nối tiếp được mã hóa bởi backend ở response trước (token mờ).
    state_token: Optional[str] = None


class StatsResponse(BaseModel):
    nodes_expanded: int
    nodes_generated: int
    max_frontier: int
    time_ms: float
    path_length: int
    cost: float
    found: bool
