"""Tìm kiếm ĐỐI KHÁNG (adversarial): Minimax, Alpha-Beta, Expectimax.

Mô hình hóa Pac-man là người chơi MAX, các con ma là MIN (Minimax/Alpha-Beta)
hoặc tác nhân NGẪU NHIÊN (Expectimax). Một "lượt" gồm: Pac-man đi (agent 0),
rồi lần lượt từng con ma đi (agent 1..k). Mỗi khi quay lại Pac-man thì depth -1.

Vì game thực không duyệt tới terminal được (cây quá lớn), ta dùng DEPTH-LIMITED
search: cắt ở độ sâu `depth` và dùng evaluation function (xem evaluation.py).

Các hàm trả về `(action_tốt_nhất, giá_trị, metrics)` cho Pac-man từ `state`.
"""
from __future__ import annotations

from typing import Optional, Tuple

from ..game.rules import (
    ghost_legal_actions,
    is_terminal,
    pacman_legal_actions,
    result_ghost,
    result_pacman,
)
from ..game.state import Direction, GameState
from ..metrics.counters import SearchMetrics
from .evaluation import evaluate


def _is_pacman(agent: int) -> bool:
    return agent == 0


def _next_agent(agent: int, num_agents: int) -> Tuple[int, int]:
    """Trả (agent kế tiếp, có giảm depth không). Depth giảm khi vòng về Pac-man."""
    nxt = (agent + 1) % num_agents
    return nxt, 1 if nxt == 0 else 0


def minimax(state: GameState, depth: int) -> Tuple[Optional[Direction], float, SearchMetrics]:
    """Minimax thuần (không cắt tỉa), giới hạn độ sâu `depth`."""
    metrics = SearchMetrics().start()
    num_agents = 1 + len(state.ghosts)

    def value(s: GameState, agent: int, d: int) -> float:
        metrics.expand()
        if is_terminal(s) or d == 0:
            return evaluate(s)
        nxt_agent, dec = _next_agent(agent, num_agents)
        if _is_pacman(agent):
            best = float("-inf")
            for a in pacman_legal_actions(s):
                child = result_pacman(s, a)
                metrics.generate()
                best = max(best, value(child, nxt_agent, d - dec))
            return best if best != float("-inf") else evaluate(s)
        else:
            idx = agent - 1
            worst = float("inf")
            for a in ghost_legal_actions(s, s.ghosts[idx]):
                child = result_ghost(s, idx, a)
                metrics.generate()
                worst = min(worst, value(child, nxt_agent, d - dec))
            return worst if worst != float("inf") else evaluate(s)

    best_action, best_val = _root_choice(state, num_agents, depth, value)
    metrics.found = best_action is not None
    metrics.stop()
    return best_action, best_val, metrics


def alphabeta(state: GameState, depth: int) -> Tuple[Optional[Direction], float, SearchMetrics]:
    """Minimax + cắt tỉa Alpha-Beta. Cùng kết quả với minimax nhưng ít node hơn."""
    metrics = SearchMetrics().start()
    num_agents = 1 + len(state.ghosts)

    def value(s: GameState, agent: int, d: int, alpha: float, beta: float) -> float:
        metrics.expand()
        if is_terminal(s) or d == 0:
            return evaluate(s)
        nxt_agent, dec = _next_agent(agent, num_agents)
        if _is_pacman(agent):
            v = float("-inf")
            for a in pacman_legal_actions(s):
                child = result_pacman(s, a)
                metrics.generate()
                v = max(v, value(child, nxt_agent, d - dec, alpha, beta))
                if v > beta:
                    return v  # cắt nhánh beta
                alpha = max(alpha, v)
            return v if v != float("-inf") else evaluate(s)
        else:
            idx = agent - 1
            v = float("inf")
            for a in ghost_legal_actions(s, s.ghosts[idx]):
                child = result_ghost(s, idx, a)
                metrics.generate()
                v = min(v, value(child, nxt_agent, d - dec, alpha, beta))
                if v < alpha:
                    return v  # cắt nhánh alpha
                beta = min(beta, v)
            return v if v != float("inf") else evaluate(s)

    # Root: chọn action của Pac-man tối đa hóa giá trị, có truyền alpha-beta.
    best_action: Optional[Direction] = None
    best_val = float("-inf")
    alpha, beta = float("-inf"), float("inf")
    nxt_agent, dec = _next_agent(0, num_agents)
    for a in pacman_legal_actions(state):
        child = result_pacman(state, a)
        metrics.generate()
        v = value(child, nxt_agent, depth - dec, alpha, beta)
        if v > best_val:
            best_val, best_action = v, a
        alpha = max(alpha, best_val)

    metrics.found = best_action is not None
    metrics.stop()
    return best_action, best_val, metrics


def expectimax(state: GameState, depth: int) -> Tuple[Optional[Direction], float, SearchMetrics]:
    """Expectimax: ma đi NGẪU NHIÊN -> nút ma là kỳ vọng (trung bình các con)."""
    metrics = SearchMetrics().start()
    num_agents = 1 + len(state.ghosts)

    def value(s: GameState, agent: int, d: int) -> float:
        metrics.expand()
        if is_terminal(s) or d == 0:
            return evaluate(s)
        nxt_agent, dec = _next_agent(agent, num_agents)
        if _is_pacman(agent):
            best = float("-inf")
            for a in pacman_legal_actions(s):
                child = result_pacman(s, a)
                metrics.generate()
                best = max(best, value(child, nxt_agent, d - dec))
            return best if best != float("-inf") else evaluate(s)
        else:
            idx = agent - 1
            actions = ghost_legal_actions(s, s.ghosts[idx])
            if not actions:
                return evaluate(s)
            total = 0.0
            for a in actions:
                child = result_ghost(s, idx, a)
                metrics.generate()
                total += value(child, nxt_agent, d - dec)
            return total / len(actions)  # kỳ vọng với phân phối đều

    best_action, best_val = _root_choice(state, num_agents, depth, value)
    metrics.found = best_action is not None
    metrics.stop()
    return best_action, best_val, metrics


def _root_choice(state, num_agents, depth, value_fn):
    """Chọn action Pac-man tốt nhất ở gốc (dùng chung cho minimax & expectimax)."""
    best_action: Optional[Direction] = None
    best_val = float("-inf")
    nxt_agent, dec = _next_agent(0, num_agents)
    for a in pacman_legal_actions(state):
        child = result_pacman(state, a)
        v = value_fn(child, nxt_agent, depth - dec)
        if v > best_val:
            best_val, best_action = v, a
    return best_action, best_val
