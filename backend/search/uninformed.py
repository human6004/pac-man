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
from .base import Node, SearchResult, TreeRecorder


def _success(node: Node, metrics: SearchMetrics, visited_order, tree: TreeRecorder) -> SearchResult:
    actions, path = node.reconstruct()
    metrics.path_length = len(actions)
    metrics.cost = node.cost
    metrics.found = True
    metrics.stop()
    return SearchResult(True, actions, path, visited_order, tree.nodes, metrics, tree.truncated, tree.limit)


def _failure(metrics: SearchMetrics, visited_order, tree: TreeRecorder) -> SearchResult:
    metrics.found = False
    metrics.stop()
    return SearchResult(False, [], [], visited_order, tree.nodes, metrics, tree.truncated, tree.limit)


def bfs(problem: SearchProblem, record_tree: bool = False) -> SearchResult:
    """Breadth-First Search: tối ưu khi mọi bước cùng chi phí."""
    metrics = SearchMetrics().start()
    visited_order = []
    tree = TreeRecorder(record_tree)
    nid = 0

    start = problem.initial_state()
    start_node = Node(start)
    tree.created(start_node, 0.0)
    if problem.is_goal(start):
        tree.expanded(start_node, 0.0)
        return _success(start_node, metrics, visited_order, tree)

    frontier = deque([start_node])
    explored = {problem.state_key(start)}

    while frontier:
        metrics.observe_frontier(len(frontier))
        node = frontier.popleft()
        metrics.expand()
        metrics.observe_depth(node.cost)
        visited_order.append(node.state.pacman)
        tree.expanded(node, 0.0)

        for action in problem.actions(node.state):
            nxt = problem.result(node.state, action)
            key = problem.state_key(nxt)
            if key in explored:
                continue
            nid += 1
            child = Node(nxt, node, action, node.cost + problem.step_cost(node.state, action, nxt), nid)
            tree.created(child, 0.0)
            metrics.generate()
            if problem.is_goal(nxt):
                tree.expanded(child, 0.0)
                return _success(child, metrics, visited_order, tree)
            explored.add(key)
            frontier.append(child)

    return _failure(metrics, visited_order, tree)


def dfs(problem: SearchProblem, depth_limit: Optional[int] = None, record_tree: bool = False) -> SearchResult:
    """Depth-First Search (dùng stack). Không tối ưu; có thể giới hạn độ sâu."""
    metrics = SearchMetrics().start()
    visited_order = []
    tree = TreeRecorder(record_tree)
    nid = 0

    start = problem.initial_state()
    start_node = Node(start)
    tree.created(start_node, 0.0)
    frontier = [start_node]
    frontier_keys = {problem.state_key(start)}
    explored = set()

    while frontier:
        metrics.observe_frontier(len(frontier))
        node = frontier.pop()
        key = problem.state_key(node.state)
        frontier_keys.discard(key)
        if key in explored:
            continue
        explored.add(key)
        metrics.expand()
        metrics.observe_depth(node.cost)
        visited_order.append(node.state.pacman)
        tree.expanded(node, 0.0)

        if problem.is_goal(node.state):
            return _success(node, metrics, visited_order, tree)

        if depth_limit is not None and node.cost >= depth_limit:
            continue

        for action in problem.actions(node.state):
            nxt = problem.result(node.state, action)
            k = problem.state_key(nxt)
            if k in explored or k in frontier_keys:
                continue
            nid += 1
            child = Node(nxt, node, action, node.cost + problem.step_cost(node.state, action, nxt), nid)
            tree.created(child, 0.0)
            frontier.append(child)
            frontier_keys.add(k)
            metrics.generate()

    return _failure(metrics, visited_order, tree)


def ucs(problem: SearchProblem, record_tree: bool = False) -> SearchResult:
    """Uniform-Cost Search: tối ưu theo tổng chi phí g(n)."""
    metrics = SearchMetrics().start()
    visited_order = []
    tree = TreeRecorder(record_tree)

    start = problem.initial_state()
    counter = 0
    start_node = Node(start)
    tree.created(start_node, 0.0)
    frontier = [(0.0, counter, start_node)]
    best_g = {problem.state_key(start): 0.0}

    while frontier:
        metrics.observe_frontier(len(frontier))
        g, _, node = heapq.heappop(frontier)
        key = problem.state_key(node.state)
        if g > best_g.get(key, float("inf")):
            continue  # bản cũ tốt hơn đã được xử lý

        metrics.expand()
        metrics.observe_depth(node.cost)
        visited_order.append(node.state.pacman)
        tree.expanded(node, 0.0)

        if problem.is_goal(node.state):
            return _success(node, metrics, visited_order, tree)

        for action in problem.actions(node.state):
            nxt = problem.result(node.state, action)
            new_g = g + problem.step_cost(node.state, action, nxt)
            k = problem.state_key(nxt)
            if new_g < best_g.get(k, float("inf")):
                best_g[k] = new_g
                counter += 1
                child = Node(nxt, node, action, new_g, counter)
                tree.created(child, 0.0)
                heapq.heappush(frontier, (new_g, counter, child))
                metrics.generate()

    return _failure(metrics, visited_order, tree)


def ids(problem: SearchProblem, max_depth: int = 100, record_tree: bool = False) -> SearchResult:
    """Iterative Deepening Search: lặp DFS giới hạn độ sâu tăng dần.

    Gộp metric của tất cả các vòng lặp để phản ánh tổng công sức tìm kiếm.
    """
    metrics = SearchMetrics().start()
    def dls(node: Node, limit: int, explored: set, visited_order: list, tree: TreeRecorder, counter: list) -> Optional[Node]:
        key = problem.state_key(node.state)
        metrics.expand()
        metrics.observe_depth(node.cost)
        visited_order.append(node.state.pacman)
        tree.expanded(node, 0.0)
        if problem.is_goal(node.state):
            return node
        if limit <= 0:
            return None
        explored.add(key)
        for action in problem.actions(node.state):
            nxt = problem.result(node.state, action)
            if problem.state_key(nxt) in explored:
                continue
            counter[0] += 1
            child = Node(nxt, node, action, node.cost + problem.step_cost(node.state, action, nxt), counter[0])
            tree.created(child, 0.0)
            metrics.generate()
            found = dls(child, limit - 1, explored, visited_order, tree, counter)
            if found is not None:
                return found
        explored.discard(key)
        return None

    start = problem.initial_state()
    for depth in range(max_depth + 1):
        visited_order = []
        tree = TreeRecorder(record_tree)
        counter = [0]
        start_node = Node(start)
        tree.created(start_node, 0.0)
        result = dls(start_node, depth, set(), visited_order, tree, counter)
        if result is not None:
            return _success(result, metrics, visited_order, tree)

    return _failure(metrics, [], TreeRecorder(record_tree))
