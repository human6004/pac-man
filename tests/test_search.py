from backend.game.layout import parse_layout
from backend.game.problem import EatAllFoodProblem, PathToPointProblem
from backend.search.heuristics import farthest_food_dist, goal_manhattan, null_heuristic
from backend.search.informed import astar, greedy
from backend.search.uninformed import bfs, dfs, ucs


CORRIDOR = """
%%%%%%%
%P....%
%%%%%%%
"""

SMALL = """
%%%%%
%P..%
%.%.%
%...%
%%%%%
"""


def _eat_all_problem(text=SMALL):
    game_map = parse_layout(text)
    return EatAllFoodProblem(game_map.maze, game_map.pacman_start, game_map.initial_food)


def _path_problem(text=CORRIDOR, goal=(1, 5)):
    game_map = parse_layout(text)
    return PathToPointProblem(game_map.maze, game_map.pacman_start, goal)


def test_bfs_finds_shortest_path_corridor():
    result = bfs(_path_problem())

    assert result.found
    assert result.metrics.path_length == 4
    assert result.metrics.cost == 4.0


def test_astar_matches_bfs_optimal_corridor():
    bfs_result = bfs(_path_problem())
    astar_result = astar(_path_problem(), goal_manhattan)

    assert astar_result.found
    assert astar_result.metrics.cost == bfs_result.metrics.cost


def test_bfs_ucs_and_astar_find_same_eat_all_cost():
    results = [
        bfs(_eat_all_problem()),
        ucs(_eat_all_problem()),
        astar(_eat_all_problem(), farthest_food_dist),
    ]

    assert all(result.found for result in results)
    assert len({result.metrics.cost for result in results}) == 1


def test_dfs_finds_solution_without_optimality_requirement():
    result = dfs(_eat_all_problem())

    assert result.found
    assert result.metrics.path_length >= 1


def test_astar_with_null_heuristic_matches_ucs_cost():
    assert astar(_eat_all_problem(), null_heuristic).metrics.cost == ucs(_eat_all_problem()).metrics.cost


def test_greedy_finds_path_to_food():
    game_map = parse_layout(SMALL)
    problem = PathToPointProblem(game_map.maze, game_map.pacman_start, (1, 2))

    assert greedy(problem, goal_manhattan).found


def test_path_and_food_state_have_different_identity_rules():
    game_map = parse_layout(SMALL)
    path_problem = PathToPointProblem(game_map.maze, game_map.pacman_start, (1, 2))
    food_problem = _eat_all_problem()

    assert path_problem.initial_state().pacman == food_problem.initial_state().pacman
    assert path_problem.initial_state() != food_problem.initial_state()


def test_tree_contains_search_state_data_and_node_identity():
    result = astar(_path_problem(), goal_manhattan, record_tree=True)

    assert result.found
    assert result.tree[0]["parent"] is None
    assert len({node["id"] for node in result.tree}) == len(result.tree)
    assert all({"id", "parent", "pos", "g", "h", "f", "depth"} <= set(node) for node in result.tree)


def test_metrics_do_not_claim_memory_estimate():
    result = bfs(_eat_all_problem())

    assert "memory_kb" not in result.metrics.to_dict()
    assert result.metrics.search_depth >= 0
