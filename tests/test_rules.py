import pytest

from backend.game.layout import parse_layout
from backend.game.operators import move_pacman, pacman_legal_actions
from backend.game.problem import EatAllFoodProblem, PathToPointProblem
from backend.game.state import Direction, EatAllFoodState, PathState


TINY = """
%%%%%
%P..%
%.%.%
%...%
%%%%%
"""


def _game_map():
    return parse_layout(TINY)


def test_legal_actions_use_maze_not_search_state():
    game_map = _game_map()
    actions = set(pacman_legal_actions(game_map.maze, game_map.pacman_start))

    assert actions == {Direction.DOWN, Direction.RIGHT}


def test_move_pacman_returns_position_for_valid_action():
    game_map = _game_map()

    assert move_pacman(game_map.maze, game_map.pacman_start, Direction.RIGHT) == (1, 2)


def test_move_pacman_rejects_wall_action():
    game_map = _game_map()

    with pytest.raises(ValueError, match="không hợp lệ"):
        move_pacman(game_map.maze, game_map.pacman_start, Direction.UP)


def test_path_problem_result_changes_only_pacman_position():
    game_map = _game_map()
    problem = PathToPointProblem(game_map.maze, game_map.pacman_start, (1, 2))

    assert problem.result(problem.initial_state(), Direction.RIGHT) == PathState((1, 2))


def test_eat_all_result_removes_food_at_destination():
    game_map = _game_map()
    problem = EatAllFoodProblem(game_map.maze, game_map.pacman_start, game_map.initial_food)

    state = problem.result(problem.initial_state(), Direction.RIGHT)

    assert state == EatAllFoodState((1, 2), game_map.initial_food - {(1, 2)})
