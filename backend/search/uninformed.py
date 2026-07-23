"""Tìm kiếm MÙ (uninformed): BFS, DFS, UCS.

Tất cả nhận một SearchProblem (xem game/problem.py) và trả về SearchResult.
Dùng chung `state_key` của problem để tránh thăm lại trạng thái.
"""
from __future__ import annotations

import heapq
from collections import deque
from typing import Optional

from ..game.problem import SearchProblem
from ..metrics.counters import SearchMetrics
from .base import Node, TreeRecorder, failure_result, success_result


def bfs(problem: SearchProblem, record_tree: bool = False) -> SearchResult:
    """Breadth-First Search: tối ưu khi mọi bước cùng chi phí."""
    metrics = SearchMetrics().start()
    visited_order = []
    tree = TreeRecorder(record_tree)
    nid = 0

    start = problem.initial_state()
    start_node = Node(start)
    tree.created(start_node, 0.0, f_val=None)
    if problem.is_goal(start):
        tree.expanded(start_node, 0.0, f_val=None)
        return success_result(start_node, metrics, visited_order, tree)

    frontier = deque([start_node])
    explored = {start}

    while frontier:
        metrics.observe_frontier(len(frontier))
        node = frontier.popleft()
        metrics.expand()
        metrics.observe_depth(node.depth)
        visited_order.append(node.state.pacman)
        tree.expanded(node, 0.0, f_val=None)

        for action in problem.actions(node.state):
            nxt = problem.result(node.state, action)
            if nxt in explored:
                continue
            nid += 1
            child = Node(
                state=nxt,
                parent=node,
                action=action,
                cost=node.cost + problem.step_cost(node.state, action, nxt),
                depth=node.depth + 1,
                nid=nid,
            )
            tree.created(child, 0.0, f_val=None)
            metrics.generate()
            if problem.is_goal(nxt):
                tree.expanded(child, 0.0, f_val=None)
                return success_result(child, metrics, visited_order, tree)
            explored.add(nxt)
            frontier.append(child)

    return failure_result(metrics, visited_order, tree)

def dfs(problem: SearchProblem, depth_limit: Optional[int] = None, record_tree: bool = False) -> SearchResult:
    """Depth-First Search (dùng stack). Không tối ưu; có thể giới hạn độ sâu."""
    metrics = SearchMetrics().start()
    visited_order = []
    tree = TreeRecorder(record_tree)
    nid = 0

    start = problem.initial_state()
    start_node = Node(start)
    tree.created(start_node, 0.0, f_val=None)
    frontier = [start_node]
    frontier_keys = {start}
    explored = set()

    while frontier:
        metrics.observe_frontier(len(frontier))
        node = frontier.pop()
        if node.state in frontier_keys:
            frontier_keys.discard(node.state)
        if node.state in explored:
            continue
        explored.add(node.state)
        metrics.expand()
        metrics.observe_depth(node.depth)
        visited_order.append(node.state.pacman)
        tree.expanded(node, 0.0, f_val=None)

        if problem.is_goal(node.state):
            return success_result(node, metrics, visited_order, tree)

        if depth_limit is not None and node.depth >= depth_limit:
            continue

        for action in problem.actions(node.state):
            nxt = problem.result(node.state, action)
            if nxt in explored or nxt in frontier_keys:
                continue
            nid += 1
            child = Node(
                state=nxt,
                parent=node,
                action=action,
                cost=node.cost + problem.step_cost(node.state, action, nxt),
                depth=node.depth + 1,
                nid=nid,
            )
            tree.created(child, 0.0, f_val=None)
            frontier.append(child)
            frontier_keys.add(nxt)
            metrics.generate()

    return failure_result(metrics, visited_order, tree)


def ucs(problem: SearchProblem, record_tree: bool = False) -> SearchResult:
    """Uniform-Cost Search: tối ưu theo tổng chi phí g(n)."""
    metrics = SearchMetrics().start()
    visited_order = []
    tree = TreeRecorder(record_tree)

    start = problem.initial_state()
    counter = 0
    start_node = Node(start)
    tree.created(start_node, 0.0, f_val=start_node.cost)
    frontier = [(0.0, counter, start_node)]
    best_g = {start: 0.0}

    while frontier:
        metrics.observe_frontier(len(frontier))
        g, _, node = heapq.heappop(frontier)

        if g > best_g.get(node.state, float("inf")):
            continue
    
        metrics.expand()
        metrics.observe_depth(node.depth)
        visited_order.append(node.state.pacman)
        tree.expanded(node, 0.0, f_val=node.cost)

        if problem.is_goal(node.state):
            return success_result(node, metrics, visited_order, tree)

        for action in problem.actions(node.state):
            nxt = problem.result(node.state, action)
            new_g = g + problem.step_cost(node.state, action, nxt)
            if new_g < best_g.get(nxt, float("inf")):
                best_g[nxt] = new_g
                counter += 1
                child = Node(
                    state=nxt,
                    parent=node,
                    action=action,
                    cost=new_g,
                    depth=node.depth + 1,
                    nid=counter,
                )
                tree.created(child, 0.0, f_val=new_g)
                heapq.heappush(frontier, (new_g, counter, child))
                metrics.generate()

    return failure_result(metrics, visited_order, tree)
