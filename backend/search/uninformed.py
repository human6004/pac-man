"""Tìm kiếm MÙ (uninformed): BFS, DFS, UCS, IDS.

Tất cả nhận một SearchProblem (xem game/problem.py) và trả về SearchResult.
Dùng chung `state_key` của problem để tránh thăm lại trạng thái.
"""
from __future__ import annotations

import heapq
from collections import deque
from typing import Optional

from ..game.problem import SearchProblem
from ..game.rules import is_goal_static  # noqa: F401 (tiện tham chiếu)
from ..metrics.counters import SearchMetrics
from .base import Node, SearchResult


def _success(node: Node, metrics: SearchMetrics, visited_order) -> SearchResult:
    actions, path = node.reconstruct()
    metrics.path_length = len(actions)
    metrics.cost = node.cost
    metrics.found = True
    metrics.stop()
    return SearchResult(True, actions, path, visited_order, metrics)


def _failure(metrics: SearchMetrics, visited_order) -> SearchResult:
    metrics.found = False
    metrics.stop()
    return SearchResult(False, [], [], visited_order, metrics)


def bfs(problem: SearchProblem) -> SearchResult:
    """Breadth-First Search: tối ưu khi mọi bước cùng chi phí."""
    metrics = SearchMetrics().start()
    visited_order = []

    start = problem.initial_state()
    if problem.is_goal(start):
        return _success(Node(start), metrics, visited_order)

    frontier = deque([Node(start)])
    explored = {problem.state_key(start)}

    while frontier:
        metrics.observe_frontier(len(frontier))
        node = frontier.popleft()
        metrics.expand()
        visited_order.append(node.state.pacman)

        for action in problem.actions(node.state):
            nxt = problem.result(node.state, action)
            key = problem.state_key(nxt)
            if key in explored:
                continue
            child = Node(nxt, node, action, node.cost + problem.step_cost(node.state, action, nxt))
            if problem.is_goal(nxt):
                return _success(child, metrics, visited_order)
            explored.add(key)
            frontier.append(child)
            metrics.generate()

    return _failure(metrics, visited_order)


def dfs(problem: SearchProblem, depth_limit: Optional[int] = None) -> SearchResult:
    """Depth-First Search (dùng stack). Không tối ưu; có thể giới hạn độ sâu."""
    metrics = SearchMetrics().start()
    visited_order = []

    start = problem.initial_state()
    frontier = [Node(start)]
    explored = set()

    while frontier:
        metrics.observe_frontier(len(frontier))
        node = frontier.pop()
        key = problem.state_key(node.state)
        if key in explored:
            continue
        explored.add(key)
        metrics.expand()
        visited_order.append(node.state.pacman)

        if problem.is_goal(node.state):
            return _success(node, metrics, visited_order)

        if depth_limit is not None and node.cost >= depth_limit:
            continue

        for action in problem.actions(node.state):
            nxt = problem.result(node.state, action)
            if problem.state_key(nxt) in explored:
                continue
            child = Node(nxt, node, action, node.cost + problem.step_cost(node.state, action, nxt))
            frontier.append(child)
            metrics.generate()

    return _failure(metrics, visited_order)


def ucs(problem: SearchProblem) -> SearchResult:
    """Uniform-Cost Search: tối ưu theo tổng chi phí g(n)."""
    metrics = SearchMetrics().start()
    visited_order = []

    start = problem.initial_state()
    counter = 0
    frontier = [(0.0, counter, Node(start))]
    best_g = {problem.state_key(start): 0.0}

    while frontier:
        metrics.observe_frontier(len(frontier))
        g, _, node = heapq.heappop(frontier)
        key = problem.state_key(node.state)
        if g > best_g.get(key, float("inf")):
            continue  # bản cũ tốt hơn đã được xử lý

        metrics.expand()
        visited_order.append(node.state.pacman)

        if problem.is_goal(node.state):
            return _success(node, metrics, visited_order)

        for action in problem.actions(node.state):
            nxt = problem.result(node.state, action)
            new_g = g + problem.step_cost(node.state, action, nxt)
            k = problem.state_key(nxt)
            if new_g < best_g.get(k, float("inf")):
                best_g[k] = new_g
                counter += 1
                child = Node(nxt, node, action, new_g)
                heapq.heappush(frontier, (new_g, counter, child))
                metrics.generate()

    return _failure(metrics, visited_order)


def ids(problem: SearchProblem, max_depth: int = 100) -> SearchResult:
    """Iterative Deepening Search: lặp DFS giới hạn độ sâu tăng dần.

    Gộp metric của tất cả các vòng lặp để phản ánh tổng công sức tìm kiếm.
    """
    metrics = SearchMetrics().start()
    visited_order = []

    def dls(node: Node, limit: int, explored: set) -> Optional[Node]:
        key = problem.state_key(node.state)
        metrics.expand()
        visited_order.append(node.state.pacman)
        if problem.is_goal(node.state):
            return node
        if limit <= 0:
            return None
        explored.add(key)
        for action in problem.actions(node.state):
            nxt = problem.result(node.state, action)
            if problem.state_key(nxt) in explored:
                continue
            child = Node(nxt, node, action, node.cost + problem.step_cost(node.state, action, nxt))
            found = dls(child, limit - 1, explored)
            if found is not None:
                return found
            metrics.generate()
        explored.discard(key)
        return None

    start = problem.initial_state()
    for depth in range(max_depth + 1):
        result = dls(Node(start), depth, set())
        if result is not None:
            return _success(result, metrics, visited_order)

    return _failure(metrics, visited_order)
