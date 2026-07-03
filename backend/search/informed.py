"""Tìm kiếm CÓ THÔNG TIN (informed): Greedy Best-First Search và A*.

Cả hai dùng hàng đợi ưu tiên theo f(n):
    - Greedy : f(n) = h(n)            -> tham lam theo ước lượng, nhanh, không tối ưu.
    - A*     : f(n) = g(n) + h(n)     -> tối ưu nếu h admissible.
"""
from __future__ import annotations

import heapq

from ..game.problem import SearchProblem
from ..metrics.counters import SearchMetrics
from .base import Node, SearchResult, record_node
from .heuristics import Heuristic, null_heuristic


def _success(node: Node, metrics: SearchMetrics, visited_order, tree) -> SearchResult:
    actions, path = node.reconstruct()
    metrics.path_length = len(actions)
    metrics.cost = node.cost
    metrics.found = True
    metrics.stop()
    return SearchResult(True, actions, path, visited_order, tree, metrics)


def _failure(metrics: SearchMetrics, visited_order, tree) -> SearchResult:
    metrics.found = False
    metrics.stop()
    return SearchResult(False, [], [], visited_order, tree, metrics)


def greedy(problem: SearchProblem, heuristic: Heuristic = null_heuristic, record_tree: bool = False) -> SearchResult:
    """Greedy Best-First: ưu tiên node có h(n) nhỏ nhất."""
    metrics = SearchMetrics().start()
    visited_order = []
    tree: list = []

    start = problem.initial_state()
    counter = 0
    h0 = heuristic(start, problem)
    frontier = [(h0, counter, Node(start))]
    explored = set()

    while frontier:
        metrics.observe_frontier(len(frontier))
        _, _, node = heapq.heappop(frontier)
        key = problem.state_key(node.state)
        if key in explored:
            continue
        explored.add(key)
        metrics.expand()
        metrics.observe_depth(node.cost)
        visited_order.append(node.state.pacman)
        if record_tree:
            record_node(tree, node, heuristic(node.state, problem))

        if problem.is_goal(node.state):
            return _success(node, metrics, visited_order, tree)

        for action in problem.actions(node.state):
            nxt = problem.result(node.state, action)
            if problem.state_key(nxt) in explored:
                continue
            counter += 1
            child = Node(nxt, node, action, node.cost + problem.step_cost(node.state, action, nxt), counter)
            heapq.heappush(frontier, (heuristic(nxt, problem), counter, child))
            metrics.generate()

    return _failure(metrics, visited_order, tree)


def astar(problem: SearchProblem, heuristic: Heuristic = null_heuristic, record_tree: bool = False) -> SearchResult:
    """A* Search: ưu tiên f(n) = g(n) + h(n)."""
    metrics = SearchMetrics().start()
    visited_order = []
    tree: list = []

    start = problem.initial_state()
    counter = 0
    g0 = 0.0
    frontier = [(g0 + heuristic(start, problem), counter, Node(start))]
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
        if record_tree:
            record_node(tree, node, heuristic(node.state, problem))

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
                heapq.heappush(frontier, (new_g + heuristic(nxt, problem), counter, child))
                metrics.generate()

    return _failure(metrics, visited_order, tree)
