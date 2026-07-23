"""Tìm kiếm CÓ THÔNG TIN (informed): Greedy Best-First Search và A*.

Cả hai dùng hàng đợi ưu tiên theo f(n):
    - Greedy : f(n) = h(n)            -> tham lam theo ước lượng, nhanh, không tối ưu.
    - A*     : f(n) = g(n) + h(n)     -> tối ưu nếu h admissible.
"""
from __future__ import annotations

import heapq

from ..game.problem import SearchProblem
from ..metrics.counters import SearchMetrics
from .base import Node, TreeRecorder, failure_result, success_result, SearchResult
from .heuristics import Heuristic, null_heuristic


def greedy(problem: SearchProblem, heuristic: Heuristic = null_heuristic, record_tree: bool = False) -> SearchResult:
    """Greedy Best-First: ưu tiên node có h(n) nhỏ nhất."""
    metrics = SearchMetrics().start()
    visited_order = []
    tree = TreeRecorder(record_tree)

    start = problem.initial_state()
    counter = 0
    h0 = heuristic(start, problem)
    start_node = Node(
    state=start,
    cost=0.0,
    depth=0,
    nid=0,
)
    tree.created(start_node, h0, f_val=h0)
    frontier = [(h0, counter, start_node)]
    frontier_states = {start}
    explored = set()

    while frontier:
        metrics.observe_frontier(len(frontier))
        _, _, node = heapq.heappop(frontier)
        # Greedy
        frontier_states.discard(node.state)
        if node.state in explored:
            continue
        explored.add(node.state)

        metrics.expand()
        metrics.observe_depth(node.depth)
        visited_order.append(node.state.pacman)
        
        h = heuristic(node.state, problem)
        tree.expanded(node, h, f_val=h)

        if problem.is_goal(node.state):
            return success_result(node, metrics, visited_order, tree)

        for action in problem.actions(node.state):
            nxt = problem.result(node.state, action)

            if nxt in explored or nxt in frontier_states:
                continue

            counter += 1
            child = Node(
                state=nxt,
                parent=node,
                action=action,
                cost=node.cost + problem.step_cost(node.state, action, nxt),
                depth=node.depth + 1,
                nid=counter,
            )
            h = heuristic(nxt, problem)
            tree.created(child, h, f_val=h)
            heapq.heappush(frontier, (h, counter, child))
            frontier_states.add(nxt)
            metrics.generate()

    return failure_result(metrics, visited_order, tree)


def astar(problem: SearchProblem, heuristic: Heuristic = null_heuristic, record_tree: bool = False) -> SearchResult:
    """A* Search: ưu tiên f(n) = g(n) + h(n)."""
    metrics = SearchMetrics().start()
    visited_order = []
    tree = TreeRecorder(record_tree)

    start = problem.initial_state()
    counter = 0
    g0 = 0.0
    h0 = heuristic(start, problem)
    start_node = Node(
        state=start,
        cost=0.0,
        depth=0,
        nid=0,
    )
    tree.created(start_node, h0, f_val=g0 + h0)
    frontier = [(g0 + h0, counter, start_node)]
    best_g = {start: 0.0}
    
    while frontier:
        metrics.observe_frontier(len(frontier))
        _, _, node = heapq.heappop(frontier)

        if node.cost > best_g.get(node.state, float("inf")):
            continue

        metrics.expand()
        metrics.observe_depth(node.depth)
        visited_order.append(node.state.pacman)
        h = heuristic(node.state, problem)
        tree.expanded(node, h, f_val=node.cost + h)

        if problem.is_goal(node.state):
            return success_result(node, metrics, visited_order, tree)

        for action in problem.actions(node.state):
            nxt = problem.result(node.state, action)
            new_g = node.cost + problem.step_cost(node.state, action, nxt)

            if new_g < best_g.get(nxt, float("inf")):
                best_g[nxt] = new_g
                counter += 1
                child = Node(
                    state=nxt,
                    parent=node,
                    action=action,
                    cost=node.cost + problem.step_cost(node.state, action, nxt),
                    depth=node.depth + 1,
                    nid=counter,
                )
                h = heuristic(nxt, problem)
                h = heuristic(nxt, problem)
                tree.created(child, h, f_val=new_g + h)
                heapq.heappush(frontier, (new_g + h, counter, child))
                metrics.generate()

    return failure_result(metrics, visited_order, tree)
