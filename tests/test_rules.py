"""Kiểm thử luật chơi: legal actions, transition (move_pacman), terminal test.

Chạy: py -3.12 -m pytest tests/test_rules.py -v
"""
from backend.game.layout import parse_layout
from backend.game.rules import (
    FOOD_REWARD,
    PELLET_REWARD,
    SCARED_DURATION,
    is_goal_static,
    move_pacman,
    pacman_legal_actions,
)
from backend.game.state import Direction, Status

# Bản đồ nhỏ tính tay được:
#   cột:  0123
#   row0: %%%%
#   row1: %P.%      P=(1,1), food=(1,2)
#   row2: %o.%      pellet=(2,1), food=(2,2)
#   row3: %%%%
TINY = """
%%%%
%P.%
%o.%
%%%%
"""


def _start():
    return parse_layout(TINY)


def test_parse_layout_basic():
    s = _start()
    assert s.pacman == (1, 1)
    assert s.food == frozenset({(1, 2), (2, 2)})
    assert s.power_pellets == frozenset({(2, 1)})
    assert (0, 0) in s.walls
    assert s.width == 4 and s.height == 4


def test_legal_actions_blocked_by_walls():
    s = _start()
    # Từ (1,1): phải (1,2) trống, xuống (2,1) là pellet (đi được), lên/trái là tường.
    actions = set(pacman_legal_actions(s))
    assert Direction.RIGHT in actions
    assert Direction.DOWN in actions
    assert Direction.UP not in actions
    assert Direction.LEFT not in actions


def test_move_eats_food_and_scores():
    s = _start()
    s2 = move_pacman(s, Direction.RIGHT)  # tới (1,2) có food
    assert s2.pacman == (1, 2)
    assert (1, 2) not in s2.food
    # +FOOD_REWARD trừ 1 bước (STEP_COST=1).
    assert s2.score == FOOD_REWARD - 1


def test_move_eats_pellet_sets_scared():
    s = _start()
    s2 = move_pacman(s, Direction.DOWN)  # tới (2,1) có pellet
    assert (2, 1) not in s2.power_pellets
    assert s2.scared_timer == SCARED_DURATION
    assert s2.score == PELLET_REWARD - 1


def test_move_into_wall_stays():
    s = _start()
    s2 = move_pacman(s, Direction.UP)  # tường -> đứng yên
    assert s2.pacman == (1, 1)


def test_win_when_all_food_eaten():
    s = _start()
    # Ăn 2 food: (1,1)->(1,2)->(2,2); pellet không tính là food.
    s = move_pacman(s, Direction.RIGHT)  # ăn (1,2)
    s = move_pacman(s, Direction.DOWN)   # tới (2,2) ăn food cuối
    assert is_goal_static(s)
    assert s.status == Status.WIN
