from collections import Counter

from backend.game.layout import load_layout
from backend.game.problem import EatAllFoodProblem, PathToPointProblem, farthest_food
from backend.search.heuristics import get_heuristic
from backend.search.registry import SEARCH_ALGOS, is_informed


def run_static(problem, algo):
    fn = SEARCH_ALGOS[algo]
    if is_informed(algo):
        return fn(problem, get_heuristic("manhattan"), record_tree=True)
    return fn(problem, record_tree=True)


def test_path_to_farthest_does_not_expand_same_cell_twice():
    start = load_layout("small")
    problem = PathToPointProblem(start, farthest_food(start))

    # IDS dùng path-checking + lặp DFS nhiều vòng nên CỐ Ý expand lại 1 ô ở các
    # vòng/nhánh khác nhau — đó là bản chất thuật toán, không phải lỗi. Các thuật
    # toán graph-search còn lại thì mỗi ô chỉ expand đúng 1 lần.
    for algo in SEARCH_ALGOS:
        if algo == "ids":
            continue
        result = run_static(problem, algo)
        expanded = [tuple(pos) for pos in result.visited_order]
        assert len(expanded) == len(set(expanded)), algo


def test_eat_all_tree_exposes_food_left_for_repeated_positions():
    start = load_layout("small")
    result = SEARCH_ALGOS["bfs"](EatAllFoodProblem(start), record_tree=True)

    repeated_positions = [pos for pos, count in Counter(tuple(n["pos"]) for n in result.tree).items() if count > 1]

    assert repeated_positions
    assert all("food_left" in node for node in result.tree)
    assert all(node["food_left"] == len(node["food"]) for node in result.tree)
