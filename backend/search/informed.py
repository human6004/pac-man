"""Tìm kiếm CÓ THÔNG TIN (informed): Greedy Best-First Search và A*.

Cả hai dùng hàng đợi ưu tiên theo f(n):
    - Greedy : f(n) = h(n)            -> tham lam theo ước lượng, nhanh, không tối ưu.
    - A*     : f(n) = g(n) + h(n)     -> tối ưu nếu h admissible.
"""
from __future__ import annotations

import heapq

from ..game.problem import SearchProblem
from ..metrics.counters import SearchMetrics
from .base import Node, SearchResult, TreeRecorder
from .heuristics import Heuristic, null_heuristic


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


def greedy(problem: SearchProblem, heuristic: Heuristic = null_heuristic, record_tree: bool = False) -> SearchResult:
    """Greedy Best-First: ưu tiên node có h(n) nhỏ nhất."""
    metrics = SearchMetrics().start()
    visited_order = []
    tree = TreeRecorder(record_tree)

    start = problem.initial_state()
    counter = 0
    h0 = heuristic(start, problem)
    start_node = Node(start)
    tree.created(start_node, h0)
    frontier = [(h0, counter, start_node)]
    frontier_keys = {problem.state_key(start)}
    explored = set()

    while frontier:
        metrics.observe_frontier(len(frontier))
        _, _, node = heapq.heappop(frontier)
        key = problem.state_key(node.state)
        frontier_keys.discard(key)
        if key in explored:
            continue
        explored.add(key)
        metrics.expand()
        metrics.observe_depth(node.cost)
        visited_order.append(node.state.pacman)
        tree.expanded(node, heuristic(node.state, problem))

        if problem.is_goal(node.state):
            return _success(node, metrics, visited_order, tree)

        for action in problem.actions(node.state):
            nxt = problem.result(node.state, action)
            k = problem.state_key(nxt)
            if k in explored or k in frontier_keys:
                continue
            counter += 1
            child = Node(nxt, node, action, node.cost + problem.step_cost(node.state, action, nxt), counter)
            h = heuristic(nxt, problem)
            tree.created(child, h)
            heapq.heappush(frontier, (h, counter, child))
            frontier_keys.add(k)
            metrics.generate()

    return _failure(metrics, visited_order, tree)


def astar(problem: SearchProblem, heuristic: Heuristic = null_heuristic, record_tree: bool = False) -> SearchResult:
    """A* Search: ưu tiên f(n) = g(n) + h(n)."""
    metrics = SearchMetrics().start()
    visited_order = []
    tree = TreeRecorder(record_tree)

    start = problem.initial_state()
    counter = 0
    g0 = 0.0
    h0 = heuristic(start, problem)
    start_node = Node(start)
    tree.created(start_node, h0)
    frontier = [(g0 + h0, counter, start_node)]
    best_g = {problem.state_key(start): 0.0}

    while frontier:
        metrics.observe_frontier(len(frontier))
        f, _, node = heapq.heappop(frontier)
        key = problem.state_key(node.state)
        if node.cost > best_g.get(key, float("inf")):
            continue  # đã có đường tốt hơn tới state này

        metrics.expand()
        metrics.observe_depth(node.cost)
        visited_order.append(node.state.pacman)
        tree.expanded(node, heuristic(node.state, problem))

        if problem.is_goal(node.state):
            return _success(node, metrics, visited_order, tree)

        for action in problem.actions(node.state):
            nxt = problem.result(node.state, action)
            new_g = node.cost + problem.step_cost(node.state, action, nxt)
            k = problem.state_key(nxt)
            if new_g < best_g.get(k, float("inf")):
                best_g[k] = new_g
                counter += 1
                child = Node(nxt, node, action, new_g, counter)
                h = heuristic(nxt, problem)
                tree.created(child, h)
                heapq.heappush(frontier, (new_g + h, counter, child))
                metrics.generate()

    return _failure(metrics, visited_order, tree)
