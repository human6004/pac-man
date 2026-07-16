from collections import defaultdict

from backend.game.layout import load_layout
from backend.game.problem import EatAllDotProblem, PathToPointProblem, farthest_food
from backend.search.heuristics import farthest_food_dist, goal_manhattan
from backend.search.informed import astar, greedy
from backend.search.uninformed import bfs, dfs, ucs


def _eat_all_problem(name):
    game_map = load_layout(name)
    return EatAllDotProblem(game_map.maze, game_map.pacman_start, game_map.initial_food)


def _path_problem(name):
    game_map = load_layout(name)
    goal = farthest_food(game_map.initial_food, game_map.pacman_start)
    return PathToPointProblem(game_map.maze, game_map.pacman_start, goal)


def _run(problem, algorithm):
    if algorithm in {"greedy", "astar"}:
        heuristic = farthest_food_dist if isinstance(problem, EatAllDotProblem) else goal_manhattan
        return {"greedy": greedy, "astar": astar}[algorithm](problem, heuristic, record_tree=True)
    return {"bfs": bfs, "dfs": dfs, "ucs": ucs}[algorithm](problem, record_tree=True)


def _expanded_food_states(result):
    return [
        (tuple(node["pos"]), frozenset(map(tuple, node["food"])))
        for node in result.tree
        if node["expanded_order"] is not None
    ]


def test_path_problem_does_not_expand_same_position_twice():
    for algorithm in ("bfs", "dfs", "ucs", "greedy", "astar"):
        result = _run(_path_problem("small"), algorithm)
        positions = [tuple(position) for position in result.visited_order]
        assert len(positions) == len(set(positions)), algorithm


def test_eat_all_does_not_expand_same_complete_state_twice():
    for algorithm in ("bfs", "dfs", "ucs", "greedy", "astar"):
        states = _expanded_food_states(_run(_eat_all_problem("tiny"), algorithm))
        assert len(states) == len(set(states)), algorithm


def test_eat_all_can_expand_same_position_with_different_food_sets():
    result = bfs(_eat_all_problem("tiny"), record_tree=True)
    food_sets_by_position = defaultdict(set)

    for position, food in _expanded_food_states(result):
        food_sets_by_position[position].add(food)

    assert any(len(food_sets) > 1 for food_sets in food_sets_by_position.values())


def test_success_marks_exactly_one_expanded_goal_node():
    for algorithm in ("bfs", "dfs", "ucs", "greedy", "astar"):
        result = _run(_path_problem("small"), algorithm)
        goals = [node for node in result.tree if node.get("goal")]
        assert len(goals) == 1, algorithm
        assert goals[0]["expanded_order"] is not None
